use serde::{Deserialize, Serialize};

/// Carries persistence-managed audit and sync fields shared by every local-first v2 entity.
/// `server_version` is assigned by the global sequence trigger on every insert or update.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuditFields {
    pub created_at: i64,
    pub updated_at: i64,
    pub server_version: i64,
    pub is_deleted: bool,
}

impl AuditFields {
    /// Creates audit metadata using Unix timestamps in milliseconds, the last known server sync
    /// version, and a soft-delete flag.
    pub fn new(created_at: i64, updated_at: i64, server_version: i64, is_deleted: bool) -> Self {
        Self {
            created_at,
            updated_at,
            server_version,
            is_deleted,
        }
    }
}
