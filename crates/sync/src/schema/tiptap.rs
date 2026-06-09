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
/// Both the Android local port and the server map their internal types to/from this struct.
/// `site` is a numeric code identifying the owning surface (e.g., journal).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TiptapSchemaV1 {
    pub id: String,
    pub creator_id: i32,
    /// Numeric code identifying the owning surface. Interpretation is defined by the app layer.
    pub site: i16,
    pub content: Value,
    pub history: Vec<HistoryEntryV1>,
    pub created_at: i64,
    pub updated_at: i64,
    pub server_version: i64,
    pub is_deleted: bool,
}
