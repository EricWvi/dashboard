use only_application::{BookmarkRepository, BookmarkRepositoryError};
use only_domain::{AuditFields, Bookmark, BookmarkId};
use sqlx::{Pool, Postgres, Row as _};

/// PostgreSQL-backed implementation of [`BookmarkRepository`] against `d_bookmark_v2`.
pub struct PostgresBookmarkRepository {
    pool: Pool<Postgres>,
}

impl PostgresBookmarkRepository {
    /// Wraps an existing connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

impl BookmarkRepository for PostgresBookmarkRepository {
    async fn create(&self, bookmark: Bookmark) -> Result<Bookmark, BookmarkRepositoryError> {
        let payload_str = serde_json::to_string(&bookmark.payload)
            .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))?;

        let row = sqlx::query(
            r#"
            INSERT INTO d_bookmark_v2
                (id, creator_id, url, title, click, domain, payload, created_at, updated_at, is_deleted)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, FALSE)
            RETURNING id::text, creator_id, url, title, click, domain, payload::text,
                      created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(bookmark.id.as_ref())
        .bind(bookmark.creator_id)
        .bind(&bookmark.url)
        .bind(&bookmark.title)
        .bind(bookmark.click)
        .bind(&bookmark.domain)
        .bind(&payload_str)
        .bind(bookmark.audit_fields.created_at)
        .bind(bookmark.audit_fields.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))?;

        row_to_bookmark(row).map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))
    }

    async fn find_by_id_and_creator(
        &self,
        id: &BookmarkId,
        creator_id: i32,
    ) -> Result<Option<Bookmark>, BookmarkRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT id::text, creator_id, url, title, click, domain, payload::text,
                   created_at, updated_at, server_version, is_deleted
            FROM d_bookmark_v2
            WHERE id = $1::uuid AND creator_id = $2 AND is_deleted = FALSE
            "#,
        )
        .bind(id.as_ref())
        .bind(creator_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))?;

        row.map(|r| {
            row_to_bookmark(r).map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))
        })
        .transpose()
    }

    async fn list_by_creator(
        &self,
        creator_id: i32,
    ) -> Result<Vec<Bookmark>, BookmarkRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id::text, creator_id, url, title, click, domain, payload::text,
                   created_at, updated_at, server_version, is_deleted
            FROM d_bookmark_v2
            WHERE creator_id = $1 AND is_deleted = FALSE
            ORDER BY created_at DESC
            "#,
        )
        .bind(creator_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))?;

        rows.into_iter()
            .map(|r| {
                row_to_bookmark(r)
                    .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))
            })
            .collect()
    }

    async fn update(
        &self,
        bookmark: Bookmark,
    ) -> Result<Option<Bookmark>, BookmarkRepositoryError> {
        let payload_str = serde_json::to_string(&bookmark.payload)
            .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))?;

        let result = sqlx::query(
            r#"
            UPDATE d_bookmark_v2
            SET url = $1, title = $2, domain = $3, payload = $4::jsonb, updated_at = $5
            WHERE id = $6::uuid AND creator_id = $7 AND is_deleted = FALSE
            RETURNING id::text, creator_id, url, title, click, domain, payload::text,
                      created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(&bookmark.url)
        .bind(&bookmark.title)
        .bind(&bookmark.domain)
        .bind(&payload_str)
        .bind(bookmark.audit_fields.updated_at)
        .bind(bookmark.id.as_ref())
        .bind(bookmark.creator_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))?;

        result
            .map(|r| {
                row_to_bookmark(r)
                    .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))
            })
            .transpose()
    }

    async fn soft_delete(
        &self,
        id: &BookmarkId,
        creator_id: i32,
        deleted_at: i64,
    ) -> Result<bool, BookmarkRepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE d_bookmark_v2
            SET is_deleted = TRUE, updated_at = $1
            WHERE id = $2::uuid AND creator_id = $3 AND is_deleted = FALSE
            "#,
        )
        .bind(deleted_at)
        .bind(id.as_ref())
        .bind(creator_id)
        .execute(&self.pool)
        .await
        .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }

    async fn increment_click(
        &self,
        id: &BookmarkId,
        creator_id: i32,
        updated_at: i64,
    ) -> Result<bool, BookmarkRepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE d_bookmark_v2
            SET click = click + 1, updated_at = $1
            WHERE id = $2::uuid AND creator_id = $3 AND is_deleted = FALSE
            "#,
        )
        .bind(updated_at)
        .bind(id.as_ref())
        .bind(creator_id)
        .execute(&self.pool)
        .await
        .map_err(|e| BookmarkRepositoryError::OperationFailed(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }
}

/// Maps a raw `d_bookmark_v2` row to the [`Bookmark`] domain model.
fn row_to_bookmark(row: sqlx::postgres::PgRow) -> Result<Bookmark, sqlx::Error> {
    let payload_text: String = row.try_get("payload")?;
    let payload = serde_json::from_str(&payload_text)
        .unwrap_or(serde_json::Value::Object(serde_json::Map::default()));

    Ok(Bookmark::new(
        BookmarkId::new(row.try_get::<String, _>("id")?),
        row.try_get("creator_id")?,
        row.try_get::<String, _>("url")?,
        row.try_get::<String, _>("title")?,
        row.try_get("click")?,
        row.try_get::<String, _>("domain")?,
        payload,
        AuditFields::new(
            row.try_get("created_at")?,
            row.try_get("updated_at")?,
            row.try_get("server_version")?,
            row.try_get("is_deleted")?,
        ),
    ))
}
