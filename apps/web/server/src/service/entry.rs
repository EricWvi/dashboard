use only_application::{
    BookmarkEntryHandler, CreateEntryHandler, CreateTagsHandler, DeleteEntryHandler,
    DeleteTagHandler, EntryError, GetEntryHandler, ListEntriesHandler, ListTagsHandler, TagError,
    UnbookmarkEntryHandler, UpdateEntryHandler,
};
use only_contracts::{
    BookmarkEntryResponse, CreateEntryRequest, CreateEntryResponse, CreateTagsRequest,
    CreateTagsResponse, DeleteEntryResponse, DeleteTagRequest, DeleteTagResponse, GetEntryResponse,
    ListEntriesRequest, ListEntriesResponse, ListTagsRequest, ListTagsResponse,
    UnbookmarkEntryResponse, UpdateEntryRequest, UpdateEntryResponse,
};
use only_db_server::{PostgresEntryRepository, PostgresTagRepository};
use sqlx::{Pool, Postgres};

/// Groups the transport-facing entry and tag entry points for the web adapter.
pub struct EntryApi {
    create: CreateEntryHandler<PostgresEntryRepository>,
    get: GetEntryHandler<PostgresEntryRepository>,
    list: ListEntriesHandler<PostgresEntryRepository>,
    update: UpdateEntryHandler<PostgresEntryRepository>,
    delete: DeleteEntryHandler<PostgresEntryRepository>,
    bookmark: BookmarkEntryHandler<PostgresEntryRepository>,
    unbookmark: UnbookmarkEntryHandler<PostgresEntryRepository>,
    create_tags: CreateTagsHandler<PostgresTagRepository>,
    list_tags: ListTagsHandler<PostgresTagRepository>,
    delete_tag: DeleteTagHandler<PostgresTagRepository>,
}

impl EntryApi {
    /// Builds the entry API from the shared connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self {
            create: CreateEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            get: GetEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            list: ListEntriesHandler::new(PostgresEntryRepository::new(pool.clone())),
            update: UpdateEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            delete: DeleteEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            bookmark: BookmarkEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            unbookmark: UnbookmarkEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            create_tags: CreateTagsHandler::new(PostgresTagRepository::new(pool.clone())),
            list_tags: ListTagsHandler::new(PostgresTagRepository::new(pool.clone())),
            delete_tag: DeleteTagHandler::new(PostgresTagRepository::new(pool)),
        }
    }

    /// Delegates an entry creation request to the application handler.
    pub async fn create(
        &self,
        request: CreateEntryRequest,
        creator_id: i32,
    ) -> Result<CreateEntryResponse, EntryError> {
        self.create.handle(request, creator_id).await
    }

    /// Delegates a get-entry request to the application handler.
    pub async fn get(&self, id: &str, creator_id: i32) -> Result<GetEntryResponse, EntryError> {
        self.get.handle(id, creator_id).await
    }

    /// Delegates a list-entries request to the application handler.
    pub async fn list(
        &self,
        request: ListEntriesRequest,
        creator_id: i32,
    ) -> Result<ListEntriesResponse, EntryError> {
        self.list.handle(request, creator_id).await
    }

    /// Delegates an update-entry request to the application handler.
    pub async fn update(
        &self,
        id: &str,
        request: UpdateEntryRequest,
        creator_id: i32,
    ) -> Result<UpdateEntryResponse, EntryError> {
        self.update.handle(id, request, creator_id).await
    }

    /// Delegates a delete-entry request to the application handler.
    pub async fn delete(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<DeleteEntryResponse, EntryError> {
        self.delete.handle(id, creator_id).await
    }

    /// Delegates a bookmark-entry request to the application handler.
    pub async fn bookmark(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<BookmarkEntryResponse, EntryError> {
        self.bookmark.handle(id, creator_id).await
    }

    /// Delegates an unbookmark-entry request to the application handler.
    pub async fn unbookmark(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<UnbookmarkEntryResponse, EntryError> {
        self.unbookmark.handle(id, creator_id).await
    }

    /// Delegates a create-tags request to the application handler.
    pub async fn create_tags(
        &self,
        request: CreateTagsRequest,
        creator_id: i32,
    ) -> Result<CreateTagsResponse, TagError> {
        self.create_tags.handle(request, creator_id).await
    }

    /// Delegates a list-tags request to the application handler.
    pub async fn list_tags(
        &self,
        request: ListTagsRequest,
        creator_id: i32,
    ) -> Result<ListTagsResponse, TagError> {
        self.list_tags.handle(request, creator_id).await
    }

    /// Delegates a delete-tag request to the application handler.
    pub async fn delete_tag(
        &self,
        request: DeleteTagRequest,
        creator_id: i32,
    ) -> Result<DeleteTagResponse, TagError> {
        self.delete_tag.handle(request, creator_id).await
    }
}
