use tauri::State;

use crate::error::AppError;
use crate::models::ai::{
    AiSuggestInput, AiSuggestion, AiSuggestionRow, OllamaGenerateRequest,
    OllamaGenerateResponse, OllamaStatus, OllamaTagsResponse, SuggestionType,
};
use crate::models::settings::{AppSettings, SettingRow};
use crate::AppState;

/// Check Ollama availability and list models
#[tauri::command(rename_all = "camelCase")]
pub async fn check_ollama_status(
    state: State<'_, AppState>,
) -> Result<OllamaStatus, AppError> {
    let settings = load_settings(&state).await?;
    let endpoint = settings.ollama_endpoint.trim_end_matches('/').to_string();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| AppError::General(format!("HTTP client error: {e}")))?;

    // Health check — verify both transport and HTTP status
    match client.get(&endpoint).send().await {
        Ok(resp) if !resp.status().is_success() => {
            return Ok(OllamaStatus {
                available: false,
                endpoint: endpoint.clone(),
                models: vec![],
                error: Some(format!(
                    "Ollama returned HTTP {} at {}",
                    resp.status(),
                    endpoint
                )),
            });
        }
        Err(e) => {
            return Ok(OllamaStatus {
                available: false,
                endpoint: endpoint.clone(),
                models: vec![],
                error: Some(format!(
                    "Cannot reach Ollama at {}: {}",
                    endpoint, e
                )),
            });
        }
        _ => {} // success — proceed to list models
    }

    // List models
    let models_url = format!("{}/api/tags", endpoint);
    match client.get(&models_url).send().await {
        Ok(resp) => match resp.json::<OllamaTagsResponse>().await {
            Ok(tags) => {
                let model_names: Vec<String> =
                    tags.models.into_iter().map(|m| m.name).collect();
                Ok(OllamaStatus {
                    available: true,
                    endpoint,
                    models: model_names,
                    error: None,
                })
            }
            Err(e) => Ok(OllamaStatus {
                available: true,
                endpoint,
                models: vec![],
                error: Some(format!("Failed to parse model list: {e}")),
            }),
        },
        Err(e) => Ok(OllamaStatus {
            available: true,
            endpoint,
            models: vec![],
            error: Some(format!("Failed to list models: {e}")),
        }),
    }
}

