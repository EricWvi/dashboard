use serde::{Deserialize, Serialize};

/// Wire representation of a tag, version 1.
///
/// Shared across apps that have a tag concept. Creator identity is resolved server-side.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TagSchemaV1 {
    pub id: String,
    pub name: String,
    /// Logical grouping namespace. Stored as `t_group` in the SQLite schema.
    pub group: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub server_version: i64,
    pub is_deleted: bool,
}
