use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Connection not found: {0}")]
    ConnectionNotFound(String),

    #[error("Connection already exists with name: {0}")]
    ConnectionExists(String),

    #[error("Not connected: {0}")]
    NotConnected(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    General(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
