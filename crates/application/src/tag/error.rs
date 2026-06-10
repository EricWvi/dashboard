use thiserror::Error;

/// Errors that can occur during tag operations.
#[derive(Debug, Error)]
pub enum TagError {
    #[error("tag repository error: {message}")]
    TagRepository { message: String },
}

/// Errors reported by the tag repository implementation.
#[derive(Debug, Clone, Error)]
pub enum TagRepositoryError {
    #[error("operation failed: {0}")]
    OperationFailed(String),
}

impl From<TagRepositoryError> for TagError {
    fn from(e: TagRepositoryError) -> Self {
        Self::TagRepository {
            message: e.to_string(),
        }
    }
}
