use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub query_limit: String,
    pub ollama_endpoint: String,
    pub ollama_model: String,
    pub editor_font_size: String,
    pub editor_tab_size: String,
    pub graph_layout: String,
    pub graph_show_columns: String,
    pub graph_show_types: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            query_limit: "1000".to_string(),
            ollama_endpoint: "http://localhost:11434".to_string(),
            ollama_model: "llama3.2".to_string(),
            editor_font_size: "14".to_string(),
            editor_tab_size: "2".to_string(),
            graph_layout: "dagre".to_string(),
            graph_show_columns: "true".to_string(),
            graph_show_types: "true".to_string(),
        }
    }
}

/// Individual setting row from SQLite
#[derive(Debug, sqlx::FromRow)]
pub struct SettingRow {
    pub key: String,
    pub value: String,
}
