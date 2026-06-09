use only_cache_sqlite::DatabaseError;
use thiserror::Error;

/// Describes failures that can occur during journal database operations.
#[derive(Debug, Error)]
pub enum JournalError {
    #[error("database error: {0}")]
    Database(#[from] DatabaseError),
    #[error("json serialization error: {0}")]
    Json(#[from] serde_json::Error),
}
