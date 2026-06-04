use only_application::{MediaRepository, NewMedia};
use only_logging::set_trace_logging;
use pretty_assertions::assert_eq;
use sqlx::{Pool, Postgres};
use testcontainers::ImageExt;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres as PgContainer;
use time::{Duration, OffsetDateTime};

use super::PostgresMediaRepository;
use crate::{
    DatabaseBootstrapper, DatabaseLocation, SystemTimestampSource, default_migration_catalog,
};

/// Starts a postgres container with the required extensions and returns the pool and container.
async fn bootstrap_test_db() -> (testcontainers::ContainerAsync<PgContainer>, Pool<Postgres>) {
    let container = PgContainer::default()
        .with_tag("17-alpine")
        .start()
        .await
        .expect("postgres container failed to start");
    let port = container
        .get_host_port_ipv4(5432)
        .await
        .expect("postgres port not available");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{port}/postgres");

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

    let location = DatabaseLocation::new(url);
    let catalog = default_migration_catalog().expect("catalog build failed");
    let db = DatabaseBootstrapper::<SystemTimestampSource>::system()
        .bootstrap(&location, &catalog)
        .await
        .expect("database bootstrap failed");

    let pool = db.into_pool();
    (container, pool)
}

fn new_media(creator_id: i32, key: &str) -> NewMedia {
    NewMedia {
        creator_id,
        link: None,
        key: key.to_string(),
        presigned_url: Some(format!("https://example.com/{key}")),
        last_presigned_time: OffsetDateTime::now_local()
            .unwrap_or_else(|_| OffsetDateTime::now_utc()),
    }
}

/// Verifies that a created record can be retrieved by its generated link UUID.
#[tokio::test]
#[ignore = "requires RUN_TESTCONTAINERS=1"]
async fn create_then_find_by_link_returns_equal_media() {
    let _guard = set_trace_logging();

    let (_container, pool) = bootstrap_test_db().await;
    let repo = PostgresMediaRepository::new(pool);

    let created = repo
        .create(&new_media(1, "2024/01/1704067200_photo.jpg"))
        .await
        .expect("create failed");

    let link = created.link.as_deref().expect("link should be set by DB");
    let found = repo
        .find_by_link(link, 1)
        .await
        .expect("find_by_link failed");

    assert_eq!(found, Some(created));
}

/// Verifies that soft-deleting a record causes find_by_link to return None.
#[tokio::test]
#[ignore = "requires RUN_TESTCONTAINERS=1"]
async fn soft_delete_hides_record_from_find_by_link() {
    let _guard = set_trace_logging();

    let (_container, pool) = bootstrap_test_db().await;
    let repo = PostgresMediaRepository::new(pool);

    let created = repo
        .create(&new_media(1, "2024/01/1704067201_photo.jpg"))
        .await
        .expect("create failed");

    let link = created.link.as_deref().expect("link should be set");
    repo.soft_delete(created.id, 1)
        .await
        .expect("soft_delete failed");

    let found = repo
        .find_by_link(link, 1)
        .await
        .expect("find_by_link after delete failed");

    assert_eq!(found, None);
}

/// Verifies that find_expired_presigns only returns records whose presign time is before the cutoff.
#[tokio::test]
#[ignore = "requires RUN_TESTCONTAINERS=1"]
async fn find_expired_presigns_filters_by_cutoff() {
    let _guard = set_trace_logging();

    let (_container, pool) = bootstrap_test_db().await;
    let repo = PostgresMediaRepository::new(pool);

    let old_time = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc())
        - Duration::days(7);
    let recent_time = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());

    let old_media = NewMedia {
        creator_id: 1,
        link: None,
        key: "2024/01/111_old.jpg".to_string(),
        presigned_url: Some("https://example.com/old".to_string()),
        last_presigned_time: old_time,
    };
    let recent_media = NewMedia {
        creator_id: 1,
        link: None,
        key: "2024/01/222_recent.jpg".to_string(),
        presigned_url: Some("https://example.com/recent".to_string()),
        last_presigned_time: recent_time,
    };

    let created_old = repo.create(&old_media).await.expect("create old failed");
    let _created_recent = repo
        .create(&recent_media)
        .await
        .expect("create recent failed");

    let cutoff = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc())
        - Duration::days(5);
    let expired = repo
        .find_expired_presigns(cutoff)
        .await
        .expect("find_expired_presigns failed");

    assert_eq!(expired.len(), 1);
    assert_eq!(expired[0].id, created_old.id);
}

/// Verifies that update_presigned_url changes both the URL and the refresh timestamp.
#[tokio::test]
#[ignore = "requires RUN_TESTCONTAINERS=1"]
async fn update_presigned_url_sets_new_url_and_timestamp() {
    let _guard = set_trace_logging();

    let (_container, pool) = bootstrap_test_db().await;
    let repo = PostgresMediaRepository::new(pool);

    let created = repo
        .create(&new_media(1, "2024/01/1704067203_photo.jpg"))
        .await
        .expect("create failed");

    let new_url = "https://example.com/refreshed".to_string();
    let new_time = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc())
        + Duration::hours(1);

    repo.update_presigned_url(created.id, new_url.clone(), new_time)
        .await
        .expect("update_presigned_url failed");

    let link = created.link.as_deref().expect("link should be set");
    let updated = repo
        .find_by_link(link, 1)
        .await
        .expect("find_by_link after update failed")
        .expect("record should still exist");

    assert_eq!(updated.presigned_url, Some(new_url));
    // The stored timestamp has sub-second precision differences, so compare to microsecond.
    assert_eq!(
        updated.last_presigned_time.unix_timestamp(),
        new_time.unix_timestamp()
    );
}