/// Generate an AI suggestion via Ollama
#[tauri::command(rename_all = "camelCase")]
pub async fn ai_suggest(
    connection_id: String,
    input: AiSuggestInput,
    state: State<'_, AppState>,
) -> Result<AiSuggestion, AppError> {
    let settings = load_settings(&state).await?;
    let endpoint = settings.ollama_endpoint.trim_end_matches('/').to_string();
    let model = settings.ollama_model.clone();

    let prompt = build_prompt(&input.suggestion_type, &input.context);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| AppError::General(format!("HTTP client error: {e}")))?;

    let generate_url = format!("{}/api/generate", endpoint);
    let body = OllamaGenerateRequest {
        model,
        prompt,
        stream: false,
    };

    let resp = client
        .post(&generate_url)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            AppError::General(format!(
                "Failed to reach Ollama at {}: {}. Is it running?",
                endpoint, e
            ))
        })?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_default();
        return Err(AppError::General(format!(
            "Ollama returned {}: {}",
            status, body_text
        )));
    }

    let result: OllamaGenerateResponse = resp.json().await.map_err(|e| {
        AppError::General(format!("Failed to parse Ollama response: {e}"))
    })?;

    // Save to history
    let id = uuid::Uuid::new_v4().to_string();
    let suggestion_type_str = input.suggestion_type.to_string();

    sqlx::query(
        "INSERT INTO ai_suggestions (id, connection_id, type, input_context, suggestion)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&connection_id)
    .bind(&suggestion_type_str)
    .bind(&input.context)
    .bind(&result.response)
    .execute(&state.local_db)
    .await?;

    Ok(AiSuggestion {
        id,
        connection_id,
        suggestion_type: suggestion_type_str,
        input_context: input.context,
        suggestion: result.response,
        confidence: None,
        accepted: false,
        created_at: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

/// Get AI suggestion history for a connection
#[tauri::command(rename_all = "camelCase")]
pub async fn get_ai_history(
    connection_id: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<AiSuggestion>, AppError> {
    let limit = limit.unwrap_or(50);

    let rows: Vec<AiSuggestionRow> = sqlx::query_as(
        "SELECT id, connection_id, type, input_context, suggestion, confidence, accepted, created_at
         FROM ai_suggestions
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
        .map(|r| AiSuggestion {
            id: r.id,
            connection_id: r.connection_id,
            suggestion_type: r.suggestion_type,
            input_context: r.input_context,
            suggestion: r.suggestion,
            confidence: r.confidence,
            accepted: r.accepted != 0,
            created_at: r.created_at,
        })
        .collect())
}

/// Mark a suggestion as accepted
#[tauri::command(rename_all = "camelCase")]
pub async fn accept_suggestion(
    suggestion_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let result = sqlx::query("UPDATE ai_suggestions SET accepted = 1 WHERE id = ?")
        .bind(&suggestion_id)
        .execute(&state.local_db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::General(format!(
            "Suggestion not found: {suggestion_id}"
        )));
    }

    Ok(())
}

/// Clear AI history for a connection
#[tauri::command(rename_all = "camelCase")]
pub async fn clear_ai_history(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM ai_suggestions WHERE connection_id = ?")
        .bind(&connection_id)
        .execute(&state.local_db)
        .await?;
    Ok(())
}

/// Build a prompt based on the suggestion type
fn build_prompt(suggestion_type: &SuggestionType, context: &str) -> String {
    match suggestion_type {
        SuggestionType::QueryOptimization => format!(
            "You are a PostgreSQL performance expert. Analyze the following SQL query and provide specific optimization suggestions. \
             Focus on: query structure, join efficiency, subquery optimization, and WHERE clause improvements. \
             Be concise and provide the optimized query if applicable.\n\n\
             SQL Query:\n```sql\n{}\n```\n\n\
             Provide your analysis and optimized version:",
            context
        ),
        SuggestionType::IndexSuggestion => format!(
            "You are a PostgreSQL database administrator. Based on the following table statistics and query patterns, \
             suggest which indexes should be created, modified, or dropped. \
             Consider: column selectivity, query frequency, write overhead, and composite index opportunities. \
             Be specific with CREATE INDEX statements.\n\n\
             Context:\n{}\n\n\
             Provide your index recommendations:",
            context
        ),
        SuggestionType::SchemaReview => format!(
            "You are a PostgreSQL database architect. Review the following schema information and provide suggestions for: \
             normalization issues, missing constraints, data type improvements, naming conventions, \
             and potential performance concerns. Be specific and actionable.\n\n\
             Schema:\n{}\n\n\
             Provide your review:",
            context
        ),
        SuggestionType::General => format!(
            "You are a PostgreSQL expert. Answer the following database-related question concisely and accurately. \
             Include SQL examples when relevant.\n\n\
             Question: {}\n\n\
             Answer:",
            context
        ),
    }
}

/// Load settings from SQLite (internal helper)
async fn load_settings(state: &AppState) -> Result<AppSettings, AppError> {
    let rows: Vec<SettingRow> = sqlx::query_as("SELECT key, value FROM settings")
        .fetch_all(&state.local_db)
        .await?;

    let mut settings = AppSettings::default();
    for row in rows {
        match row.key.as_str() {
            "ollama_endpoint" => settings.ollama_endpoint = row.value,
            "ollama_model" => settings.ollama_model = row.value,
            _ => {}
        }
    }
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_prompt_query_optimization() {
        let prompt = build_prompt(
            &SuggestionType::QueryOptimization,
            "SELECT * FROM users WHERE name LIKE '%john%'",
        );
        assert!(prompt.contains("PostgreSQL performance expert"));
        assert!(prompt.contains("SELECT * FROM users"));
    }

    #[test]
    fn test_build_prompt_index_suggestion() {
        let prompt = build_prompt(
            &SuggestionType::IndexSuggestion,
            "Table users: 50000 seq scans, 100 idx scans",
        );
        assert!(prompt.contains("database administrator"));
        assert!(prompt.contains("CREATE INDEX"));
    }

    #[test]
    fn test_build_prompt_schema_review() {
        let prompt = build_prompt(
            &SuggestionType::SchemaReview,
            "users(id INT, name VARCHAR(255), email TEXT)",
        );
        assert!(prompt.contains("database architect"));
        assert!(prompt.contains("normalization"));
    }

    #[test]
    fn test_build_prompt_general() {
        let prompt = build_prompt(
            &SuggestionType::General,
            "How do I use CTEs in PostgreSQL?",
        );
        assert!(prompt.contains("PostgreSQL expert"));
        assert!(prompt.contains("CTEs"));
    }

    #[test]
    fn test_suggestion_type_display() {
        assert_eq!(SuggestionType::QueryOptimization.to_string(), "query_optimization");
        assert_eq!(SuggestionType::IndexSuggestion.to_string(), "index_suggestion");
        assert_eq!(SuggestionType::SchemaReview.to_string(), "schema_review");
        assert_eq!(SuggestionType::General.to_string(), "general");
    }
}
