use serde::{Deserialize, Serialize};

/// Parsed EXPLAIN node for tree visualization
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlanNode {
    pub node_type: String,
    pub relation_name: Option<String>,
    pub schema_name: Option<String>,
    pub alias: Option<String>,
    pub startup_cost: f64,
    pub total_cost: f64,
    pub plan_rows: f64,
    pub actual_rows: Option<f64>,
    pub actual_startup_time: Option<f64>,
    pub actual_total_time: Option<f64>,
    pub plan_width: i64,
    pub loops: Option<i64>,
    pub filter: Option<String>,
    pub join_type: Option<String>,
    pub index_name: Option<String>,
    pub index_cond: Option<String>,
    pub sort_key: Option<Vec<String>>,
    pub output: Option<Vec<String>>,
    pub shared_hit_blocks: Option<i64>,
    pub shared_read_blocks: Option<i64>,
    pub workers_planned: Option<i64>,
    pub workers_launched: Option<i64>,
    pub children: Vec<PlanNode>,
    /// Computed warnings
    pub warnings: Vec<String>,
}

/// Table-level statistics from pg_stat_user_tables
#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TableStats {
    pub schemaname: String,
    pub relname: String,
    pub seq_scan: Option<i64>,
    pub seq_tup_read: Option<i64>,
    pub idx_scan: Option<i64>,
    pub idx_tup_fetch: Option<i64>,
    pub n_tup_ins: Option<i64>,
    pub n_tup_upd: Option<i64>,
    pub n_tup_del: Option<i64>,
    pub n_live_tup: Option<i64>,
    pub n_dead_tup: Option<i64>,
    pub last_vacuum: Option<String>,
    pub last_autovacuum: Option<String>,
    pub last_analyze: Option<String>,
    pub last_autoanalyze: Option<String>,
}

/// Index-level statistics from pg_stat_user_indexes
#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct IndexStats {
    pub schemaname: String,
    pub relname: String,
    pub indexrelname: String,
    pub idx_scan: Option<i64>,
    pub idx_tup_read: Option<i64>,
    pub idx_tup_fetch: Option<i64>,
    pub idx_size: Option<i64>,
}
