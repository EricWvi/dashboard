use std::sync::Arc;

use only_db_server::PostgresMediaRepository;
use only_infrastructure::{HttpOidcClient, MinioObjectStore};

use crate::service::{BookmarkApi, CollectionApi, EntryApi, TiptapApi, UserApi};

/// Shared state injected into every HTTP handler via axum's `State` extractor.
#[derive(Clone)]
pub struct AppState {
    pub object_store: Arc<MinioObjectStore>,
    pub media_repository: Arc<PostgresMediaRepository>,
    pub collection_api: Arc<CollectionApi>,
    pub entry_api: Arc<EntryApi>,
    pub tiptap_api: Arc<TiptapApi>,
    pub bookmark_api: Arc<BookmarkApi>,
    pub user_api: Arc<UserApi>,
    pub oidc_client: Arc<HttpOidcClient>,
    /// AES-256-GCM key read from `DASHBOARD_ENCRYPT_KEY`; used by the auth middleware.
    pub encrypt_key: String,
}
