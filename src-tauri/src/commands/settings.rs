use tauri::State;

use crate::error::AppError;
use crate::models::settings::{AppSettings, SettingRow};
use crate::AppState;

#[tauri::command(rename_all = "camelCase")]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, AppError> {
    let rows: Vec<SettingRow> = sqlx::query_as("SELECT key, value FROM settings")
        .fetch_all(&state.local_db)
        .await?;

    let mut settings = AppSettings::default();

    for row in rows {
        match row.key.as_str() {
            "theme" => settings.theme = row.value,
            "query_limit" => settings.query_limit = row.value,
            "ollama_endpoint" => settings.ollama_endpoint = row.value,
            "ollama_model" => settings.ollama_model = row.value,
            "editor_font_size" => settings.editor_font_size = row.value,
            "editor_tab_size" => settings.editor_tab_size = row.value,
            "graph_layout" => settings.graph_layout = row.value,
            "graph_show_columns" => settings.graph_show_columns = row.value,
            "graph_show_types" => settings.graph_show_types = row.value,
            _ => {}
        }
    }

    Ok(settings)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<AppSettings, AppError> {
    let pairs = vec![
        ("theme", &settings.theme),
        ("query_limit", &settings.query_limit),
        ("ollama_endpoint", &settings.ollama_endpoint),
        ("ollama_model", &settings.ollama_model),
        ("editor_font_size", &settings.editor_font_size),
        ("editor_tab_size", &settings.editor_tab_size),
        ("graph_layout", &settings.graph_layout),
        ("graph_show_columns", &settings.graph_show_columns),
        ("graph_show_types", &settings.graph_show_types),
    ];

    for (key, value) in pairs {
        sqlx::query("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .bind(key)
            .bind(value)
            .execute(&state.local_db)
            .await?;
    }

    Ok(settings)
}
