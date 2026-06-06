mod auth;
mod collection;
mod frontend;
mod media;

pub use auth::{AuthQuery, AuthResponse};
pub use collection::{
    CollectionPath, CollectionView, CreateCollectionRequest, CreateCollectionResponse,
    DeleteCollectionRequest, DeleteCollectionResponse, GetCollectionRequest, GetCollectionResponse,
    ListAllTodosRequest, ListAllTodosResponse, ListCollectionsRequest, ListCollectionsResponse,
    ListTodayTodosRequest, ListTodayTodosResponse, PlanTodayRequest, PlanTodayResponse, TodoView,
    UpdateCollectionRequest, UpdateCollectionResponse,
};
pub use frontend::{
    FrontendEndpoint, FrontendHttpMethod, FrontendPathParam, COLLECTION_PATH, COLLECTIONS_PATH,
    MEDIA_PATH, TODOS_ALL_PATH, TODOS_PLAN_TODAY_PATH, TODOS_TODAY_PATH, frontend_endpoints,
};
pub use media::{DeleteMediaRequest, DeleteMediaResponse, UploadResponse};

use std::path::Path;
use ts_rs::{Config, ExportError, TS};

/// Exports every contract DTO family into the shared TypeScript package for frontend consumers.
pub fn export_typescript_bindings_to(output_directory: impl AsRef<Path>) -> Result<(), ExportError> {
    let config = Config::new().with_out_dir(output_directory.as_ref());

    AuthQuery::export(&config)?;
    AuthResponse::export(&config)?;

    CollectionView::export(&config)?;
    TodoView::export(&config)?;
    ListCollectionsRequest::export(&config)?;
    ListCollectionsResponse::export(&config)?;
    CreateCollectionRequest::export(&config)?;
    CreateCollectionResponse::export(&config)?;
    GetCollectionRequest::export(&config)?;
    GetCollectionResponse::export(&config)?;
    UpdateCollectionRequest::export(&config)?;
    UpdateCollectionResponse::export(&config)?;
    DeleteCollectionRequest::export(&config)?;
    DeleteCollectionResponse::export(&config)?;
    ListAllTodosRequest::export(&config)?;
    ListAllTodosResponse::export(&config)?;
    ListTodayTodosRequest::export(&config)?;
    ListTodayTodosResponse::export(&config)?;
    PlanTodayRequest::export(&config)?;
    PlanTodayResponse::export(&config)?;

    UploadResponse::export(&config)?;
    DeleteMediaRequest::export(&config)?;
    DeleteMediaResponse::export(&config)?;

    Ok(())
}
