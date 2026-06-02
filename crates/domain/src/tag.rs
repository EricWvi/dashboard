use crate::{AuditFields, TagId};
use serde::{Deserialize, Serialize};

/// Represents a user-defined label that can be attached to entries and other content.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Tag {
    pub id: TagId,
    pub creator_id: i32,
    pub name: String,
    /// Logical grouping namespace for the tag. Stored as `t_group` in the schema.
    pub group: String,
    pub audit_fields: AuditFields,
}

impl Tag {
    /// Creates a tag snapshot together with its persistence-managed audit metadata.
    pub fn new(
        id: TagId,
        creator_id: i32,
        name: impl Into<String>,
        group: impl Into<String>,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            name: name.into(),
            group: group.into(),
            audit_fields,
        }
    }
}
