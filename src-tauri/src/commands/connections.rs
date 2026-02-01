use tauri::State;

use crate::crypto::encryption::{decrypt, encrypt};
use crate::db::postgres;
use crate::error::AppError;
use crate::models::connection::{ConnectionDisplay, ConnectionInput, ConnectionRow, DecryptedConnection};
use crate::AppState;

#[tauri::command(rename_all = "camelCase")]
pub async fn list_connections(
    state: State<'_, AppState>,
) -> Result<Vec<ConnectionDisplay>, AppError> {
    let rows: Vec<ConnectionRow> =
        sqlx::query_as("SELECT * FROM connections ORDER BY name ASC")
            .fetch_all(&state.local_db)
            .await?;

    // Snapshot connected IDs and release mutex before decryption loop
    let connected_ids: std::collections::HashSet<String> = {
        let pg_pools = state.pg_pools.lock().await;
        pg_pools.keys().cloned().collect()
    };

    let key = &state.encryption_key;

    let mut connections = Vec::with_capacity(rows.len());
    for row in rows {
        let host = decrypt(key, &row.host).unwrap_or_else(|_| "***".into());
        let port_str = decrypt(key, &row.port).unwrap_or_else(|_| "5432".into());
        let port = port_str.parse::<u16>().unwrap_or(5432);
        let database = decrypt(key, &row.database).unwrap_or_else(|_| "***".into());
        let username = decrypt(key, &row.username).unwrap_or_else(|_| "***".into());

        connections.push(ConnectionDisplay {
            id: row.id.clone(),
            name: row.name,
            host,
            port,
            database,
            username,
            ssl_mode: row.ssl_mode,
            color: row.color,
            is_connected: connected_ids.contains(&row.id),
            created_at: row.created_at,
            updated_at: row.updated_at,
        });
    }

    Ok(connections)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_connection(
    input: ConnectionInput,
    state: State<'_, AppState>,
) -> Result<ConnectionDisplay, AppError> {
    let key = &state.encryption_key;
    let id = uuid::Uuid::new_v4().to_string();

    let enc_host = encrypt(key, &input.host)?;
    let enc_port = encrypt(key, &input.port.to_string())?;
    let enc_db = encrypt(key, &input.database)?;
    let enc_user = encrypt(key, &input.username)?;
    let enc_pass = encrypt(key, &input.password)?;
    let ssl_mode = input.ssl_mode.unwrap_or_else(|| "prefer".into());
    let color = input.color.unwrap_or_else(|| "#3b82f6".into());

    sqlx::query(
        "INSERT INTO connections (id, name, host, port, database, username, password, ssl_mode, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&input.name)
    .bind(&enc_host)
    .bind(&enc_port)
    .bind(&enc_db)
    .bind(&enc_user)
    .bind(&enc_pass)
    .bind(&ssl_mode)
    .bind(&color)
    .execute(&state.local_db)
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.message().contains("UNIQUE") {
                return AppError::ConnectionExists(input.name.clone());
            }
        }
        AppError::Database(e)
    })?;

    Ok(ConnectionDisplay {
        id,
        name: input.name,
        host: input.host,
        port: input.port,
        database: input.database,
        username: input.username,
        ssl_mode,
        color,
        is_connected: false,
        created_at: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        updated_at: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_connection(
    id: String,
    input: ConnectionInput,
    state: State<'_, AppState>,
) -> Result<ConnectionDisplay, AppError> {
    let key = &state.encryption_key;

    let enc_host = encrypt(key, &input.host)?;
    let enc_port = encrypt(key, &input.port.to_string())?;
    let enc_db = encrypt(key, &input.database)?;
    let enc_user = encrypt(key, &input.username)?;
    let ssl_mode = input.ssl_mode.unwrap_or_else(|| "prefer".into());
    let color = input.color.unwrap_or_else(|| "#3b82f6".into());

    // If password is empty, keep the existing encrypted password
    let result = if input.password.is_empty() {
        sqlx::query(
            "UPDATE connections SET name = ?, host = ?, port = ?, database = ?, username = ?, ssl_mode = ?, color = ?, updated_at = datetime('now')
             WHERE id = ?",
        )
        .bind(&input.name)
        .bind(&enc_host)
        .bind(&enc_port)
        .bind(&enc_db)
        .bind(&enc_user)
        .bind(&ssl_mode)
        .bind(&color)
        .bind(&id)
        .execute(&state.local_db)
        .await?
    } else {
        let enc_pass = encrypt(key, &input.password)?;
        sqlx::query(
            "UPDATE connections SET name = ?, host = ?, port = ?, database = ?, username = ?, password = ?, ssl_mode = ?, color = ?, updated_at = datetime('now')
             WHERE id = ?",
        )
        .bind(&input.name)
        .bind(&enc_host)
        .bind(&enc_port)
        .bind(&enc_db)
        .bind(&enc_user)
        .bind(&enc_pass)
        .bind(&ssl_mode)
        .bind(&color)
        .bind(&id)
        .execute(&state.local_db)
        .await?
    };

    if result.rows_affected() == 0 {
        return Err(AppError::ConnectionNotFound(id));
    }

    // Disconnect stale pool if connection details changed
    {
        let mut pg_pools = state.pg_pools.lock().await;
        if let Some(old_pool) = pg_pools.remove(&id) {
            old_pool.close().await;
        }
    }

    // Fetch the actual created_at from the database
    let row: Option<(String, String)> = sqlx::query_as(
        "SELECT created_at, updated_at FROM connections WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&state.local_db)
    .await?;
    let (created_at, updated_at) = row.unwrap_or_else(|| {
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        (now.clone(), now)
    });

    Ok(ConnectionDisplay {
        id,
        name: input.name,
        host: input.host,
        port: input.port,
        database: input.database,
        username: input.username,
        ssl_mode,
        color,
        is_connected: false,
        created_at,
        updated_at,
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_connection(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    // Disconnect if connected
    {
        let mut pg_pools = state.pg_pools.lock().await;
        if let Some(pool) = pg_pools.remove(&id) {
            pool.close().await;
        }
    }

    let result = sqlx::query("DELETE FROM connections WHERE id = ?")
        .bind(&id)
        .execute(&state.local_db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::ConnectionNotFound(id));
    }

    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn test_connection(
    input: ConnectionInput,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let _ = &state.encryption_key; // ensure state is valid

    let conn = DecryptedConnection {
        host: input.host,
        port: input.port,
        database: input.database,
        username: input.username,
        password: input.password,
        ssl_mode: input.ssl_mode.unwrap_or_else(|| "prefer".into()),
    };

    postgres::test_pg_connection(&conn).await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn connect(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let key = &state.encryption_key;

    let row: ConnectionRow = sqlx::query_as("SELECT * FROM connections WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.local_db)
        .await?
        .ok_or_else(|| AppError::ConnectionNotFound(id.clone()))?;

    let conn = DecryptedConnection {
        host: decrypt(key, &row.host)?,
        port: decrypt(key, &row.port)?.parse::<u16>().unwrap_or(5432),
        database: decrypt(key, &row.database)?,
        username: decrypt(key, &row.username)?,
        password: decrypt(key, &row.password)?,
        ssl_mode: row.ssl_mode,
    };

    let pool = postgres::create_pg_pool(&conn).await?;

    // Verify connection is alive
    sqlx::query("SELECT 1").execute(&pool).await?;

    // Close old pool if reconnecting
    let mut pg_pools = state.pg_pools.lock().await;
    if let Some(old_pool) = pg_pools.remove(&id) {
        old_pool.close().await;
    }
    pg_pools.insert(id, pool);

    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn disconnect(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let mut pg_pools = state.pg_pools.lock().await;

    if let Some(pool) = pg_pools.remove(&id) {
        pool.close().await;
        Ok(())
    } else {
        Err(AppError::NotConnected(id))
    }
}
