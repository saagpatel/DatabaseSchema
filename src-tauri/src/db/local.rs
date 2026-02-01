use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions};
use std::path::Path;
use std::str::FromStr;

use crate::error::AppError;

/// Initialize SQLite database with WAL mode and run migrations
pub async fn init_local_db(db_path: &Path) -> Result<SqlitePool, AppError> {
    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
    let options = SqliteConnectOptions::from_str(&db_url)?
        .journal_mode(SqliteJournalMode::Wal)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    // Enable foreign key enforcement
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await?;

    // Run migrations
    run_migrations(&pool).await?;

    Ok(pool)
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), AppError> {
    let migration_sql = include_str!("../../migrations/001_initial.sql");
    sqlx::raw_sql(migration_sql).execute(pool).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_init_local_db() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let pool = init_local_db(&db_path).await.unwrap();

        // Verify tables exist
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM settings")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(result.0 > 0, "Settings should have default values");

        pool.close().await;
    }

    #[tokio::test]
    async fn test_default_settings_populated() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let pool = init_local_db(&db_path).await.unwrap();

        let row: (String,) = sqlx::query_as("SELECT value FROM settings WHERE key = 'theme'")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row.0, "system");

        pool.close().await;
    }

    #[tokio::test]
    async fn test_foreign_keys_enabled() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let pool = init_local_db(&db_path).await.unwrap();

        let row: (i64,) = sqlx::query_as("PRAGMA foreign_keys")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row.0, 1, "Foreign keys should be enabled");

        pool.close().await;
    }

    #[tokio::test]
    async fn test_idempotent_migrations() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        // Run init twice to verify idempotency
        let pool = init_local_db(&db_path).await.unwrap();
        pool.close().await;

        let pool = init_local_db(&db_path).await.unwrap();
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM settings")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(row.0 > 0, "Settings should still have default values after re-init");

        pool.close().await;
    }
}
