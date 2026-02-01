use tauri::State;

use crate::db::introspect;
use crate::error::AppError;
use crate::models::schema::SchemaInfo;
use crate::AppState;

#[tauri::command(rename_all = "camelCase")]
pub async fn list_schemas(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, AppError> {
    let pool = {
        let pg_pools = state.pg_pools.lock().await;
        pg_pools
            .get(&connection_id)
            .cloned()
            .ok_or_else(|| AppError::NotConnected(connection_id))?
    };

    introspect::list_schemas(&pool).await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn introspect_schema(
    connection_id: String,
    schema_name: String,
    state: State<'_, AppState>,
) -> Result<SchemaInfo, AppError> {
    let schema_info = {
        let pool = {
            let pg_pools = state.pg_pools.lock().await;
            pg_pools
                .get(&connection_id)
                .cloned()
                .ok_or_else(|| AppError::NotConnected(connection_id.clone()))?
        };

        introspect::introspect_schema(&pool, &schema_name).await?
    };

    // Cache the result
    let cache_data = serde_json::to_string(&schema_info)
        .map_err(|e| AppError::General(format!("Serialize error: {e}")))?;
    let cache_id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO schema_cache (id, connection_id, schema_name, cache_data, cached_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(connection_id, schema_name) DO UPDATE SET
            cache_data = excluded.cache_data,
            cached_at = excluded.cached_at",
    )
    .bind(&cache_id)
    .bind(&connection_id)
    .bind(&schema_name)
    .bind(&cache_data)
    .execute(&state.local_db)
    .await?;

    Ok(schema_info)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_cached_schema(
    connection_id: String,
    schema_name: String,
    state: State<'_, AppState>,
) -> Result<Option<SchemaInfo>, AppError> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT cache_data FROM schema_cache
         WHERE connection_id = ? AND schema_name = ?",
    )
    .bind(&connection_id)
    .bind(&schema_name)
    .fetch_optional(&state.local_db)
    .await?;

    match row {
        Some((data,)) => {
            let schema_info: SchemaInfo = serde_json::from_str(&data)
                .map_err(|e| AppError::General(format!("Deserialize error: {e}")))?;
            Ok(Some(schema_info))
        }
        None => Ok(None),
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn clear_schema_cache(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM schema_cache WHERE connection_id = ?")
        .bind(&connection_id)
        .execute(&state.local_db)
        .await?;

    Ok(())
}
