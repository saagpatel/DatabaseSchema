use tauri::State;

use crate::error::AppError;
use crate::models::performance::{IndexStats, PlanNode, TableStats};
use crate::AppState;

#[tauri::command(rename_all = "camelCase")]
pub async fn parse_explain_plan(
    connection_id: String,
    sql: String,
    state: State<'_, AppState>,
) -> Result<PlanNode, AppError> {
    let explain_sql = format!(
        "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {}",
        sql.trim().trim_end_matches(';')
    );

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
    let row: sqlx::postgres::PgRow = sqlx::query(&explain_sql)
        .fetch_one(&mut *tx)
        .await?;
    tx.rollback().await?;

    use sqlx::Row;
    let plan_text: String = row.try_get(0)?;
    let plan_json: serde_json::Value = serde_json::from_str(&plan_text)
        .map_err(|e| AppError::General(format!("Failed to parse EXPLAIN output: {e}")))?;

    // EXPLAIN JSON is an array with one element containing "Plan"
    let root_plan = plan_json
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|obj| obj.get("Plan"))
        .ok_or_else(|| AppError::General("Invalid EXPLAIN JSON structure".to_string()))?;

    let mut root_node = parse_plan_node(root_plan);
    compute_warnings(&mut root_node);

    Ok(root_node)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_table_stats(
    connection_id: String,
    schema_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<TableStats>, AppError> {
    let schema = schema_name.unwrap_or_else(|| "public".to_string());

    let rows: Vec<TableStats> = {
        let pool = {
            let pg_pools = state.pg_pools.lock().await;
            pg_pools
                .get(&connection_id)
                .cloned()
                .ok_or_else(|| AppError::NotConnected(connection_id.clone()))?
        };

        sqlx::query_as::<_, TableStats>(
            "SELECT schemaname, relname,
                    seq_scan, seq_tup_read,
                    idx_scan, idx_tup_fetch,
                    n_tup_ins, n_tup_upd, n_tup_del,
                    n_live_tup, n_dead_tup,
                    last_vacuum::text, last_autovacuum::text,
                    last_analyze::text, last_autoanalyze::text
             FROM pg_stat_user_tables
             WHERE schemaname = $1
             ORDER BY COALESCE(seq_scan, 0) + COALESCE(idx_scan, 0) DESC",
        )
        .bind(&schema)
        .fetch_all(&pool)
        .await?
    };

    Ok(rows)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_index_stats(
    connection_id: String,
    schema_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<IndexStats>, AppError> {
    let schema = schema_name.unwrap_or_else(|| "public".to_string());

    let rows: Vec<IndexStats> = {
        let pool = {
            let pg_pools = state.pg_pools.lock().await;
            pg_pools
                .get(&connection_id)
                .cloned()
                .ok_or_else(|| AppError::NotConnected(connection_id.clone()))?
        };

        sqlx::query_as::<_, IndexStats>(
            "SELECT s.schemaname, s.relname, s.indexrelname,
                    s.idx_scan, s.idx_tup_read, s.idx_tup_fetch,
                    pg_relation_size(s.indexrelid) AS idx_size
             FROM pg_stat_user_indexes s
             WHERE s.schemaname = $1
             ORDER BY pg_relation_size(s.indexrelid) DESC",
        )
        .bind(&schema)
        .fetch_all(&pool)
        .await?
    };

    Ok(rows)
}

fn parse_plan_node(json: &serde_json::Value) -> PlanNode {
    let get_str = |key: &str| json.get(key).and_then(|v| v.as_str()).map(|s| s.to_string());
    let get_f64 = |key: &str| json.get(key).and_then(|v| v.as_f64());
    let get_i64 = |key: &str| json.get(key).and_then(|v| v.as_i64());
    let get_str_vec = |key: &str| {
        json.get(key).and_then(|v| {
            v.as_array().map(|arr| {
                arr.iter()
                    .filter_map(|item| item.as_str().map(|s| s.to_string()))
                    .collect::<Vec<String>>()
            })
        })
    };

    let children = json
        .get("Plans")
        .and_then(|v| v.as_array())
        .map(|plans| plans.iter().map(parse_plan_node).collect())
        .unwrap_or_default();

    PlanNode {
        node_type: get_str("Node Type").unwrap_or_else(|| "Unknown".to_string()),
        relation_name: get_str("Relation Name"),
        schema_name: get_str("Schema"),
        alias: get_str("Alias"),
        startup_cost: get_f64("Startup Cost").unwrap_or(0.0),
        total_cost: get_f64("Total Cost").unwrap_or(0.0),
        plan_rows: get_f64("Plan Rows").unwrap_or(0.0),
        actual_rows: get_f64("Actual Rows"),
        actual_startup_time: get_f64("Actual Startup Time"),
        actual_total_time: get_f64("Actual Total Time"),
        plan_width: get_i64("Plan Width").unwrap_or(0),
        loops: get_i64("Actual Loops"),
        filter: get_str("Filter"),
        join_type: get_str("Join Type"),
        index_name: get_str("Index Name"),
        index_cond: get_str("Index Cond"),
        sort_key: get_str_vec("Sort Key"),
        output: get_str_vec("Output"),
        shared_hit_blocks: get_i64("Shared Hit Blocks"),
        shared_read_blocks: get_i64("Shared Read Blocks"),
        workers_planned: get_i64("Workers Planned"),
        workers_launched: get_i64("Workers Launched"),
        children,
        warnings: vec![],
    }
}

fn compute_warnings(node: &mut PlanNode) {
    // Sequential scan on a table with estimated rows
    if node.node_type == "Seq Scan" && node.plan_rows > 10000.0 {
        node.warnings.push(format!(
            "Sequential scan on {} (~{} rows) — consider adding an index",
            node.relation_name.as_deref().unwrap_or("unknown"),
            node.plan_rows as i64,
        ));
    }

    // High cost nodes
    if node.total_cost > 10000.0 {
        node.warnings.push(format!(
            "High cost node: {} (cost: {:.1})",
            node.node_type, node.total_cost
        ));
    }

    // Row estimate vs actual mismatch
    if let Some(actual) = node.actual_rows {
        if node.plan_rows > 0.0 && actual > 0.0 {
            let ratio = if actual > node.plan_rows {
                actual / node.plan_rows
            } else {
                node.plan_rows / actual
            };
            if ratio > 10.0 {
                node.warnings.push(format!(
                    "Row estimate mismatch: planned {}, actual {} — consider running ANALYZE",
                    node.plan_rows as i64,
                    actual as i64,
                ));
            }
        }
    }

    // Disk reads (shared read blocks > 0 indicates cache misses)
    if let Some(reads) = node.shared_read_blocks {
        if reads > 100 {
            node.warnings.push(format!(
                "High disk I/O: {} blocks read from disk",
                reads
            ));
        }
    }

    // Recurse into children
    for child in &mut node.children {
        compute_warnings(child);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_plan_node_basic() {
        let json = serde_json::json!({
            "Node Type": "Seq Scan",
            "Relation Name": "users",
            "Schema": "public",
            "Alias": "u",
            "Startup Cost": 0.0,
            "Total Cost": 25.5,
            "Plan Rows": 1000.0,
            "Plan Width": 64,
            "Actual Rows": 1000.0,
            "Actual Total Time": 1.5,
            "Filter": "(active = true)"
        });

        let node = parse_plan_node(&json);
        assert_eq!(node.node_type, "Seq Scan");
        assert_eq!(node.relation_name.as_deref(), Some("users"));
        assert_eq!(node.total_cost, 25.5);
        assert_eq!(node.plan_rows, 1000.0);
        assert!(node.children.is_empty());
    }

    #[test]
    fn test_parse_plan_node_with_children() {
        let json = serde_json::json!({
            "Node Type": "Hash Join",
            "Join Type": "Inner",
            "Startup Cost": 10.0,
            "Total Cost": 100.0,
            "Plan Rows": 500.0,
            "Plan Width": 128,
            "Plans": [
                {
                    "Node Type": "Seq Scan",
                    "Relation Name": "orders",
                    "Startup Cost": 0.0,
                    "Total Cost": 50.0,
                    "Plan Rows": 500.0,
                    "Plan Width": 64
                },
                {
                    "Node Type": "Hash",
                    "Startup Cost": 10.0,
                    "Total Cost": 10.0,
                    "Plan Rows": 100.0,
                    "Plan Width": 32,
                    "Plans": [
                        {
                            "Node Type": "Seq Scan",
                            "Relation Name": "users",
                            "Startup Cost": 0.0,
                            "Total Cost": 10.0,
                            "Plan Rows": 100.0,
                            "Plan Width": 32
                        }
                    ]
                }
            ]
        });

        let node = parse_plan_node(&json);
        assert_eq!(node.node_type, "Hash Join");
        assert_eq!(node.join_type.as_deref(), Some("Inner"));
        assert_eq!(node.children.len(), 2);
        assert_eq!(node.children[0].node_type, "Seq Scan");
        assert_eq!(node.children[1].node_type, "Hash");
        assert_eq!(node.children[1].children.len(), 1);
    }

    #[test]
    fn test_compute_warnings_seq_scan_large() {
        let mut node = PlanNode {
            node_type: "Seq Scan".to_string(),
            relation_name: Some("big_table".to_string()),
            schema_name: None,
            alias: None,
            startup_cost: 0.0,
            total_cost: 500.0,
            plan_rows: 50000.0,
            actual_rows: None,
            actual_startup_time: None,
            actual_total_time: None,
            plan_width: 64,
            loops: None,
            filter: None,
            join_type: None,
            index_name: None,
            index_cond: None,
            sort_key: None,
            output: None,
            shared_hit_blocks: None,
            shared_read_blocks: None,
            workers_planned: None,
            workers_launched: None,
            children: vec![],
            warnings: vec![],
        };

        compute_warnings(&mut node);
        assert!(node.warnings.iter().any(|w| w.contains("Sequential scan")));
    }

    #[test]
    fn test_compute_warnings_row_mismatch() {
        let mut node = PlanNode {
            node_type: "Index Scan".to_string(),
            relation_name: Some("users".to_string()),
            schema_name: None,
            alias: None,
            startup_cost: 0.0,
            total_cost: 10.0,
            plan_rows: 10.0,
            actual_rows: Some(10000.0),
            actual_startup_time: None,
            actual_total_time: None,
            plan_width: 32,
            loops: None,
            filter: None,
            join_type: None,
            index_name: None,
            index_cond: None,
            sort_key: None,
            output: None,
            shared_hit_blocks: None,
            shared_read_blocks: None,
            workers_planned: None,
            workers_launched: None,
            children: vec![],
            warnings: vec![],
        };

        compute_warnings(&mut node);
        assert!(node.warnings.iter().any(|w| w.contains("Row estimate mismatch")));
    }
}
