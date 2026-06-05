use std::future::Future;

use only_domain::{Collection, CollectionId, Todo, TodoId};

use crate::collection::error::{CollectionRepositoryError, TodoRepositoryError};

/// Persistence contract for collection CRUD operations.
///
/// Implementations must operate against the `d_collection_v2` table and must exclude
/// soft-deleted rows (`is_deleted = true`) from all reads.
pub trait CollectionRepository: Send + Sync {
    /// Inserts a new collection and returns the stored snapshot.
    fn create(
        &self,
        collection: Collection,
    ) -> impl Future<Output = Result<Collection, CollectionRepositoryError>> + Send;

    /// Loads one visible collection matching both id and creator.
    fn find_by_id_and_creator(
        &self,
        id: &CollectionId,
        creator_id: i32,
    ) -> impl Future<Output = Result<Option<Collection>, CollectionRepositoryError>> + Send;

    /// Lists every visible collection for the given creator, ordered by creation time ascending.
    fn list_by_creator(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<Collection>, CollectionRepositoryError>> + Send;

    /// Replaces the mutable fields of an existing collection and returns the updated snapshot.
    fn update(
        &self,
        collection: Collection,
    ) -> impl Future<Output = Result<Collection, CollectionRepositoryError>> + Send;

    /// Soft-deletes one collection by id and creator; returns true if a row was affected.
    fn soft_delete_by_id_and_creator(
        &self,
        id: &CollectionId,
        creator_id: i32,
        deleted_at: i64,
    ) -> impl Future<Output = Result<bool, CollectionRepositoryError>> + Send;
}

/// Persistence contract for todo operations within the collection context.
///
/// Implementations must operate against the `d_todo_v2` table and must exclude
/// soft-deleted rows from all reads.
pub trait TodoRepository: Send + Sync {
    /// Lists all incomplete, non-inbox todos for the creator whose schedule is either unset
    /// or before the far-future sentinel, ordered by the server's storage order.
    fn list_all_planned(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<Todo>, TodoRepositoryError>> + Send;

    /// Lists todos scheduled for the current local day (start-of-day <= schedule < end-of-day).
    fn list_today(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<Todo>, TodoRepositoryError>> + Send;

    /// Updates the schedule field to `schedule_ms` for the given incomplete todo IDs owned by creator.
    fn set_schedule_for_ids(
        &self,
        ids: &[TodoId],
        schedule_ms: i64,
        creator_id: i32,
    ) -> impl Future<Output = Result<(), TodoRepositoryError>> + Send;

    /// Soft-deletes all todos belonging to the given collection and creator.
    fn soft_delete_by_collection(
        &self,
        collection_id: &CollectionId,
        creator_id: i32,
        deleted_at: i64,
    ) -> impl Future<Output = Result<(), TodoRepositoryError>> + Send;
}
