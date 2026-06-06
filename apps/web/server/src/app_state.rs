use std::sync::Arc;

use only_db_server::PostgresMediaRepository;
use only_infrastructure::{HttpOidcClient, MinioObjectStore};

use crate::service::{CollectionApi, UserApi};

/// Shared state injected into every HTTP handler via axum's `State` extractor.
#[derive(Clone)]
pub struct AppState {
    pub object_store: Arc<MinioObjectStore>,
    pub media_repository: Arc<PostgresMediaRepository>,
    pub collection_api: Arc<CollectionApi>,
    pub user_api: Arc<UserApi>,
    pub oidc_client: Arc<HttpOidcClient>,
    /// AES-256-GCM key read from `DASHBOARD_ENCRYPT_KEY`; used by the auth middleware.
    pub encrypt_key: String,
}

impl AppState {
    /// Builds the shared state from the bootstrapped infrastructure components.
    pub fn new(
        object_store: Arc<MinioObjectStore>,
        media_repository: Arc<PostgresMediaRepository>,
        collection_api: Arc<CollectionApi>,
        user_api: Arc<UserApi>,
        oidc_client: Arc<HttpOidcClient>,
        encrypt_key: String,
    ) -> Self {
        Self {
            object_store,
            media_repository,
            collection_api,
            user_api,
            oidc_client,
            encrypt_key,
        }
    }
}
