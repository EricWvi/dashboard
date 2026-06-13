use only_cache_journal::JournalError;

#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("Journal database error: {0}")]
    Journal(#[from] JournalError),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Invalid date: {0}")]
    InvalidDate(String),
}
