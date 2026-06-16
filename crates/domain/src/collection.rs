use crate::{AuditFields, CollectionId, UserId};
use serde::{Deserialize, Serialize};

/// Represents a named collection used to group todo items.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Collection {
    pub id: CollectionId,
    pub creator_id: UserId,
    pub name: String,
    pub audit_fields: AuditFields,
}

impl Collection {
    /// Creates a collection snapshot together with its persistence-managed audit metadata.
    pub fn new(
        id: CollectionId,
        creator_id: UserId,
        name: impl Into<String>,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            name: name.into(),
            audit_fields,
        }
    }
}
