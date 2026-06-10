use thiserror::Error;

/// Errors that can occur during Tiptap document or quick note operations.
#[derive(Debug, Error)]
pub enum TiptapError {
    #[error("tiptap document not found: {id}")]
    NotFound { id: String },
    #[error("history entry not found for timestamp: {ts}")]
    HistoryNotFound { ts: i64 },
    #[error("tiptap repository error: {message}")]
    TiptapRepository { message: String },
    #[error("quick note not found: {id}")]
    QuickNoteNotFound { id: String },
    #[error("quick note repository error: {message}")]
    QuickNoteRepository { message: String },
}

/// Errors reported by the Tiptap repository implementation.
#[derive(Debug, Clone, Error)]
pub enum TiptapRepositoryError {
    #[error("operation failed: {0}")]
    OperationFailed(String),
}

/// Errors reported by the quick note repository implementation.
#[derive(Debug, Clone, Error)]
pub enum QuickNoteRepositoryError {
    #[error("operation failed: {0}")]
    OperationFailed(String),
}

impl From<TiptapRepositoryError> for TiptapError {
    fn from(e: TiptapRepositoryError) -> Self {
        Self::TiptapRepository {
            message: e.to_string(),
        }
    }
}

impl From<QuickNoteRepositoryError> for TiptapError {
    fn from(e: QuickNoteRepositoryError) -> Self {
        Self::QuickNoteRepository {
            message: e.to_string(),
        }
    }
}
