use thiserror::Error;

/// Errors that can occur during entry or related operations.
#[derive(Debug, Error)]
pub enum EntryError {
    #[error("entry not found: {id}")]
    NotFound { id: String },
    #[error("entry repository error: {message}")]
    EntryRepository { message: String },
}

/// Errors reported by the entry repository implementation.
#[derive(Debug, Clone, Error)]
pub enum EntryRepositoryError {
    #[error("operation failed: {0}")]
    OperationFailed(String),
}

impl From<EntryRepositoryError> for EntryError {
    fn from(e: EntryRepositoryError) -> Self {
        Self::EntryRepository {
            message: e.to_string(),
        }
    }
}
