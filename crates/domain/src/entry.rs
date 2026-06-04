use crate::{AuditFields, EntryId, TiptapId};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Represents a journal entry with full-text search support and an optional Tiptap draft.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Entry {
    pub id: EntryId,
    pub creator_id: i32,
    /// `None` when the zero-UUID sentinel is stored, meaning no draft is attached.
    pub draft: Option<TiptapId>,
    pub payload: Value,
    pub word_count: i32,
    pub raw_text: String,
    pub bookmark: bool,
    pub review_count: i32,
    pub audit_fields: AuditFields,
}

impl Entry {
    /// Creates an entry snapshot together with its persistence-managed audit metadata.
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        id: EntryId,
        creator_id: i32,
        draft: Option<TiptapId>,
        payload: Value,
        word_count: i32,
        raw_text: impl Into<String>,
        bookmark: bool,
        review_count: i32,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            draft,
            payload,
            word_count,
            raw_text: raw_text.into(),
            bookmark,
            review_count,
            audit_fields,
        }
    }
}
