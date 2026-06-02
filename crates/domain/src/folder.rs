use crate::{AuditFields, FolderId};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Represents a hierarchical folder that can contain cards and other folders.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Folder {
    pub id: FolderId,
    pub creator_id: i32,
    /// `None` when the zero-UUID sentinel is stored, meaning the folder is at the root level.
    pub parent_id: Option<FolderId>,
    pub title: String,
    pub payload: Value,
    /// Mapped from the SMALLINT `is_bookmarked` column (0 = false, non-zero = true).
    pub is_bookmarked: bool,
    /// Mapped from the SMALLINT `is_archived` column (0 = false, non-zero = true).
    pub is_archived: bool,
    pub audit_fields: AuditFields,
}

impl Folder {
    /// Creates a folder snapshot together with its persistence-managed audit metadata.
    pub fn new(
        id: FolderId,
        creator_id: i32,
        parent_id: Option<FolderId>,
        title: impl Into<String>,
        payload: Value,
        is_bookmarked: bool,
        is_archived: bool,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            parent_id,
            title: title.into(),
            payload,
            is_bookmarked,
            is_archived,
            audit_fields,
        }
    }
}
