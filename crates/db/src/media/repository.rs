use only_application::{MediaRepository, MediaRepositoryError, NewMedia};
use only_domain::{Media, MediaId};
use sqlx::{Pool, Postgres};
use time::OffsetDateTime;

/// PostgreSQL-backed implementation of [`MediaRepository`] against the `d_media` table.
pub struct PostgresMediaRepository {
    pool: Pool<Postgres>,
}

impl PostgresMediaRepository {
    /// Wraps an existing connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

impl MediaRepository for PostgresMediaRepository {
    async fn create(&self, media: &NewMedia) -> Result<Media, MediaRepositoryError> {
        let link_uuid: Option<uuid::Uuid> = media.link.as_deref().and_then(|s| s.parse().ok());

        let row = sqlx::query(
            r#"
            INSERT INTO d_media (creator_id, link, key, presigned_url, last_presigned_time)
            VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5)
            RETURNING id, creator_id, link::text AS link, key, presigned_url,
                      last_presigned_time, created_at, updated_at, deleted_at
            "#,
        )
        .bind(media.creator_id)
        .bind(link_uuid)
        .bind(&media.key)
        .bind(&media.presigned_url)
        .bind(media.last_presigned_time)
        .fetch_one(&self.pool)
        .await
        .map_err(db_error)?;

        row_to_media(row).map_err(db_error)
    }

    async fn find_by_link(&self, link: &str) -> Result<Option<Media>, MediaRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT id, creator_id, link::text AS link, key, presigned_url,
                   last_presigned_time, created_at, updated_at, deleted_at
            FROM d_media
            WHERE link = $1::uuid AND deleted_at IS NULL
            "#,
        )
        .bind(link)
        .fetch_optional(&self.pool)
        .await
        .map_err(db_error)?;

        row.map(|r| row_to_media(r).map_err(db_error)).transpose()
    }

    async fn find_by_link_owned(
        &self,
        link: &str,
        creator_id: i32,
    ) -> Result<Option<Media>, MediaRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT id, creator_id, link::text AS link, key, presigned_url,
                   last_presigned_time, created_at, updated_at, deleted_at
            FROM d_media
            WHERE link = $1::uuid AND creator_id = $2 AND deleted_at IS NULL
            "#,
        )
        .bind(link)
        .bind(creator_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(db_error)?;

        row.map(|r| row_to_media(r).map_err(db_error)).transpose()
    }

    async fn list_by_creator(&self, creator_id: i32) -> Result<Vec<Media>, MediaRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id, creator_id, link::text AS link, key, presigned_url,
                   last_presigned_time, created_at, updated_at, deleted_at
            FROM d_media
            WHERE creator_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(creator_id)
        .fetch_all(&self.pool)
        .await
        .map_err(db_error)?;

        rows.into_iter()
            .map(|r| row_to_media(r).map_err(db_error))
            .collect()
    }

    async fn soft_delete(&self, id: MediaId, creator_id: i32) -> Result<(), MediaRepositoryError> {
        sqlx::query(
            r#"
            UPDATE d_media
            SET deleted_at = now(), updated_at = now()
            WHERE id = $1 AND creator_id = $2 AND deleted_at IS NULL
            "#,
        )
        .bind(id.value())
        .bind(creator_id)
        .execute(&self.pool)
        .await
        .map_err(db_error)?;

        Ok(())
    }

    async fn find_expired_presigns(
        &self,
        cutoff: OffsetDateTime,
    ) -> Result<Vec<Media>, MediaRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id, creator_id, link::text AS link, key, presigned_url,
                   last_presigned_time, created_at, updated_at, deleted_at
            FROM d_media
            WHERE last_presigned_time < $1 AND deleted_at IS NULL
            "#,
        )
        .bind(cutoff)
        .fetch_all(&self.pool)
        .await
        .map_err(db_error)?;

        rows.into_iter()
            .map(|r| row_to_media(r).map_err(db_error))
            .collect()
    }

    async fn update_presigned_url(
        &self,
        id: MediaId,
        url: String,
        refreshed_at: OffsetDateTime,
    ) -> Result<(), MediaRepositoryError> {
        sqlx::query(
            r#"
            UPDATE d_media
            SET presigned_url = $1, last_presigned_time = $2, updated_at = now()
            WHERE id = $3
            "#,
        )
        .bind(&url)
        .bind(refreshed_at)
        .bind(id.value())
        .execute(&self.pool)
        .await
        .map_err(db_error)?;

        Ok(())
    }
}

/// Maps a raw sqlx `PgRow` to the [`Media`] domain model.
fn row_to_media(row: sqlx::postgres::PgRow) -> Result<Media, sqlx::Error> {
    use sqlx::Row as _;

    Ok(Media::new(
        MediaId::new(row.try_get::<i32, _>("id")?),
        row.try_get("creator_id")?,
        row.try_get("link")?,
        row.try_get::<String, _>("key")?,
        row.try_get("presigned_url")?,
        row.try_get("last_presigned_time")?,
        row.try_get("created_at")?,
        row.try_get("updated_at")?,
        row.try_get("deleted_at")?,
    ))
}

/// Wraps a sqlx error into the repository error type.
fn db_error(e: sqlx::Error) -> MediaRepositoryError {
    MediaRepositoryError::Database {
        source: Box::new(e),
    }
}
