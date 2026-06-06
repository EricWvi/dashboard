use std::future::Future;

use only_domain::{Media, MediaId};
use time::OffsetDateTime;

use crate::media::error::MediaRepositoryError;

/// Carries the fields required to persist a new media upload.
pub struct NewMedia {
    pub creator_id: i32,
    /// Optional UUID link alias; when `None` the database generates one.
    pub link: Option<String>,
    pub key: String,
    pub presigned_url: Option<String>,
    pub last_presigned_time: OffsetDateTime,
}

/// Persistence contract for the `d_media` table.
///
/// Implementations must handle soft-deletion via the `deleted_at` column and must never
/// return soft-deleted rows unless the method explicitly requests them.
/// The explicit `+ Send` bound on each returned future makes the trait usable inside
/// the `BoxFuture` required by the scheduler's `Job` trait.
pub trait MediaRepository: Send + Sync {
    /// Inserts a new media record and returns the full persisted row.
    fn create(
        &self,
        media: &NewMedia,
    ) -> impl Future<Output = Result<Media, MediaRepositoryError>> + Send;

    /// Finds an active (non-deleted) media record by its link UUID, regardless of creator.
    fn find_by_link(
        &self,
        link: &str,
    ) -> impl Future<Output = Result<Option<Media>, MediaRepositoryError>> + Send;

    /// Finds an active (non-deleted) media record by its link UUID, scoped to the given creator.
    fn find_by_link_owned(
        &self,
        link: &str,
        creator_id: i32,
    ) -> impl Future<Output = Result<Option<Media>, MediaRepositoryError>> + Send;

    /// Lists all active media records for a given creator.
    fn list_by_creator(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<Media>, MediaRepositoryError>> + Send;

    /// Soft-deletes a media record owned by `creator_id`.
    fn soft_delete(
        &self,
        id: MediaId,
        creator_id: i32,
    ) -> impl Future<Output = Result<(), MediaRepositoryError>> + Send;

    /// Returns active media whose presigned URL was last refreshed before `cutoff`.
    fn find_expired_presigns(
        &self,
        cutoff: OffsetDateTime,
    ) -> impl Future<Output = Result<Vec<Media>, MediaRepositoryError>> + Send;

    /// Updates the presigned URL and its refresh timestamp for a media record.
    fn update_presigned_url(
        &self,
        id: MediaId,
        url: String,
        refreshed_at: OffsetDateTime,
    ) -> impl Future<Output = Result<(), MediaRepositoryError>> + Send;
}

impl<R: MediaRepository + ?Sized> MediaRepository for std::sync::Arc<R> {
    fn create(
        &self,
        media: &NewMedia,
    ) -> impl Future<Output = Result<Media, MediaRepositoryError>> + Send {
        (**self).create(media)
    }

    fn find_by_link(
        &self,
        link: &str,
    ) -> impl Future<Output = Result<Option<Media>, MediaRepositoryError>> + Send {
        (**self).find_by_link(link)
    }

    fn find_by_link_owned(
        &self,
        link: &str,
        creator_id: i32,
    ) -> impl Future<Output = Result<Option<Media>, MediaRepositoryError>> + Send {
        (**self).find_by_link_owned(link, creator_id)
    }

    fn list_by_creator(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<Media>, MediaRepositoryError>> + Send {
        (**self).list_by_creator(creator_id)
    }

    fn soft_delete(
        &self,
        id: MediaId,
        creator_id: i32,
    ) -> impl Future<Output = Result<(), MediaRepositoryError>> + Send {
        (**self).soft_delete(id, creator_id)
    }

    fn find_expired_presigns(
        &self,
        cutoff: OffsetDateTime,
    ) -> impl Future<Output = Result<Vec<Media>, MediaRepositoryError>> + Send {
        (**self).find_expired_presigns(cutoff)
    }

    fn update_presigned_url(
        &self,
        id: MediaId,
        url: String,
        refreshed_at: OffsetDateTime,
    ) -> impl Future<Output = Result<(), MediaRepositoryError>> + Send {
        (**self).update_presigned_url(id, url, refreshed_at)
    }
}
