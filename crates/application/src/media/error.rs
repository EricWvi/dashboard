use thiserror::Error;

/// Errors produced by the object-store backend (upload, delete, presign operations).
#[derive(Debug, Error)]
pub enum ObjectStoreError {
    #[error("upload failed for key {key:?}: {source}")]
    Upload {
        key: String,
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("delete failed for key {key:?}: {source}")]
    Delete {
        key: String,
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("presign failed for key {key:?}: {source}")]
    Presign {
        key: String,
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}

/// Errors produced by the media persistence layer.
#[derive(Debug, Error)]
pub enum MediaRepositoryError {
    #[error("media record not found")]
    NotFound,

    #[error("database error: {source}")]
    Database {
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}

/// Application-level error combining object-store and repository failures.
#[derive(Debug, Error)]
pub enum MediaError {
    #[error("object store error: {0}")]
    ObjectStore(#[from] ObjectStoreError),

    #[error("repository error: {0}")]
    Repository(#[from] MediaRepositoryError),

    #[error("media not found")]
    NotFound,

    #[error("object key exceeds 1000-character limit: {key_len} chars")]
    KeyTooLong { key_len: usize },
}
