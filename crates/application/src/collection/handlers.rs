use only_contracts::{
    CollectionView, CreateCollectionRequest, CreateCollectionResponse, DeleteCollectionResponse,
    GetCollectionResponse, ListAllTodosResponse, ListCollectionsResponse, ListTodayTodosResponse,
    PlanTodayRequest, PlanTodayResponse, TodoView, UpdateCollectionRequest,
    UpdateCollectionResponse,
};
use only_domain::{AuditFields, Collection, CollectionId, TodoId};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::collection::error::CollectionError;
use crate::collection::ports::{CollectionRepository, TodoRepository};

/// Returns the current Unix timestamp in milliseconds, preferring local time.
fn now_millis() -> i64 {
    OffsetDateTime::now_local()
        .unwrap_or_else(|_| OffsetDateTime::now_utc())
        .unix_timestamp_nanos() as i64
        / 1_000_000
}

/// Maps a domain collection to its public contract view.
fn map_collection(c: only_domain::Collection) -> CollectionView {
    CollectionView {
        id: c.id.to_string(),
        name: c.name,
        created_at: c.audit_fields.created_at,
        updated_at: c.audit_fields.updated_at,
    }
}

/// Maps a domain todo to its public contract view.
fn map_todo(t: only_domain::Todo) -> TodoView {
    TodoView {
        id: t.id.to_string(),
        title: t.title,
        completed: t.completed,
        collection_id: t.collection_id.map(|id| id.to_string()),
        difficulty: t.difficulty,
        order: t.order,
        link: t.link,
        draft: t.draft.map(|id| id.to_string()),
        schedule: t.schedule,
        done: t.done,
        count: t.count,
        kanban: t.kanban,
        created_at: t.audit_fields.created_at,
        updated_at: t.audit_fields.updated_at,
    }
}

/// Handles collection creation without depending on transport-specific concerns.
pub struct CreateCollectionHandler<R> {
    repository: R,
}

impl<R> CreateCollectionHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: CollectionRepository> CreateCollectionHandler<R> {
    /// Creates a new collection record and returns the public response payload.
    pub async fn handle(
        &self,
        request: CreateCollectionRequest,
        creator_id: i32,
    ) -> Result<CreateCollectionResponse, CollectionError> {
        let now = now_millis();
        let id = CollectionId::new(Uuid::new_v4().to_string());
        let collection = Collection::new(
            id,
            creator_id,
            request.name,
            AuditFields::new(now, now, 0, false),
        );
        let collection = self.repository.create(collection).await?;
        Ok(CreateCollectionResponse {
            collection: map_collection(collection),
        })
    }
}

/// Handles a single collection fetch without depending on transport-specific concerns.
pub struct GetCollectionHandler<R> {
    repository: R,
}

impl<R> GetCollectionHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: CollectionRepository> GetCollectionHandler<R> {
    /// Loads one visible collection or returns a stable not-found error.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<GetCollectionResponse, CollectionError> {
        let collection_id = CollectionId::new(id);
        let collection = self
            .repository
            .find_by_id_and_creator(&collection_id, creator_id)
            .await?;
        match collection {
            Some(c) => Ok(GetCollectionResponse {
                collection: map_collection(c),
            }),
            None => Err(CollectionError::NotFound { id: id.to_string() }),
        }
    }
}

/// Handles collection listing without depending on transport-specific concerns.
pub struct ListCollectionsHandler<R> {
    repository: R,
}

impl<R> ListCollectionsHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: CollectionRepository> ListCollectionsHandler<R> {
    /// Lists every visible collection for the authenticated user.
    pub async fn handle(
        &self,
        creator_id: i32,
    ) -> Result<ListCollectionsResponse, CollectionError> {
        let collections = self.repository.list_by_creator(creator_id).await?;
        Ok(ListCollectionsResponse {
            collections: collections.into_iter().map(map_collection).collect(),
        })
    }
}

/// Handles collection updates without depending on transport-specific concerns.
pub struct UpdateCollectionHandler<R> {
    repository: R,
}

