use only_application::{TagRepository, TagRepositoryError};
use only_domain::{AuditFields, Tag, TagId};
use sqlx::{Pool, Postgres, Row as _};

/// PostgreSQL-backed implementation of [`TagRepository`] against the `d_tag_v2` table.
pub struct PostgresTagRepository {
    pool: Pool<Postgres>,
}

impl PostgresTagRepository {
    /// Wraps an existing connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

impl TagRepository for PostgresTagRepository {
    async fn create(&self, tag: Tag) -> Result<Tag, TagRepositoryError> {
        let row = sqlx::query(
            r#"
            INSERT INTO d_tag_v2 (id, creator_id, name, t_group, created_at, updated_at, is_deleted)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, FALSE)
            RETURNING id::text, creator_id, name, t_group, created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(tag.id.as_ref())
        .bind(tag.creator_id)
        .bind(&tag.name)
        .bind(&tag.group)
        .bind(tag.audit_fields.created_at)
        .bind(tag.audit_fields.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| TagRepositoryError::OperationFailed(e.to_string()))?;

        row_to_tag(row).map_err(|e| TagRepositoryError::OperationFailed(e.to_string()))
    }

    async fn list_by_creator_and_group(
        &self,
        creator_id: i32,
        group: &str,
    ) -> Result<Vec<Tag>, TagRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id::text, creator_id, name, t_group, created_at, updated_at, server_version, is_deleted
            FROM d_tag_v2
            WHERE creator_id = $1 AND t_group = $2 AND is_deleted = FALSE
            ORDER BY created_at ASC
            "#,
        )
        .bind(creator_id)
        .bind(group)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| TagRepositoryError::OperationFailed(e.to_string()))?;

        rows.into_iter()
            .map(|r| row_to_tag(r).map_err(|e| TagRepositoryError::OperationFailed(e.to_string())))
            .collect()
    }

    async fn soft_delete_by_name_and_group(
        &self,
        creator_id: i32,
        name: &str,
        group: &str,
        deleted_at: i64,
    ) -> Result<bool, TagRepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE d_tag_v2
            SET is_deleted = TRUE, updated_at = $1
            WHERE creator_id = $2 AND name = $3 AND t_group = $4 AND is_deleted = FALSE
            "#,
        )
        .bind(deleted_at)
        .bind(creator_id)
        .bind(name)
        .bind(group)
        .execute(&self.pool)
        .await
        .map_err(|e| TagRepositoryError::OperationFailed(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }
}

/// Maps a raw `d_tag_v2` row to the [`Tag`] domain model.
fn row_to_tag(row: sqlx::postgres::PgRow) -> Result<Tag, sqlx::Error> {
    Ok(Tag::new(
        TagId::new(row.try_get::<String, _>("id")?),
        row.try_get("creator_id")?,
        row.try_get::<String, _>("name")?,
        row.try_get::<String, _>("t_group")?,
        AuditFields::new(
            row.try_get("created_at")?,
            row.try_get("updated_at")?,
            row.try_get("server_version")?,
            row.try_get("is_deleted")?,
        ),
    ))
}
