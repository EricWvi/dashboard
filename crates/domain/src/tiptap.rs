use crate::{AuditFields, TiptapId};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A single entry in the Tiptap document edit history.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub time: i64,
    pub content: Value,
}

/// Represents a Tiptap rich-text document, shared across multiple content types as a backing draft.
/// The `site` field is a SMALLINT code that identifies which surface owns the document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TiptapV2 {
    pub id: TiptapId,
    pub creator_id: i32,
    /// Numeric code identifying the owning surface. Interpretation is defined by the application layer.
    pub site: i16,
    pub content: Value,
    pub history: Vec<HistoryEntry>,
    pub audit_fields: AuditFields,
}

impl TiptapV2 {
    /// Creates a Tiptap document snapshot together with its persistence-managed audit metadata.
    pub fn new(
        id: TiptapId,
        creator_id: i32,
        site: i16,
        content: Value,
        history: Vec<HistoryEntry>,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            site,
            content,
            history,
            audit_fields,
        }
    }
}
