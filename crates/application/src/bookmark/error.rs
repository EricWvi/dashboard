use thiserror::Error;

/// Errors that can occur during bookmark operations.
#[derive(Debug, Error)]
pub enum BookmarkError {
    #[error("bookmark not found: {id}")]
    NotFound { id: String },
    #[error("bookmark repository error: {message}")]
    BookmarkRepository { message: String },
}

/// Errors reported by the bookmark repository implementation.
#[derive(Debug, Clone, Error)]
pub enum BookmarkRepositoryError {
    #[error("operation failed: {0}")]
    OperationFailed(String),
}

impl From<BookmarkRepositoryError> for BookmarkError {
    fn from(e: BookmarkRepositoryError) -> Self {
        Self::BookmarkRepository {
            message: e.to_string(),
        }
    }
}
