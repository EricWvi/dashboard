use crate::MediaId;
use serde::{Deserialize, Serialize};

/// Represents an uploaded media file tracked by the server, with a lazily refreshed presigned URL.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Media {
    pub id: MediaId,
    pub creator_id: i32,
    /// A shareable UUID link alias distinct from the storage key.
    pub link: Option<String>,
    /// The unique storage key identifying the object in the backing object store.
    pub key: String,
    pub presigned_url: Option<String>,
    /// Unix timestamp (ms) of the last presigned URL refresh.
    pub last_presigned_at: i64,
    pub created_at: i64,
    pub updated_at: i64,
    /// Non-null when the record has been soft-deleted.
    pub deleted_at: Option<i64>,
}

impl Media {
    /// Creates a media record snapshot from persistence-layer fields.
    pub fn new(
        id: MediaId,
        creator_id: i32,
        link: Option<String>,
        key: impl Into<String>,
        presigned_url: Option<String>,
        last_presigned_at: i64,
        created_at: i64,
        updated_at: i64,
        deleted_at: Option<i64>,
    ) -> Self {
        Self {
            id,
            creator_id,
            link,
            key: key.into(),
            presigned_url,
            last_presigned_at,
            created_at,
            updated_at,
            deleted_at,
        }
    }
}
