use crate::MediaId;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

/// Represents an uploaded media file tracked by the server, with a lazily refreshed presigned URL.
/// Timestamps use timezone-aware instants because the `d_media` table predates the BIGINT epoch
/// convention used by the v2 tables and stores `TIMESTAMP WITH TIME ZONE` values instead.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Media {
    pub id: MediaId,
    pub creator_id: i32,
    /// A shareable UUID link alias distinct from the storage key.
    pub link: Option<String>,
    /// The unique storage key identifying the object in the backing object store.
    pub key: String,
    pub presigned_url: Option<String>,
    /// Wall-clock time of the last presigned URL refresh, matching the `last_presigned_time` column.
    pub last_presigned_time: OffsetDateTime,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
    /// Non-null when the record has been soft-deleted.
    pub deleted_at: Option<OffsetDateTime>,
}

impl Media {
    /// Creates a media record snapshot from persistence-layer fields.
    pub fn new(
        id: MediaId,
        creator_id: i32,
        link: Option<String>,
        key: impl Into<String>,
        presigned_url: Option<String>,
        last_presigned_time: OffsetDateTime,
        created_at: OffsetDateTime,
        updated_at: OffsetDateTime,
        deleted_at: Option<OffsetDateTime>,
    ) -> Self {
        Self {
            id,
            creator_id,
            link,
            key: key.into(),
            presigned_url,
            last_presigned_time,
            created_at,
            updated_at,
            deleted_at,
        }
    }
}
