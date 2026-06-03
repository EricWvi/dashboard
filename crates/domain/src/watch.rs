use crate::{AuditFields, WatchId};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Represents a film, series, or other watchable item tracked by the user.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Watch {
    pub id: WatchId,
    pub creator_id: i32,
    /// Free-form media type classifier stored in the `w_type` column.
    pub watch_type: String,
    pub title: String,
    /// Watch progress status string (e.g. "To Watch", "Watching", "Watched").
    pub status: String,
    /// Release year; `None` when unset (the schema uses 2099 as a sentinel default).
    pub year: Option<i32>,
    /// User rating; `None` when unrated.
    pub rate: Option<i32>,
    pub payload: Value,
    pub author: String,
    pub audit_fields: AuditFields,
}

impl Watch {
    /// Creates a watch entry snapshot together with its persistence-managed audit metadata.
    pub fn new(
        id: WatchId,
        creator_id: i32,
        watch_type: impl Into<String>,
        title: impl Into<String>,
        status: impl Into<String>,
        year: Option<i32>,
        rate: Option<i32>,
        payload: Value,
        author: impl Into<String>,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            watch_type: watch_type.into(),
            title: title.into(),
            status: status.into(),
            year,
            rate,
            payload,
            author: author.into(),
            audit_fields,
        }
    }
}
