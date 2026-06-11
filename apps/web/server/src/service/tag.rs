use only_application::{CreateTagsHandler, DeleteTagHandler, ListTagsHandler, TagError};
use only_contracts::{
    CreateTagsRequest, CreateTagsResponse, DeleteTagRequest, DeleteTagResponse, ListTagsRequest,
    ListTagsResponse,
};
use only_db_server::PostgresTagRepository;
use sqlx::{Pool, Postgres};

/// Groups the transport-facing tag entry points for the web adapter.
pub struct TagApi {
    create: CreateTagsHandler<PostgresTagRepository>,
    list: ListTagsHandler<PostgresTagRepository>,
    delete: DeleteTagHandler<PostgresTagRepository>,
}

impl TagApi {
    /// Builds the tag API from the shared connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self {
            create: CreateTagsHandler::new(PostgresTagRepository::new(pool.clone())),
            list: ListTagsHandler::new(PostgresTagRepository::new(pool.clone())),
            delete: DeleteTagHandler::new(PostgresTagRepository::new(pool)),
        }
    }

    /// Delegates a create-tags request to the application handler.
    pub async fn create_tags(
        &self,
        request: CreateTagsRequest,
        creator_id: i32,
    ) -> Result<CreateTagsResponse, TagError> {
        self.create.handle(request, creator_id).await
    }

    /// Delegates a list-tags request to the application handler.
    pub async fn list_tags(
        &self,
        request: ListTagsRequest,
        creator_id: i32,
    ) -> Result<ListTagsResponse, TagError> {
        self.list.handle(request, creator_id).await
    }

    /// Delegates a delete-tag request to the application handler.
    pub async fn delete_tag(
        &self,
        request: DeleteTagRequest,
        creator_id: i32,
    ) -> Result<DeleteTagResponse, TagError> {
        self.delete.handle(request, creator_id).await
    }
}
