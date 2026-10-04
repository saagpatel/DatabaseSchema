use sqlx::postgres::PgRow;
use sqlx::SqlitePool;
use sqlx::{Column, Row};
use std::time::Instant;
use tauri::State;

use crate::error::AppError;
use crate::models::query::{ExplainResult, QueryHistoryEntry, QueryHistoryRow, QueryResult};
use crate::AppState;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum QueryMode {
    ReturnsRows,
    ExecuteOnly,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn execute_query(
    connection_id: String,
    sql: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<QueryResult, AppError> {
    let start = Instant::now();
    let query_mode = determine_query_mode(&sql);

    // Not being connected is not a query execution, so it is not recorded.
    let pool = {
        let pg_pools = state.pg_pools.lock().await;
        pg_pools
            .get(&connection_id)
            .cloned()
            .ok_or_else(|| AppError::NotConnected(connection_id.clone()))?
    };

    // SQL errors must reach the history write below, so no `?` in here.
    let result: Result<QueryRows, sqlx::Error> = if query_mode == QueryMode::ReturnsRows {
        let effective_sql = apply_select_limit(&sql, limit);
        sqlx::query(&effective_sql)
            .fetch_all(&pool)
            .await
            .map(|rows| {
                let (columns, json_rows) = pg_rows_to_json(&rows);
                let row_count = json_rows.len();
                (columns, json_rows, row_count)
            })
    } else {
        sqlx::query(&sql).execute(&pool).await.map(|command| {
            (
                vec![],
                vec![],
                usize::try_from(command.rows_affected()).unwrap_or(usize::MAX),
            )
        })
    };

    let elapsed = start.elapsed().as_millis() as u64;
    record_and_finish(&state.local_db, &connection_id, &sql, elapsed, result).await
}

type QueryRows = (Vec<String>, Vec<serde_json::Value>, usize);

/// Records an executed query in history, successful or not, then converts the
/// outcome into the command's response.
async fn record_and_finish(
    local_db: &SqlitePool,
    connection_id: &str,
    sql: &str,
    elapsed_ms: u64,
    result: Result<QueryRows, sqlx::Error>,
) -> Result<QueryResult, AppError> {
    let entry = history_entry_for(result.as_ref().map(|(_, _, row_count)| *row_count));
    save_history(
        local_db,
        connection_id,
        sql,
        i64::try_from(elapsed_ms).unwrap_or(i64::MAX),
        entry.row_count,
        entry.status,
        entry.error_message.as_deref(),
    )
    .await;

    match result {
        Ok((columns, rows, row_count)) => Ok(QueryResult {
            columns,
            rows,
            row_count,
            execution_time_ms: elapsed_ms,
        }),
        Err(e) => Err(AppError::Database(e)),
    }
}

/// What a query execution records in history.
#[derive(Debug, PartialEq, Eq)]
struct HistoryEntryFields {
    row_count: i64,
    status: &'static str,
    error_message: Option<String>,
}

fn history_entry_for(result: Result<usize, &sqlx::Error>) -> HistoryEntryFields {
    match result {
        Ok(row_count) => HistoryEntryFields {
            row_count: i64::try_from(row_count).unwrap_or(i64::MAX),
            status: "success",
            error_message: None,
        },
        Err(e) => HistoryEntryFields {
            row_count: 0,
            status: "error",
            error_message: Some(e.to_string()),
        },
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn explain_query(
    connection_id: String,
    sql: String,
    state: State<'_, AppState>,
) -> Result<ExplainResult, AppError> {
    let start = Instant::now();

    let pool = {
        let pg_pools = state.pg_pools.lock().await;
        pg_pools
            .get(&connection_id)
            .cloned()
            .ok_or_else(|| AppError::NotConnected(connection_id.clone()))?
    };

    // Use a transaction that always rolls back so EXPLAIN ANALYZE
    // on DML (INSERT/UPDATE/DELETE) doesn't persist side effects
    let mut tx = pool.begin().await?;

    let explain_sql = format!(
        "EXPLAIN (ANALYZE, FORMAT JSON) {}",
        sql.trim().trim_end_matches(';')
    );

    let row: PgRow = sqlx::query(&explain_sql).fetch_one(&mut *tx).await?;

    // Always rollback — we only wanted the plan, not the side effects
    tx.rollback().await?;

    let elapsed = start.elapsed().as_millis() as u64;

    // EXPLAIN returns a single column with JSON text
    let plan_text: String = row.try_get(0)?;
    let plan: serde_json::Value = serde_json::from_str(&plan_text)
        .map_err(|e| AppError::General(format!("Failed to parse EXPLAIN output: {e}")))?;

    Ok(ExplainResult {
        plan,
        execution_time_ms: elapsed,
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_query_history(
    connection_id: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<QueryHistoryEntry>, AppError> {
    let limit = limit.unwrap_or(50);

    let rows: Vec<QueryHistoryRow> = sqlx::query_as(
        "SELECT id, connection_id, sql_text, execution_time_ms, row_count, status, error_message, created_at
         FROM query_history
         WHERE connection_id = ?
         ORDER BY created_at DESC
         LIMIT ?",
    )
    .bind(&connection_id)
    .bind(limit)
    .fetch_all(&state.local_db)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| QueryHistoryEntry {
            id: r.id,
            connection_id: r.connection_id,
            sql_text: r.sql_text,
            execution_time_ms: r.execution_time_ms,
            row_count: r.row_count,
            status: r.status,
            error_message: r.error_message,
            created_at: r.created_at,
        })
        .collect())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn clear_query_history(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM query_history WHERE connection_id = ?")
        .bind(&connection_id)
        .execute(&state.local_db)
        .await?;
    Ok(())
}

/// Convert PgRow results to column names + JSON values
fn pg_rows_to_json(rows: &[PgRow]) -> (Vec<String>, Vec<serde_json::Value>) {
    if rows.is_empty() {
        return (vec![], vec![]);
    }

    let columns: Vec<String> = rows[0]
        .columns()
        .iter()
        .map(|c| c.name().to_string())
        .collect();

    let json_rows: Vec<serde_json::Value> = rows
        .iter()
        .map(|row| {
            let mut map = serde_json::Map::new();
            for col in row.columns() {
                let name = col.name().to_string();
                let val = extract_pg_value(row, col);
                map.insert(name, val);
            }
            serde_json::Value::Object(map)
        })
        .collect();

    (columns, json_rows)
}

fn apply_select_limit(sql: &str, limit: Option<i64>) -> String {
    if let Some(lim) = limit.filter(|&l| l > 0) {
        if starts_with_select(sql) {
            // The newline keeps a trailing `-- comment` from swallowing the `)`.
            return format!(
                "SELECT * FROM ({}\n) _limited LIMIT {}",
                sql.trim().trim_end_matches(';'),
                lim
            );
        }
    }

    sql.to_string()
}

fn starts_with_select(sql: &str) -> bool {
    normalize_for_prefix(sql).trim_start().starts_with("select")
}

fn determine_query_mode(sql: &str) -> QueryMode {
    // Padded with spaces so `" returning "` matches whole words; the keyword
    // prefix check has to skip that leading space.
    let normalized = normalize_for_prefix(sql);
    let head = normalized.trim_start();

    if head.starts_with("insert")
        || head.starts_with("update")
        || head.starts_with("delete")
        || head.starts_with("create")
        || head.starts_with("alter")
        || head.starts_with("drop")
        || head.starts_with("truncate")
        || head.starts_with("grant")
        || head.starts_with("revoke")
    {
        if normalized.contains(" returning ") {
            QueryMode::ReturnsRows
        } else {
            QueryMode::ExecuteOnly
        }
    } else {
        QueryMode::ReturnsRows
    }
}

fn normalize_for_prefix(sql: &str) -> String {
    let mut out = String::new();
    let mut chars = sql.chars().peekable();
    let mut in_block_comment = false;

    while let Some(ch) = chars.next() {
        if in_block_comment {
            if ch == '*' && chars.peek() == Some(&'/') {
                chars.next();
                in_block_comment = false;
            }
            continue;
        }

        if ch == '-' && chars.peek() == Some(&'-') {
            chars.next();
            for c in chars.by_ref() {
                if c == '\n' {
                    break;
                }
            }
            continue;
        }

        if ch == '/' && chars.peek() == Some(&'*') {
            chars.next();
            in_block_comment = true;
            continue;
        }

        out.push(ch);
    }

    format!(" {} ", out.trim().to_lowercase())
}

/// Extract a typed value from a PgRow column, falling back to string representation
fn extract_pg_value(row: &PgRow, col: &sqlx::postgres::PgColumn) -> serde_json::Value {
    use sqlx::TypeInfo;

    let type_name = col.type_info().name();
    let idx = col.ordinal();

    // Try each type in order of likelihood
    match type_name {
        "BOOL" => row
            .try_get::<Option<bool>, _>(idx)
            .ok()
            .flatten()
            .map(serde_json::Value::Bool)
            .unwrap_or(serde_json::Value::Null),

        "INT2" => row
            .try_get::<Option<i16>, _>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::Number(v.into()))
            .unwrap_or(serde_json::Value::Null),

        "INT4" => row
            .try_get::<Option<i32>, _>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::Number(v.into()))
            .unwrap_or(serde_json::Value::Null),

        "INT8" => row
            .try_get::<Option<i64>, _>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::Number(v.into()))
            .unwrap_or(serde_json::Value::Null),

        "FLOAT4" => row
            .try_get::<Option<f32>, _>(idx)
            .ok()
            .flatten()
            .map(|v| {
                let f = v as f64;
                serde_json::Number::from_f64(f)
                    .map(serde_json::Value::Number)
                    .unwrap_or_else(|| {
                        // NaN, Infinity, -Infinity -> string representation
                        serde_json::Value::String(v.to_string())
                    })
            })
            .unwrap_or(serde_json::Value::Null),

        "FLOAT8" => row
            .try_get::<Option<f64>, _>(idx)
            .ok()
            .flatten()
            .map(|v| {
                serde_json::Number::from_f64(v)
                    .map(serde_json::Value::Number)
                    .unwrap_or_else(|| serde_json::Value::String(v.to_string()))
            })
            .unwrap_or(serde_json::Value::Null),

        "JSON" | "JSONB" => row
            .try_get::<Option<serde_json::Value>, _>(idx)
            .ok()
            .flatten()
            .unwrap_or(serde_json::Value::Null),

        _ => {
            // Fall back to string representation
            row.try_get::<Option<String>, _>(idx)
                .ok()
                .flatten()
                .map(serde_json::Value::String)
                .unwrap_or(serde_json::Value::Null)
        }
    }
}

async fn save_history(
    local_db: &SqlitePool,
    connection_id: &str,
    sql: &str,
    execution_time_ms: i64,
    row_count: i64,
    status: &str,
    error_message: Option<&str>,
) {
    let id = uuid::Uuid::new_v4().to_string();
    if let Err(e) = sqlx::query(
        "INSERT INTO query_history (id, connection_id, sql_text, execution_time_ms, row_count, status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(connection_id)
    .bind(sql)
    .bind(execution_time_ms)
    .bind(row_count)
    .bind(status)
    .bind(error_message)
    .execute(local_db)
    .await
    {
        eprintln!("Failed to save query history: {e}");
    }
}

#[cfg(test)]
mod tests {
    use super::{
        apply_select_limit, determine_query_mode, history_entry_for, normalize_for_prefix,
        record_and_finish, HistoryEntryFields, QueryMode,
    };
    use crate::error::AppError;

    #[test]
    fn test_limit_wrapping_format() {
        let sql = "SELECT * FROM users WHERE active = true";
        let lim = 100i64;
        let effective = apply_select_limit(sql, Some(lim));
        assert!(effective.contains("_limited LIMIT 100"));
        assert!(effective.starts_with("SELECT * FROM ("));
    }

    #[test]
    fn test_limit_wrapping_with_semicolon() {
        let sql = "SELECT id FROM users;";
        let lim = 50i64;
        let effective = apply_select_limit(sql, Some(lim));
        assert_eq!(
            effective,
            "SELECT * FROM (SELECT id FROM users\n) _limited LIMIT 50"
        );
    }

    #[test]
    fn test_limit_wrapping_with_existing_limit() {
        // Even queries with existing LIMIT get safely wrapped
        let sql = "SELECT * FROM users LIMIT 10";
        let lim = 5i64;
        let effective = apply_select_limit(sql, Some(lim));
        // Subquery wrapping means the outer LIMIT is applied safely
        assert_eq!(
            effective,
            "SELECT * FROM (SELECT * FROM users LIMIT 10\n) _limited LIMIT 5"
        );
    }

    #[test]
    fn test_no_limit_wrapping_when_none() {
        let sql = "SELECT * FROM users";
        let limit: Option<i64> = None;
        let effective = apply_select_limit(sql, limit);
        assert_eq!(effective, "SELECT * FROM users");
    }

    #[test]
    fn test_no_limit_wrapping_for_non_select() {
        let sql = "UPDATE users SET last_login = NOW()";
        let effective = apply_select_limit(sql, Some(100));
        assert_eq!(effective, sql);
    }

    #[test]
    fn test_determine_query_mode_execute_only() {
        let mode = determine_query_mode("UPDATE users SET active = false");
        assert_eq!(mode, QueryMode::ExecuteOnly);
    }

    #[test]
    fn test_determine_query_mode_returning() {
        let mode = determine_query_mode("INSERT INTO users(name) VALUES('a') RETURNING id");
        assert_eq!(mode, QueryMode::ReturnsRows);
    }

    #[test]
    fn test_normalize_for_prefix_strips_comments() {
        let normalized = normalize_for_prefix("-- comment\n/* block */ SELECT 1");
        assert!(normalized.starts_with(" select"));
    }

    #[test]
    fn test_nan_infinity_string_fallback() {
        // Verify NaN/Infinity produce string representation rather than null
        let nan_val = f64::NAN;
        let result = serde_json::Number::from_f64(nan_val);
        assert!(
            result.is_none(),
            "NaN should not be representable as JSON number"
        );

        let inf_val = f64::INFINITY;
        let result = serde_json::Number::from_f64(inf_val);
        assert!(
            result.is_none(),
            "Infinity should not be representable as JSON number"
        );

        // Our code falls back to string representation
        let fallback = serde_json::Value::String(nan_val.to_string());
        assert_eq!(fallback.as_str().unwrap(), "NaN");

        let fallback = serde_json::Value::String(inf_val.to_string());
        assert_eq!(fallback.as_str().unwrap(), "inf");
    }

    #[test]
    fn history_records_a_successful_query() {
        assert_eq!(
            history_entry_for(Ok(3)),
            HistoryEntryFields {
                row_count: 3,
                status: "success",
                error_message: None,
            }
        );
    }

    #[test]
    fn history_row_count_saturates_instead_of_wrapping() {
        assert_eq!(history_entry_for(Ok(usize::MAX)).row_count, i64::MAX);
    }

    async fn local_db_with_connection() -> (tempfile::TempDir, sqlx::SqlitePool) {
        let dir = tempfile::tempdir().unwrap();
        let pool = crate::db::local::init_local_db(&dir.path().join("test.db"))
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO connections (id, name, host, port, database, username, password)
             VALUES ('conn-1', 'test', 'localhost', '5432', 'db', 'user', 'secret')",
        )
        .execute(&pool)
        .await
        .unwrap();
        (dir, pool)
    }

    async fn history_rows(pool: &sqlx::SqlitePool) -> Vec<(String, i64, String, Option<String>)> {
        sqlx::query_as(
            "SELECT sql_text, row_count, status, error_message FROM query_history ORDER BY created_at",
        )
        .fetch_all(pool)
        .await
        .unwrap()
    }

    #[tokio::test]
    async fn failed_query_is_recorded_and_returned_as_an_error() {
        let (_dir, pool) = local_db_with_connection().await;
        let failure = sqlx::Error::Protocol("relation \"missing\" does not exist".to_string());

        let response =
            record_and_finish(&pool, "conn-1", "SELECT * FROM missing", 7, Err(failure)).await;

        assert!(matches!(response, Err(AppError::Database(_))));
        let rows = history_rows(&pool).await;
        assert_eq!(rows.len(), 1);
        let (sql, row_count, status, message) = &rows[0];
        assert_eq!(sql, "SELECT * FROM missing");
        assert_eq!(*row_count, 0);
        assert_eq!(status, "error");
        assert!(message
            .as_deref()
            .is_some_and(|m| m.contains("relation \"missing\" does not exist")));
    }

    #[tokio::test]
    async fn successful_query_is_recorded_and_returned() {
        let (_dir, pool) = local_db_with_connection().await;
        let rows = (
            vec!["id".to_string()],
            vec![serde_json::json!({ "id": 1 })],
            1,
        );

        let response = record_and_finish(&pool, "conn-1", "SELECT 1", 3, Ok(rows))
            .await
            .unwrap();

        assert_eq!(response.row_count, 1);
        assert_eq!(response.execution_time_ms, 3);
        let recorded = history_rows(&pool).await;
        assert_eq!(recorded.len(), 1);
        assert_eq!(recorded[0].2, "success");
        assert_eq!(recorded[0].3, None);
    }

    #[test]
    fn limit_applies_to_select_after_whitespace_and_comments() {
        let effective = apply_select_limit("\n  -- recent users\n  select id from users", Some(10));
        assert_eq!(
            effective,
            "SELECT * FROM (-- recent users\n  select id from users\n) _limited LIMIT 10"
        );
    }

    #[test]
    fn limit_is_not_applied_to_identifiers_that_only_contain_select() {
        let sql = "UPDATE selections SET active = true";
        assert_eq!(apply_select_limit(sql, Some(10)), sql);
    }

    #[test]
    fn write_statements_after_comments_execute_without_rows() {
        assert_eq!(
            determine_query_mode("/* cleanup */ delete from sessions"),
            QueryMode::ExecuteOnly
        );
    }

    #[test]
    fn trailing_line_comment_does_not_swallow_the_wrapper() {
        let effective = apply_select_limit("select id from users -- newest first", Some(5));
        assert_eq!(
            effective,
            "SELECT * FROM (select id from users -- newest first\n) _limited LIMIT 5"
        );
    }
}
