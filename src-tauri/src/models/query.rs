use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Value>,
    pub row_count: usize,
    pub execution_time_ms: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExplainResult {
    pub plan: serde_json::Value,
    pub execution_time_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QueryHistoryEntry {
    pub id: String,
    pub connection_id: String,
    pub sql_text: String,
    pub execution_time_ms: Option<i64>,
    pub row_count: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct QueryHistoryRow {
    pub id: String,
    pub connection_id: String,
    pub sql_text: String,
    pub execution_time_ms: Option<i64>,
    pub row_count: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: String,
}
