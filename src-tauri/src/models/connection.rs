use serde::{Deserialize, Serialize};

/// What the frontend sends when creating/updating a connection
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInput {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub ssl_mode: Option<String>,
    pub color: Option<String>,
}

/// What's stored in SQLite (all encrypted fields are base64-encoded ciphertext)
#[derive(Debug, sqlx::FromRow)]
pub struct ConnectionRow {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: String,
    pub database: String,
    pub username: String,
    pub password: String,
    pub ssl_mode: String,
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
}

/// What the frontend receives (decrypted display fields, no password)
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDisplay {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub ssl_mode: String,
    pub color: String,
    pub is_connected: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Fully decrypted connection for internal use (building PgPool)
pub struct DecryptedConnection {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub ssl_mode: String,
}
