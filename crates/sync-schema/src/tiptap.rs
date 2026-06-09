use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A single revision captured in the Tiptap document's edit history.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HistoryEntryV1 {
    pub time: i64,
    pub content: Value,
}

/// Wire representation of a Tiptap rich-text document, version 1.
///
/// Mapped to/from by both the Android local port and the server. Creator identity is
/// resolved server-side; the owning surface (journal, flomo, etc.) is an app-layer concern
/// and is not part of the wire format.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TiptapSchemaV1 {
    pub id: String,
    pub content: Value,
    pub history: Vec<HistoryEntryV1>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
}
