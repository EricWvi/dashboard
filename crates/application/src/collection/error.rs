use thiserror::Error;

/// Errors that can occur during collection or related todo operations.
#[derive(Debug, Error)]
pub enum CollectionError {
    #[error("collection not found: {id}")]
    NotFound { id: String },
    #[error("collection repository error: {message}")]
    CollectionRepository { message: String },
    #[error("todo repository error: {message}")]
    TodoRepository { message: String },
}

/// Errors reported by the collection repository implementation.
#[derive(Debug, Clone, Error)]
pub enum CollectionRepositoryError {
    #[error("operation failed: {0}")]
    OperationFailed(String),
}

/// Errors reported by the todo repository implementation.
#[derive(Debug, Clone, Error)]
pub enum TodoRepositoryError {
    #[error("operation failed: {0}")]
    OperationFailed(String),
}

impl From<CollectionRepositoryError> for CollectionError {
    fn from(e: CollectionRepositoryError) -> Self {
        Self::CollectionRepository {
            message: e.to_string(),
        }
    }
}

impl From<TodoRepositoryError> for CollectionError {
    fn from(e: TodoRepositoryError) -> Self {
        Self::TodoRepository {
            message: e.to_string(),
        }
    }
}
