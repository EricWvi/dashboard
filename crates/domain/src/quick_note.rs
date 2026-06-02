use crate::{AuditFields, QuickNoteId, TiptapId};
use serde::{Deserialize, Serialize};

/// Represents a lightweight titled note with an optional display order and Tiptap draft.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct QuickNote {
    pub id: QuickNoteId,
    pub creator_id: i32,
    pub title: String,
    /// `None` when the zero-UUID sentinel is stored, meaning no draft is attached.
    pub draft: Option<TiptapId>,
    /// Display order hint; `None` means the note is unordered. Stored as `d_order` in the schema.
    pub order: Option<i32>,
    pub audit_fields: AuditFields,
}

impl QuickNote {
    /// Creates a quick note snapshot together with its persistence-managed audit metadata.
    pub fn new(
        id: QuickNoteId,
        creator_id: i32,
        title: impl Into<String>,
        draft: Option<TiptapId>,
        order: Option<i32>,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            title: title.into(),
            draft,
            order,
            audit_fields,
        }
    }
}
