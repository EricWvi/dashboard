use serde::{Deserialize, Serialize};

/// Wire representation of a journal tag, version 1.
///
/// Both the Android local port and the server map their internal types to/from this struct.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TagSchemaV1 {
    pub id: String,
    pub creator_id: i32,
    pub name: String,
    /// Logical grouping namespace. Stored as `t_group` in the SQLite schema.
    pub group: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub server_version: i64,
    pub is_deleted: bool,
}
