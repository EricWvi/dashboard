use only_application::{QuickNoteRepository, QuickNoteRepositoryError};
use only_domain::{AuditFields, QuickNote, QuickNoteId, TiptapId};
use sqlx::{Pool, Postgres, Row as _};

/// Sentinel UUID string meaning "no linked draft".
const ZERO_UUID: &str = "00000000-0000-0000-0000-000000000000";

/// PostgreSQL-backed implementation of [`QuickNoteRepository`] against `d_quick_note_v2`.
pub struct PostgresQuickNoteRepository {
    pool: Pool<Postgres>,
}

impl PostgresQuickNoteRepository {
    /// Wraps an existing connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

impl QuickNoteRepository for PostgresQuickNoteRepository {
    async fn create(&self, note: QuickNote) -> Result<QuickNote, QuickNoteRepositoryError> {
        let draft_str = note
            .draft
            .as_ref()
            .map(|d| d.as_ref().to_string())
            .unwrap_or_else(|| ZERO_UUID.to_string());
        let order = note.order.unwrap_or(-1);

        let row = sqlx::query(
            r#"
            INSERT INTO d_quick_note_v2
                (id, creator_id, title, draft, d_order, created_at, updated_at, is_deleted)
            VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7, FALSE)
            RETURNING id::text, creator_id, title, draft::text, d_order,
                      created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(note.id.as_ref())
        .bind(note.creator_id)
        .bind(&note.title)
        .bind(&draft_str)
        .bind(order)
        .bind(note.audit_fields.created_at)
        .bind(note.audit_fields.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))?;

        row_to_quick_note(row).map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))
    }

    async fn list_by_creator(
        &self,
        creator_id: i32,
    ) -> Result<Vec<QuickNote>, QuickNoteRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id::text, creator_id, title, draft::text, d_order,
                   created_at, updated_at, server_version, is_deleted
            FROM d_quick_note_v2
            WHERE creator_id = $1 AND is_deleted = FALSE
            ORDER BY d_order DESC
            "#,
        )
        .bind(creator_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))?;

        rows.into_iter()
            .map(|r| {
                row_to_quick_note(r)
                    .map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))
            })
            .collect()
    }

    async fn max_order(&self, creator_id: i32) -> Result<i32, QuickNoteRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT COALESCE(MAX(d_order), 0) AS max_order
            FROM d_quick_note_v2
            WHERE creator_id = $1 AND is_deleted = FALSE
            "#,
        )
        .bind(creator_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))?;

        Ok(row.try_get("max_order").unwrap_or(0))
    }

    async fn min_order(&self, creator_id: i32) -> Result<i32, QuickNoteRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT COALESCE(MIN(d_order), 0) AS min_order
            FROM d_quick_note_v2
            WHERE creator_id = $1 AND is_deleted = FALSE
            "#,
        )
        .bind(creator_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))?;

        Ok(row.try_get("min_order").unwrap_or(0))
    }

    async fn update(&self, note: QuickNote) -> Result<Option<QuickNote>, QuickNoteRepositoryError> {
        let draft_str = note
            .draft
            .as_ref()
            .map(|d| d.as_ref().to_string())
            .unwrap_or_else(|| ZERO_UUID.to_string());
        let order = note.order.unwrap_or(-1);

        let result = sqlx::query(
            r#"
            UPDATE d_quick_note_v2
            SET title = $1, draft = $2::uuid, d_order = $3, updated_at = $4
            WHERE id = $5::uuid AND creator_id = $6 AND is_deleted = FALSE
            RETURNING id::text, creator_id, title, draft::text, d_order,
                      created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(&note.title)
        .bind(&draft_str)
        .bind(order)
        .bind(note.audit_fields.updated_at)
        .bind(note.id.as_ref())
        .bind(note.creator_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))?;

        result
            .map(|r| {
                row_to_quick_note(r)
                    .map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))
            })
            .transpose()
    }

    async fn set_order(
        &self,
        id: &QuickNoteId,
        creator_id: i32,
        order: i32,
        updated_at: i64,
    ) -> Result<bool, QuickNoteRepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE d_quick_note_v2
            SET d_order = $1, updated_at = $2
            WHERE id = $3::uuid AND creator_id = $4 AND is_deleted = FALSE
            "#,
        )
        .bind(order)
        .bind(updated_at)
        .bind(id.as_ref())
        .bind(creator_id)
        .execute(&self.pool)
        .await
        .map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }

    async fn soft_delete(
        &self,
        id: &QuickNoteId,
        creator_id: i32,
        deleted_at: i64,
    ) -> Result<bool, QuickNoteRepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE d_quick_note_v2
            SET is_deleted = TRUE, updated_at = $1
            WHERE id = $2::uuid AND creator_id = $3 AND is_deleted = FALSE
            "#,
        )
        .bind(deleted_at)
        .bind(id.as_ref())
        .bind(creator_id)
        .execute(&self.pool)
        .await
        .map_err(|e| QuickNoteRepositoryError::OperationFailed(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }
}

/// Maps a raw `d_quick_note_v2` row to the [`QuickNote`] domain model.
fn row_to_quick_note(row: sqlx::postgres::PgRow) -> Result<QuickNote, sqlx::Error> {
    let raw_draft: String = row.try_get("draft")?;
    let draft = if raw_draft == ZERO_UUID {
        None
    } else {
        Some(TiptapId::new(raw_draft))
    };

    let raw_order: i32 = row.try_get("d_order")?;
    let order = if raw_order == -1 {
        None
    } else {
        Some(raw_order)
    };

    Ok(QuickNote::new(
        QuickNoteId::new(row.try_get::<String, _>("id")?),
        row.try_get("creator_id")?,
        row.try_get::<String, _>("title")?,
        draft,
        order,
        AuditFields::new(
            row.try_get("created_at")?,
            row.try_get("updated_at")?,
            row.try_get("server_version")?,
            row.try_get("is_deleted")?,
        ),
    ))
}
