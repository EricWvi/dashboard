use only_application::{CollectionRepository, CollectionRepositoryError};
use only_domain::{AuditFields, Collection, CollectionId};
use sqlx::{Pool, Postgres, Row as _};
use uuid::Uuid;

/// PostgreSQL-backed implementation of [`CollectionRepository`] against the `d_collection_v2` table.
pub struct PostgresCollectionRepository {
    pool: Pool<Postgres>,
}

impl PostgresCollectionRepository {
    /// Wraps an existing connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

impl CollectionRepository for PostgresCollectionRepository {
    async fn create(
        &self,
        collection: Collection,
    ) -> Result<Collection, CollectionRepositoryError> {
        let id: Uuid =
            collection.id.as_ref().parse().map_err(|e: uuid::Error| {
                CollectionRepositoryError::OperationFailed(e.to_string())
            })?;

        let row = sqlx::query(
            r#"
            INSERT INTO d_collection_v2 (id, creator_id, name, created_at, updated_at, is_deleted)
            VALUES ($1, $2, $3, $4, $5, FALSE)
            RETURNING id::text, creator_id, name, created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(id)
        .bind(collection.creator_id)
        .bind(&collection.name)
        .bind(collection.audit_fields.created_at)
        .bind(collection.audit_fields.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| CollectionRepositoryError::OperationFailed(e.to_string()))?;

        row_to_collection(row)
            .map_err(|e| CollectionRepositoryError::OperationFailed(e.to_string()))
    }

    async fn find_by_id_and_creator(
        &self,
        id: &CollectionId,
        creator_id: i32,
    ) -> Result<Option<Collection>, CollectionRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT id::text, creator_id, name, created_at, updated_at, server_version, is_deleted
            FROM d_collection_v2
            WHERE id = $1::uuid AND creator_id = $2 AND is_deleted = FALSE
            "#,
        )
        .bind(id.as_ref())
        .bind(creator_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CollectionRepositoryError::OperationFailed(e.to_string()))?;

        row.map(|r| {
            row_to_collection(r)
                .map_err(|e| CollectionRepositoryError::OperationFailed(e.to_string()))
        })
        .transpose()
    }

    async fn list_by_creator(
        &self,
        creator_id: i32,
    ) -> Result<Vec<Collection>, CollectionRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id::text, creator_id, name, created_at, updated_at, server_version, is_deleted
            FROM d_collection_v2
            WHERE creator_id = $1 AND is_deleted = FALSE
            ORDER BY created_at ASC
            "#,
        )
        .bind(creator_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| CollectionRepositoryError::OperationFailed(e.to_string()))?;

        rows.into_iter()
            .map(|r| {
                row_to_collection(r)
                    .map_err(|e| CollectionRepositoryError::OperationFailed(e.to_string()))
            })
            .collect()
    }

    async fn update(
        &self,
        collection: Collection,
    ) -> Result<Collection, CollectionRepositoryError> {
        let row = sqlx::query(
            r#"
            UPDATE d_collection_v2
            SET name = $1, updated_at = $2
            WHERE id = $3::uuid AND creator_id = $4 AND is_deleted = FALSE
            RETURNING id::text, creator_id, name, created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(&collection.name)
        .bind(collection.audit_fields.updated_at)
        .bind(collection.id.as_ref())
        .bind(collection.creator_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| CollectionRepositoryError::OperationFailed(e.to_string()))?;

        row_to_collection(row)
            .map_err(|e| CollectionRepositoryError::OperationFailed(e.to_string()))
    }

    async fn soft_delete_by_id_and_creator(
        &self,
        id: &CollectionId,
        creator_id: i32,
        deleted_at: i64,
    ) -> Result<bool, CollectionRepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE d_collection_v2
            SET is_deleted = TRUE, updated_at = $1
            WHERE id = $2::uuid AND creator_id = $3 AND is_deleted = FALSE
            "#,
        )
        .bind(deleted_at)
        .bind(id.as_ref())
        .bind(creator_id)
        .execute(&self.pool)
        .await
        .map_err(|e| CollectionRepositoryError::OperationFailed(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }
}

/// Maps a raw `d_collection_v2` row to the [`Collection`] domain model.
fn row_to_collection(row: sqlx::postgres::PgRow) -> Result<Collection, sqlx::Error> {
    Ok(Collection::new(
        CollectionId::new(row.try_get::<String, _>("id")?),
        row.try_get("creator_id")?,
        row.try_get::<String, _>("name")?,
        AuditFields::new(
            row.try_get("created_at")?,
            row.try_get("updated_at")?,
            row.try_get("server_version")?,
            row.try_get("is_deleted")?,
        ),
    ))
}
