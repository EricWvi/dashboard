use crate::{AuditFields, CardId, FolderId, TiptapId};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Represents a knowledge card that may live inside a folder and be backed by a Tiptap document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Card {
    pub id: CardId,
    pub creator_id: i32,
    /// `None` when the zero-UUID sentinel is stored, meaning the card is at the root level.
    pub folder_id: Option<FolderId>,
    pub title: String,
    pub draft: TiptapId,
    pub payload: Value,
    pub raw_text: String,
    /// Mapped from the SMALLINT `is_bookmarked` column (0 = false, non-zero = true).
    pub is_bookmarked: bool,
    /// Mapped from the SMALLINT `is_archived` column (0 = false, non-zero = true).
    pub is_archived: bool,
    pub review_count: i32,
    pub audit_fields: AuditFields,
}

impl Card {
    /// Creates a card snapshot together with its persistence-managed audit metadata.
    pub fn new(
        id: CardId,
        creator_id: i32,
        folder_id: Option<FolderId>,
        title: impl Into<String>,
        draft: TiptapId,
        payload: Value,
        raw_text: impl Into<String>,
        is_bookmarked: bool,
        is_archived: bool,
        review_count: i32,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            folder_id,
            title: title.into(),
            draft,
            payload,
            raw_text: raw_text.into(),
            is_bookmarked,
            is_archived,
            review_count,
            audit_fields,
        }
    }
}
