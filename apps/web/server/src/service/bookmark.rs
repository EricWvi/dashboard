use only_application::{
    BookmarkError, ClickBookmarkHandler, CreateBookmarkHandler, DeleteBookmarkHandler,
    GetBookmarkHandler, ListBookmarksHandler, UpdateBookmarkHandler,
};
use only_contracts::{
    ClickBookmarkResponse, CreateBookmarkRequest, CreateBookmarkResponse, DeleteBookmarkResponse,
    GetBookmarkResponse, ListBookmarksResponse, UpdateBookmarkRequest, UpdateBookmarkResponse,
};
use only_db_server::PostgresBookmarkRepository;
use sqlx::{Pool, Postgres};

/// Groups the transport-facing bookmark entry points for the web adapter.
pub struct BookmarkApi {
    create: CreateBookmarkHandler<PostgresBookmarkRepository>,
    get: GetBookmarkHandler<PostgresBookmarkRepository>,
    list: ListBookmarksHandler<PostgresBookmarkRepository>,
    update: UpdateBookmarkHandler<PostgresBookmarkRepository>,
    delete: DeleteBookmarkHandler<PostgresBookmarkRepository>,
    click: ClickBookmarkHandler<PostgresBookmarkRepository>,
}

impl BookmarkApi {
    /// Builds the bookmark API from the shared connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self {
            create: CreateBookmarkHandler::new(PostgresBookmarkRepository::new(pool.clone())),
            get: GetBookmarkHandler::new(PostgresBookmarkRepository::new(pool.clone())),
            list: ListBookmarksHandler::new(PostgresBookmarkRepository::new(pool.clone())),
            update: UpdateBookmarkHandler::new(PostgresBookmarkRepository::new(pool.clone())),
            delete: DeleteBookmarkHandler::new(PostgresBookmarkRepository::new(pool.clone())),
            click: ClickBookmarkHandler::new(PostgresBookmarkRepository::new(pool)),
        }
    }

    /// Delegates a create-bookmark request to the application handler.
    pub async fn create(
        &self,
        request: CreateBookmarkRequest,
        creator_id: i32,
    ) -> Result<CreateBookmarkResponse, BookmarkError> {
        self.create.handle(request, creator_id).await
    }

    /// Delegates a get-bookmark request to the application handler.
    pub async fn get(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<GetBookmarkResponse, BookmarkError> {
        self.get.handle(id, creator_id).await
    }

    /// Delegates a list-bookmarks request to the application handler.
    pub async fn list(&self, creator_id: i32) -> Result<ListBookmarksResponse, BookmarkError> {
        self.list.handle(creator_id).await
    }

    /// Delegates an update-bookmark request to the application handler.
    pub async fn update(
        &self,
        id: &str,
        request: UpdateBookmarkRequest,
        creator_id: i32,
    ) -> Result<UpdateBookmarkResponse, BookmarkError> {
        self.update.handle(id, request, creator_id).await
    }

    /// Delegates a delete-bookmark request to the application handler.
    pub async fn delete(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<DeleteBookmarkResponse, BookmarkError> {
        self.delete.handle(id, creator_id).await
    }

    /// Delegates a click-bookmark request to the application handler.
    pub async fn click(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<ClickBookmarkResponse, BookmarkError> {
        self.click.handle(id, creator_id).await
    }
}
