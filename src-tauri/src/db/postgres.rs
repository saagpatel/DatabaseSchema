use sqlx::postgres::{PgConnectOptions, PgPool, PgPoolOptions, PgSslMode};

use crate::error::AppError;
use crate::models::connection::DecryptedConnection;

/// Create a PostgreSQL connection pool from decrypted connection details
pub async fn create_pg_pool(conn: &DecryptedConnection) -> Result<PgPool, AppError> {
    let ssl_mode = match conn.ssl_mode.as_str() {
        "disable" => PgSslMode::Disable,
        "require" => PgSslMode::Require,
        "verify-ca" => PgSslMode::VerifyCa,
        "verify-full" => PgSslMode::VerifyFull,
        _ => PgSslMode::Prefer,
    };

    let options = PgConnectOptions::new()
        .host(&conn.host)
        .port(conn.port)
        .database(&conn.database)
        .username(&conn.username)
        .password(&conn.password)
        .ssl_mode(ssl_mode);

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .connect_with(options)
        .await?;

    Ok(pool)
}

/// Test a PostgreSQL connection by running a simple query
pub async fn test_pg_connection(conn: &DecryptedConnection) -> Result<String, AppError> {
    let pool = create_pg_pool(conn).await?;

    let row: (String,) = sqlx::query_as("SELECT version()")
        .fetch_one(&pool)
        .await?;

    pool.close().await;

    Ok(row.0)
}
