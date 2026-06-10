use std::future::Future;

use only_domain::Tag;

use crate::tag::error::TagRepositoryError;

/// Persistence contract for user-defined tag operations.
///
/// Implementations must operate against the `d_tag_v2` table and must exclude
/// soft-deleted rows (`is_deleted = true`) from all reads.
pub trait TagRepository: Send + Sync {
    /// Inserts a new tag and returns the stored snapshot.
    fn create(&self, tag: Tag) -> impl Future<Output = Result<Tag, TagRepositoryError>> + Send;

    /// Lists all visible tags for the given creator and group, ordered by creation time.
    fn list_by_creator_and_group(
        &self,
        creator_id: i32,
        group: &str,
    ) -> impl Future<Output = Result<Vec<Tag>, TagRepositoryError>> + Send;

    /// Soft-deletes a tag by name and group for the given creator.
    /// Returns `true` if at least one row was affected.
    fn soft_delete_by_name_and_group(
        &self,
        creator_id: i32,
        name: &str,
        group: &str,
        deleted_at: i64,
    ) -> impl Future<Output = Result<bool, TagRepositoryError>> + Send;
}
