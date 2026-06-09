use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Wire representation of a journal entry, version 1.
///
/// Mapped to/from by both the Android local port and the server. Creator identity is
/// resolved server-side from the auth token and is never part of the wire format.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EntrySchemaV1 {
    pub id: String,
    /// UUID of the attached Tiptap draft, or `None` when no draft is associated.
    pub draft: Option<String>,
    pub payload: Value,
    pub word_count: i32,
    pub raw_text: String,
    pub bookmark: bool,
    pub review_count: i32,
    pub created_at: i64,
    pub updated_at: i64,
    pub server_version: i64,
    pub is_deleted: bool,
}
