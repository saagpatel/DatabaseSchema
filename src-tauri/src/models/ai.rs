use serde::{Deserialize, Serialize};

/// Types of AI suggestions
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionType {
    QueryOptimization,
    IndexSuggestion,
    SchemaReview,
    General,
}

impl std::fmt::Display for SuggestionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SuggestionType::QueryOptimization => write!(f, "query_optimization"),
            SuggestionType::IndexSuggestion => write!(f, "index_suggestion"),
            SuggestionType::SchemaReview => write!(f, "schema_review"),
            SuggestionType::General => write!(f, "general"),
        }
    }
}

/// Request from frontend to generate a suggestion
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSuggestInput {
    pub suggestion_type: SuggestionType,
    pub context: String,
}

/// Stored suggestion row from SQLite
#[derive(Debug, sqlx::FromRow)]
pub struct AiSuggestionRow {
    pub id: String,
    pub connection_id: String,
    #[sqlx(rename = "type")]
    pub suggestion_type: String,
    pub input_context: String,
    pub suggestion: String,
    pub confidence: Option<f64>,
    pub accepted: i32,
    pub created_at: String,
}

/// Suggestion returned to frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiSuggestion {
    pub id: String,
    pub connection_id: String,
    pub suggestion_type: String,
    pub input_context: String,
    pub suggestion: String,
    pub confidence: Option<f64>,
    pub accepted: bool,
    pub created_at: String,
}

/// Ollama status info
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OllamaStatus {
    pub available: bool,
    pub endpoint: String,
    pub models: Vec<String>,
    pub error: Option<String>,
}

/// Ollama generate request body
#[derive(Debug, Serialize)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
}

/// Ollama generate response
#[derive(Debug, Deserialize)]
pub struct OllamaGenerateResponse {
    pub response: String,
}

/// Ollama list models response
#[derive(Debug, Deserialize)]
pub struct OllamaTagsResponse {
    pub models: Vec<OllamaModelInfo>,
}

#[derive(Debug, Deserialize)]
pub struct OllamaModelInfo {
    pub name: String,
}
