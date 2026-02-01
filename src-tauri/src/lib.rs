mod commands;
mod crypto;
mod db;
pub mod error;
pub mod models;

use sqlx::postgres::PgPool;
use sqlx::sqlite::SqlitePool;
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::sync::Mutex;

pub struct AppState {
    pub local_db: SqlitePool,
    pub pg_pools: Mutex<HashMap<String, PgPool>>,
    pub encryption_key: [u8; 32],
}

fn init_encryption_key(app_data_dir: &PathBuf) -> Result<[u8; 32], Box<dyn std::error::Error>> {
    let salt_path = app_data_dir.join("dbviz.salt");

    let salt = if salt_path.exists() {
        std::fs::read(&salt_path)?
    } else {
        std::fs::create_dir_all(app_data_dir)?;
        let salt = crypto::encryption::generate_salt()?;
        std::fs::write(&salt_path, &salt)?;
        salt
    };

    let machine_id = crypto::encryption::get_machine_id();
    Ok(crypto::encryption::derive_key(&machine_id, &salt))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;

            let app_data_dir = app.path().app_data_dir()?;

            let encryption_key = init_encryption_key(&app_data_dir)?;
            let db_path = app_data_dir.join("dbviz.db");

            let rt = tokio::runtime::Handle::current();
            let local_db = rt.block_on(async {
                db::local::init_local_db(&db_path).await
            })?;

            let state = AppState {
                local_db,
                pg_pools: Mutex::new(HashMap::new()),
                encryption_key,
            };

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connections::list_connections,
            commands::connections::create_connection,
            commands::connections::update_connection,
            commands::connections::delete_connection,
            commands::connections::test_connection,
            commands::connections::connect,
            commands::connections::disconnect,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::schema::list_schemas,
            commands::schema::introspect_schema,
            commands::schema::get_cached_schema,
            commands::schema::clear_schema_cache,
            commands::query::execute_query,
            commands::query::explain_query,
            commands::query::get_query_history,
            commands::query::clear_query_history,
            commands::performance::parse_explain_plan,
            commands::performance::get_table_stats,
            commands::performance::get_index_stats,
            commands::ai::check_ollama_status,
            commands::ai::ai_suggest,
            commands::ai::get_ai_history,
            commands::ai::accept_suggestion,
            commands::ai::clear_ai_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
