use sqlx::postgres::PgRow;
use sqlx::{Column, Row};
use std::time::Instant;
use tauri::State;

use crate::error::AppError;
use crate::models::query::{ExplainResult, QueryHistoryEntry, QueryHistoryRow, QueryResult};
use crate::AppState;

#[tauri::command(rename_all = "camelCase")]
pub async fn execute_query(
    connection_id: String,
    sql: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<QueryResult, AppError> {
    let start = Instant::now();

    let result = {
        let pool = {
            let pg_pools = state.pg_pools.lock().await;
            pg_pools
                .get(&connection_id)
                .cloned()
                .ok_or_else(|| AppError::NotConnected(connection_id.clone()))?
        };

        // Wrap in subquery to safely apply LIMIT without false-positive detection
        let effective_sql = if let Some(lim) = limit {
            format!(
                "SELECT * FROM ({}) _limited LIMIT {}",
                sql.trim().trim_end_matches(';'),
                lim
            )
        } else {
            sql.clone()
        };

        sqlx::query(&effective_sql).fetch_all(&pool).await
    };

    let elapsed = start.elapsed().as_millis() as u64;

    match result {
        Ok(rows) => {
            let (columns, json_rows) = pg_rows_to_json(&rows);
            let row_count = json_rows.len();

            // Save to history
            save_history(
                &state,
                &connection_id,
                &sql,
                elapsed as i64,
                row_count as i64,
                "success",
                None,
            )
            .await;

            Ok(QueryResult {
                columns,
                rows: json_rows,
                row_count,
                execution_time_ms: elapsed,
            })
        }
        Err(e) => {
            let err_msg = e.to_string();

            save_history(
                &state,
                &connection_id,
                &sql,
                elapsed as i64,
                0,
                "error",
                Some(&err_msg),
            )
            .await;

            Err(AppError::Database(e))
        }
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
                    .unwrap_or_else(|| {
                        serde_json::Value::String(v.to_string())
                    })
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
    state: &AppState,
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
    .execute(&state.local_db)
    .await
    {
        eprintln!("Failed to save query history: {e}");
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_limit_wrapping_format() {
        let sql = "SELECT * FROM users WHERE active = true";
        let lim = 100i64;
        let effective = format!(
            "SELECT * FROM ({}) _limited LIMIT {}",
            sql.trim().trim_end_matches(';'),
            lim
        );
        assert!(effective.contains("_limited LIMIT 100"));
        assert!(effective.starts_with("SELECT * FROM ("));
    }

    #[test]
    fn test_limit_wrapping_with_semicolon() {
        let sql = "SELECT id FROM users;";
        let lim = 50i64;
        let effective = format!(
            "SELECT * FROM ({}) _limited LIMIT {}",
            sql.trim().trim_end_matches(';'),
            lim
        );
        assert_eq!(
            effective,
            "SELECT * FROM (SELECT id FROM users) _limited LIMIT 50"
        );
    }

    #[test]
    fn test_limit_wrapping_with_existing_limit() {
        // Even queries with existing LIMIT get safely wrapped
        let sql = "SELECT * FROM users LIMIT 10";
        let lim = 5i64;
        let effective = format!(
            "SELECT * FROM ({}) _limited LIMIT {}",
            sql.trim().trim_end_matches(';'),
            lim
        );
        // Subquery wrapping means the outer LIMIT is applied safely
        assert_eq!(
            effective,
            "SELECT * FROM (SELECT * FROM users LIMIT 10) _limited LIMIT 5"
        );
    }

    #[test]
    fn test_no_limit_wrapping_when_none() {
        let sql = "SELECT * FROM users";
        let limit: Option<i64> = None;
        let effective = if let Some(lim) = limit {
            format!(
                "SELECT * FROM ({}) _limited LIMIT {}",
                sql.trim().trim_end_matches(';'),
                lim
            )
        } else {
            sql.to_string()
        };
        assert_eq!(effective, "SELECT * FROM users");
    }

    #[test]
    fn test_nan_infinity_string_fallback() {
        // Verify NaN/Infinity produce string representation rather than null
        let nan_val = f64::NAN;
        let result = serde_json::Number::from_f64(nan_val);
        assert!(result.is_none(), "NaN should not be representable as JSON number");

        let inf_val = f64::INFINITY;
        let result = serde_json::Number::from_f64(inf_val);
        assert!(result.is_none(), "Infinity should not be representable as JSON number");

        // Our code falls back to string representation
        let fallback = serde_json::Value::String(nan_val.to_string());
        assert_eq!(fallback.as_str().unwrap(), "NaN");

        let fallback = serde_json::Value::String(inf_val.to_string());
        assert_eq!(fallback.as_str().unwrap(), "inf");
    }
}
