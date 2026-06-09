use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Wire representation of a journal entry, version 1.
///
/// Both the Android local port and the server map their internal types to/from this struct.
/// The local port maps SQLite rows to `EntrySchemaV1` for push and stores incoming instances
/// back to SQLite during pull; the server maps its domain `Entry` accordingly.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EntrySchemaV1 {
    pub id: String,
    pub creator_id: i32,
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
