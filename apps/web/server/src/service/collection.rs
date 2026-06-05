use only_application::{
    CollectionError, CreateCollectionHandler, DeleteCollectionHandler, GetCollectionHandler,
    ListAllTodosHandler, ListCollectionsHandler, ListTodayTodosHandler, PlanTodayHandler,
    UpdateCollectionHandler,
};
use only_contracts::{
    CreateCollectionRequest, CreateCollectionResponse, DeleteCollectionResponse,
    GetCollectionResponse, ListAllTodosResponse, ListCollectionsResponse, ListTodayTodosResponse,
    PlanTodayRequest, PlanTodayResponse, UpdateCollectionRequest, UpdateCollectionResponse,
};
use only_db_server::{PostgresCollectionRepository, PostgresTodoRepository};
use sqlx::{Pool, Postgres};

/// Groups the transport-facing collection and related-todo entry points for the web adapter.
pub struct CollectionApi {
    create: CreateCollectionHandler<PostgresCollectionRepository>,
    get: GetCollectionHandler<PostgresCollectionRepository>,
    list: ListCollectionsHandler<PostgresCollectionRepository>,
    update: UpdateCollectionHandler<PostgresCollectionRepository>,
    delete: DeleteCollectionHandler<PostgresCollectionRepository, PostgresTodoRepository>,
    list_all: ListAllTodosHandler<PostgresTodoRepository>,
    list_today: ListTodayTodosHandler<PostgresTodoRepository>,
    plan_today: PlanTodayHandler<PostgresTodoRepository>,
}

impl CollectionApi {
    /// Builds the collection API from the shared connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self {
            create: CreateCollectionHandler::new(PostgresCollectionRepository::new(pool.clone())),
            get: GetCollectionHandler::new(PostgresCollectionRepository::new(pool.clone())),
            list: ListCollectionsHandler::new(PostgresCollectionRepository::new(pool.clone())),
            update: UpdateCollectionHandler::new(PostgresCollectionRepository::new(pool.clone())),
            delete: DeleteCollectionHandler::new(
                PostgresCollectionRepository::new(pool.clone()),
                PostgresTodoRepository::new(pool.clone()),
            ),
            list_all: ListAllTodosHandler::new(PostgresTodoRepository::new(pool.clone())),
            list_today: ListTodayTodosHandler::new(PostgresTodoRepository::new(pool.clone())),
            plan_today: PlanTodayHandler::new(PostgresTodoRepository::new(pool)),
        }
    }

    /// Delegates a create-collection request to the application handler.
    pub async fn create(
        &self,
        request: CreateCollectionRequest,
        creator_id: i32,
    ) -> Result<CreateCollectionResponse, CollectionError> {
        self.create.handle(request, creator_id).await
    }

    /// Delegates a get-collection request to the application handler.
    pub async fn get(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<GetCollectionResponse, CollectionError> {
        self.get.handle(id, creator_id).await
    }

    /// Delegates a list-collections request to the application handler.
    pub async fn list(&self, creator_id: i32) -> Result<ListCollectionsResponse, CollectionError> {
        self.list.handle(creator_id).await
    }

    /// Delegates an update-collection request to the application handler.
    pub async fn update(
        &self,
        id: &str,
        request: UpdateCollectionRequest,
        creator_id: i32,
    ) -> Result<UpdateCollectionResponse, CollectionError> {
        self.update.handle(id, request, creator_id).await
    }

    /// Delegates a delete-collection request (including cascaded todo soft-delete) to the handler.
    pub async fn delete(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<DeleteCollectionResponse, CollectionError> {
        self.delete.handle(id, creator_id).await
    }

    /// Delegates a list-all-todos request to the application handler.
    pub async fn list_all(&self, creator_id: i32) -> Result<ListAllTodosResponse, CollectionError> {
        self.list_all.handle(creator_id).await
    }

    /// Delegates a list-today-todos request to the application handler.
    pub async fn list_today(
        &self,
        creator_id: i32,
    ) -> Result<ListTodayTodosResponse, CollectionError> {
        self.list_today.handle(creator_id).await
    }

    /// Delegates a plan-today request to the application handler.
    pub async fn plan_today(
        &self,
        request: PlanTodayRequest,
        creator_id: i32,
    ) -> Result<PlanTodayResponse, CollectionError> {
        self.plan_today.handle(request, creator_id).await
    }
}
