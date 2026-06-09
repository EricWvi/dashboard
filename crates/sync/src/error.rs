use crate::schema::SchemaDescriptor;

/// All errors that can arise from sync operations.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum SyncError {
    /// The server rejected one or more schema versions declared by this build.
    /// The app should halt and prevent further sync operations.
    #[error("schema unsupported: {schemas:?}")]
    SchemaUnsupported { schemas: Vec<SchemaDescriptor> },

    /// An HTTP or network-level failure occurred communicating with the server.
    #[error("transport error: {0}")]
    Transport(String),

    /// A SQLite or local-persistence failure occurred.
    #[error("local storage error: {0}")]
    Local(String),
}
