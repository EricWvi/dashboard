use thiserror::Error;

/// Errors that can occur during user lookup or creation.
#[derive(Debug, Error)]
pub enum UserError {
    #[error("user repository error: {message}")]
    Repository { message: String },
}

/// Errors reported by the user repository implementation.
#[derive(Debug, Error)]
pub enum UserRepositoryError {
    #[error("operation failed: {0}")]
    OperationFailed(String),
}
