mod bookmark;
mod collection;
mod entry;
mod tag;
mod tiptap;

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{HeaderName, HeaderValue, Request, Response};
use only_db_server::{
    DatabaseBootstrapper, DatabaseLocation, SystemTimestampSource, default_migration_catalog,
};
use only_infrastructure::{HttpOidcClient, HttpOidcClientConfig, MinioConfig, MinioObjectStore};
use only_logging::set_trace_logging;
use sqlx::{Pool, Postgres};
use testcontainers::ContainerAsync;
use testcontainers::ImageExt;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres as PgContainer;
use tower::ServiceExt;

use crate::app_state::AppState;
use crate::middleware::encrypt_token;
use crate::routes::build_router;
use crate::service::{BookmarkApi, CollectionApi, EntryApi, TagApi, TiptapApi, UserApi};

/// A 32-byte AES-256 key used exclusively in tests.
const TEST_ENCRYPT_KEY: &str = "dashboard-test-encrypt-key-32by!";

/// Starts a Postgres 17 container, enables required extensions, runs all migrations,
/// and returns a fully wired `AppState` backed by the test database.
///
/// The returned `ContainerAsync` must be held by the caller for the lifetime of the test;
/// dropping it stops the container.
pub async fn bootstrap_test_state() -> (ContainerAsync<PgContainer>, AppState) {
    let (container, state, _pool) = bootstrap_test_state_with_pool().await;
    (container, state)
}

/// Starts a Postgres 17 container and returns the test app state together with the shared pool.
///
/// Entry handler tests use the pool to seed relative-date fixtures that cannot be expressed
/// through the HTTP API alone.
pub async fn bootstrap_test_state_with_pool() -> (
    ContainerAsync<PgContainer>,
    AppState,
    Pool<Postgres>,
) {
    let _guard = set_trace_logging();

    let container = PgContainer::default()
        .with_tag("17-alpine")
        .start()
        .await
        .expect("postgres container failed to start");

    let port = container
        .get_host_port_ipv4(5432)
        .await
        .expect("postgres port not available");

    let url = format!(
        "postgres://postgres:postgres@127.0.0.1:{port}/postgres?sslmode=disable&TimeZone=Asia/Shanghai"
    );

    let setup_pool = Pool::<Postgres>::connect(&url)
        .await
        .expect("failed to connect for extension setup");
    sqlx::raw_sql(
        "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS pg_trgm;",
    )
    .execute(&setup_pool)
    .await
    .expect("failed to enable extensions");
    setup_pool.close().await;

    let location = DatabaseLocation::new(url.clone());
    let catalog = default_migration_catalog().expect("catalog build failed");
    DatabaseBootstrapper::<SystemTimestampSource>::system()
        .bootstrap(&location, &catalog)
        .await
        .expect("database bootstrap failed");

    let pool = Pool::<Postgres>::connect(&url)
        .await
        .expect("failed to connect after migration");

    // Minio and OIDC are not exercised by collection/entry/tiptap/bookmark handlers;
    // placeholder values let the types be constructed without a running server.
    let object_store = Arc::new(
        MinioObjectStore::new(MinioConfig {
            endpoint: "127.0.0.1:1".to_string(),
            bucket: "test".to_string(),
            access_key_id: "test".to_string(),
            secret_access_key: "test".to_string(),
            use_ssl: false,
            presign_expiry: Duration::from_secs(3600),
        })
        .expect("fake minio object store failed to construct"),
    );

    let media_repository = Arc::new(only_db_server::PostgresMediaRepository::new(pool.clone()));

    let oidc_client = Arc::new(HttpOidcClient::new(HttpOidcClientConfig {
        token_endpoint: "http://localhost:1/token".to_string(),
        userinfo_endpoint: "http://localhost:1/userinfo".to_string(),
        client_id: "test".to_string(),
        client_secret: "test".to_string(),
    }));

    let state = AppState {
        object_store,
        media_repository,
        collection_api: Arc::new(CollectionApi::new(pool.clone())),
        entry_api: Arc::new(EntryApi::new(pool.clone())),
        tag_api: Arc::new(TagApi::new(pool.clone())),
        tiptap_api: Arc::new(TiptapApi::new(pool.clone())),
        bookmark_api: Arc::new(BookmarkApi::new(pool.clone())),
        user_api: Arc::new(UserApi::new(pool.clone())),
        oidc_client,
        encrypt_key: TEST_ENCRYPT_KEY.to_string(),
    };

    (container, state, pool)
}

/// Builds an `Onlyquant-Token` header value for the given email using the test key.
pub fn test_token(email: &str) -> HeaderValue {
    let token =
        encrypt_token(TEST_ENCRYPT_KEY.as_bytes(), email).expect("test token encryption failed");
    HeaderValue::from_str(&token).expect("token is valid header value")
}

/// Sends a single request through the router built from `state` and returns the response.
pub async fn send(state: AppState, req: Request<Body>) -> Response<Body> {
    build_router(state)
        .oneshot(req)
        .await
        .expect("router oneshot failed")
}

/// Convenience builder: adds the standard test auth header to a request builder.
pub fn with_auth(
    builder: axum::http::request::Builder,
    email: &str,
) -> axum::http::request::Builder {
    builder.header(
        HeaderName::from_static("onlyquant-token"),
        test_token(email),
    )
}
