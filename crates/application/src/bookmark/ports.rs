use std::future::Future;

use only_domain::{Bookmark, BookmarkId};

use crate::bookmark::error::BookmarkRepositoryError;

/// Persistence contract for bookmark operations.
///
/// Implementations must operate against the `d_bookmark_v2` table and must exclude
/// soft-deleted rows (`is_deleted = true`) from all reads.
pub trait BookmarkRepository: Send + Sync {
    /// Inserts a new bookmark and returns the stored snapshot.
    fn create(
        &self,
        bookmark: Bookmark,
    ) -> impl Future<Output = Result<Bookmark, BookmarkRepositoryError>> + Send;

    /// Loads one visible bookmark matching both id and creator.
    fn find_by_id_and_creator(
        &self,
        id: &BookmarkId,
        creator_id: i32,
    ) -> impl Future<Output = Result<Option<Bookmark>, BookmarkRepositoryError>> + Send;

    /// Lists all visible bookmarks for the creator, ordered by creation time descending.
    fn list_by_creator(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<Bookmark>, BookmarkRepositoryError>> + Send;

    /// Replaces all mutable bookmark fields and returns the updated snapshot.
    /// Returns `None` when no matching live bookmark exists for the given creator.
    fn update(
        &self,
        bookmark: Bookmark,
    ) -> impl Future<Output = Result<Option<Bookmark>, BookmarkRepositoryError>> + Send;

    /// Soft-deletes one bookmark by id and creator; returns `true` if a row was affected.
    fn soft_delete(
        &self,
        id: &BookmarkId,
        creator_id: i32,
        deleted_at: i64,
    ) -> impl Future<Output = Result<bool, BookmarkRepositoryError>> + Send;

    /// Increments the click counter; returns `true` if a row was affected.
    fn increment_click(
        &self,
        id: &BookmarkId,
        creator_id: i32,
        updated_at: i64,
    ) -> impl Future<Output = Result<bool, BookmarkRepositoryError>> + Send;
}
