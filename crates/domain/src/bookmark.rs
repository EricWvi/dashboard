use crate::{AuditFields, BookmarkId};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Represents a saved URL bookmark with visit tracking and extensible metadata.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Bookmark {
    pub id: BookmarkId,
    pub creator_id: i32,
    pub url: String,
    pub title: String,
    /// Cumulative click count used for popularity ranking.
    pub click: i32,
    pub domain: String,
    pub payload: Value,
    pub audit_fields: AuditFields,
}

impl Bookmark {
    /// Creates a bookmark snapshot together with its persistence-managed audit metadata.
    pub fn new(
        id: BookmarkId,
        creator_id: i32,
        url: impl Into<String>,
        title: impl Into<String>,
        click: i32,
        domain: impl Into<String>,
        payload: Value,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            url: url.into(),
            title: title.into(),
            click,
            domain: domain.into(),
            payload,
            audit_fields,
        }
    }
}