impl<R> UpdateCollectionHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: CollectionRepository> UpdateCollectionHandler<R> {
    /// Replaces the mutable fields of a collection owned by creator and returns the updated view.
    pub async fn handle(
        &self,
        id: &str,
        request: UpdateCollectionRequest,
        creator_id: i32,
    ) -> Result<UpdateCollectionResponse, CollectionError> {
        let collection_id = CollectionId::new(id);
        let existing = self
            .repository
            .find_by_id_and_creator(&collection_id, creator_id)
            .await?;
        let existing = match existing {
            Some(c) => c,
            None => return Err(CollectionError::NotFound { id: id.to_string() }),
        };
        let now = now_millis();
        let updated = Collection::new(
            collection_id,
            creator_id,
            request.name,
            AuditFields::new(
                existing.audit_fields.created_at,
                now,
                existing.audit_fields.server_version,
                false,
            ),
        );
        let saved = self.repository.update(updated).await?;
        Ok(UpdateCollectionResponse {
            collection: map_collection(saved),
        })
    }
}

/// Handles collection deletion and cascades soft-delete to associated todos.
pub struct DeleteCollectionHandler<CR, TR> {
    collection_repository: CR,
    todo_repository: TR,
}

impl<CR, TR> DeleteCollectionHandler<CR, TR> {
    pub fn new(collection_repository: CR, todo_repository: TR) -> Self {
        Self {
            collection_repository,
            todo_repository,
        }
    }
}

impl<CR: CollectionRepository, TR: TodoRepository> DeleteCollectionHandler<CR, TR> {
    /// Soft-deletes the collection and all its todos, returning the deleted collection id.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<DeleteCollectionResponse, CollectionError> {
        let collection_id = CollectionId::new(id);
        let now = now_millis();
        let deleted = self
            .collection_repository
            .soft_delete_by_id_and_creator(&collection_id, creator_id, now)
            .await?;
        if !deleted {
            return Err(CollectionError::NotFound { id: id.to_string() });
        }
        self.todo_repository
            .soft_delete_by_collection(&collection_id, creator_id, now)
            .await?;
        Ok(DeleteCollectionResponse { id: id.to_string() })
    }
}

/// Handles listing all non-inbox, incomplete todos that have a present or past schedule.
pub struct ListAllTodosHandler<TR> {
    repository: TR,
}

impl<TR> ListAllTodosHandler<TR> {
    pub fn new(repository: TR) -> Self {
        Self { repository }
    }
}

impl<TR: TodoRepository> ListAllTodosHandler<TR> {
    /// Lists all planned, non-inbox, incomplete todos for the authenticated user.
    pub async fn handle(&self, creator_id: i32) -> Result<ListAllTodosResponse, CollectionError> {
        let todos = self.repository.list_all_planned(creator_id).await?;
        Ok(ListAllTodosResponse {
            todos: todos.into_iter().map(map_todo).collect(),
        })
    }
}

/// Handles listing todos scheduled for today.
pub struct ListTodayTodosHandler<TR> {
    repository: TR,
}

impl<TR> ListTodayTodosHandler<TR> {
    pub fn new(repository: TR) -> Self {
        Self { repository }
    }
}

impl<TR: TodoRepository> ListTodayTodosHandler<TR> {
    /// Lists all todos whose schedule falls within the current local day.
    pub async fn handle(&self, creator_id: i32) -> Result<ListTodayTodosResponse, CollectionError> {
        let todos = self.repository.list_today(creator_id).await?;
        Ok(ListTodayTodosResponse {
            todos: todos.into_iter().map(map_todo).collect(),
        })
    }
}

/// Handles scheduling a set of todos to the start of the current local day.
pub struct PlanTodayHandler<TR> {
    repository: TR,
}

impl<TR> PlanTodayHandler<TR> {
    pub fn new(repository: TR) -> Self {
        Self { repository }
    }
}

impl<TR: TodoRepository> PlanTodayHandler<TR> {
    /// Sets the schedule of the given incomplete todos to the start of today (local time).
    pub async fn handle(
        &self,
        request: PlanTodayRequest,
        creator_id: i32,
    ) -> Result<PlanTodayResponse, CollectionError> {
        let ids: Vec<TodoId> = request.ids.iter().map(TodoId::new).collect();
        if ids.is_empty() {
            return Ok(PlanTodayResponse {});
        }
        // Compute start of current local day in milliseconds.
        let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
        let start_of_day = now
            .replace_time(time::Time::MIDNIGHT)
            .unix_timestamp_nanos() as i64
            / 1_000_000;
        self.repository
            .set_schedule_for_ids(&ids, start_of_day, creator_id)
            .await?;
        Ok(PlanTodayResponse {})
    }
}
