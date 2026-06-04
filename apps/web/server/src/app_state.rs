use std::sync::Arc;

use only_db_server::PostgresMediaRepository;
use only_infrastructure::MinioObjectStore;

/// Shared state injected into every HTTP handler via axum's `State` extractor.
#[derive(Clone)]
pub struct AppState {
    pub object_store: Arc<MinioObjectStore>,
    pub media_repository: Arc<PostgresMediaRepository>,
}

impl AppState {
    /// Builds the shared state from the bootstrapped infrastructure components.
    pub fn new(
        object_store: Arc<MinioObjectStore>,
        media_repository: Arc<PostgresMediaRepository>,
    ) -> Self {
        Self {
            object_store,
            media_repository,
        }
    }
}
