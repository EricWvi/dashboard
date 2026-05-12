use thiserror::Error;

#[derive(Debug, Error)]
pub enum JournalError {
    #[error(transparent)]
    Database(#[from] app_sqlite::DatabaseError),
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error(transparent)]
    Request(#[from] reqwest::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Message(String),
}
