use std::future::Future;

use only_domain::{QuickNote, QuickNoteId, TiptapId, TiptapV2};
use serde_json::Value;

use crate::tiptap::error::{QuickNoteRepositoryError, TiptapRepositoryError};

/// Persistence contract for Tiptap document operations.
///
/// Implementations must operate against the `d_tiptap_v2` table and must exclude
/// soft-deleted rows from all reads.
pub trait TiptapRepository: Send + Sync {
    /// Inserts a new Tiptap document and returns the stored snapshot.
    fn create(
        &self,
        tiptap: TiptapV2,
    ) -> impl Future<Output = Result<TiptapV2, TiptapRepositoryError>> + Send;

    /// Loads one visible Tiptap document matching both id and creator.
    fn find_by_id_and_creator(
        &self,
        id: &TiptapId,
        creator_id: i32,
    ) -> impl Future<Output = Result<Option<TiptapV2>, TiptapRepositoryError>> + Send;

    /// Atomically backs up the current content into `history`, then replaces `content`
    /// and `updated_at` with the new values.
    /// Returns `None` when no matching live document exists for the given creator.
    fn update_content(
        &self,
        id: &TiptapId,
        creator_id: i32,
        content: Value,
        updated_at: i64,
    ) -> impl Future<Output = Result<Option<TiptapV2>, TiptapRepositoryError>> + Send;
}

/// Persistence contract for quick note operations.
///
/// Implementations must operate against the `d_quick_note_v2` table and must exclude
/// soft-deleted rows from all reads.
pub trait QuickNoteRepository: Send + Sync {
    /// Inserts a new quick note and returns the stored snapshot.
    fn create(
        &self,
        note: QuickNote,
    ) -> impl Future<Output = Result<QuickNote, QuickNoteRepositoryError>> + Send;

    /// Lists all visible quick notes for the creator, ordered by `d_order` descending.
    fn list_by_creator(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<QuickNote>, QuickNoteRepositoryError>> + Send;

    /// Returns the maximum `d_order` value among all live quick notes for the creator,
    /// or `0` when no notes exist.
    fn max_order(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<i32, QuickNoteRepositoryError>> + Send;

    /// Returns the minimum `d_order` value among all live quick notes for the creator,
    /// or `0` when no notes exist.
    fn min_order(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<i32, QuickNoteRepositoryError>> + Send;

    /// Replaces the mutable fields of an existing quick note.
    /// Returns `None` when no matching live note exists for the given creator.
    fn update(
        &self,
        note: QuickNote,
    ) -> impl Future<Output = Result<Option<QuickNote>, QuickNoteRepositoryError>> + Send;

    /// Updates only the `d_order` field; returns `true` if a row was affected.
    fn set_order(
        &self,
        id: &QuickNoteId,
        creator_id: i32,
        order: i32,
        updated_at: i64,
    ) -> impl Future<Output = Result<bool, QuickNoteRepositoryError>> + Send;

    /// Soft-deletes one quick note by id and creator; returns `true` if a row was affected.
    fn soft_delete(
        &self,
        id: &QuickNoteId,
        creator_id: i32,
        deleted_at: i64,
    ) -> impl Future<Output = Result<bool, QuickNoteRepositoryError>> + Send;
}
