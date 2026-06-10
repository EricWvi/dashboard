use only_application::{TiptapRepository, TiptapRepositoryError};
use only_domain::{AuditFields, HistoryEntry, TiptapId, TiptapV2};
use serde_json::Value;
use sqlx::{Pool, Postgres, Row as _};

/// PostgreSQL-backed implementation of [`TiptapRepository`] against the `d_tiptap_v2` table.
pub struct PostgresTiptapRepository {
    pool: Pool<Postgres>,
}

impl PostgresTiptapRepository {
    /// Wraps an existing connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

impl TiptapRepository for PostgresTiptapRepository {
    async fn create(&self, tiptap: TiptapV2) -> Result<TiptapV2, TiptapRepositoryError> {
        let content_str = serde_json::to_string(&tiptap.content)
            .map_err(|e| TiptapRepositoryError::OperationFailed(e.to_string()))?;

        let row = sqlx::query(
            r#"
            INSERT INTO d_tiptap_v2
                (id, creator_id, site, content, history, created_at, updated_at, is_deleted)
            VALUES ($1::uuid, $2, $3, $4::jsonb, '[]'::jsonb, $5, $6, FALSE)
            RETURNING id::text, creator_id, site, content::text, history::text,
                      created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(tiptap.id.as_ref())
        .bind(tiptap.creator_id)
        .bind(tiptap.site)
        .bind(&content_str)
        .bind(tiptap.audit_fields.created_at)
        .bind(tiptap.audit_fields.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| TiptapRepositoryError::OperationFailed(e.to_string()))?;

        row_to_tiptap(row).map_err(|e| TiptapRepositoryError::OperationFailed(e.to_string()))
    }

    async fn find_by_id_and_creator(
        &self,
        id: &TiptapId,
        creator_id: i32,
    ) -> Result<Option<TiptapV2>, TiptapRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT id::text, creator_id, site, content::text, history::text,
                   created_at, updated_at, server_version, is_deleted
            FROM d_tiptap_v2
            WHERE id = $1::uuid AND creator_id = $2 AND is_deleted = FALSE
            "#,
        )
        .bind(id.as_ref())
        .bind(creator_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| TiptapRepositoryError::OperationFailed(e.to_string()))?;

        row.map(|r| {
            row_to_tiptap(r).map_err(|e| TiptapRepositoryError::OperationFailed(e.to_string()))
        })
        .transpose()
    }

    async fn update_content(
        &self,
        id: &TiptapId,
        creator_id: i32,
        content: Value,
        updated_at: i64,
    ) -> Result<Option<TiptapV2>, TiptapRepositoryError> {
        let content_str = serde_json::to_string(&content)
            .map_err(|e| TiptapRepositoryError::OperationFailed(e.to_string()))?;

        // Atomically prepend {time: old updated_at, content: old content} to history,
        // then replace content and updated_at with the new values.
        let result = sqlx::query(
            r#"
            UPDATE d_tiptap_v2
            SET history   = jsonb_build_array(
                                jsonb_build_object('time', updated_at, 'content', content)
                            ) || history,
                content   = $1::jsonb,
                updated_at = $2
            WHERE id = $3::uuid AND creator_id = $4 AND is_deleted = FALSE
            RETURNING id::text, creator_id, site, content::text, history::text,
                      created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(&content_str)
        .bind(updated_at)
        .bind(id.as_ref())
        .bind(creator_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| TiptapRepositoryError::OperationFailed(e.to_string()))?;

        result
            .map(|r| {
                row_to_tiptap(r).map_err(|e| TiptapRepositoryError::OperationFailed(e.to_string()))
            })
            .transpose()
    }
}

/// Maps a raw `d_tiptap_v2` row to the [`TiptapV2`] domain model.
fn row_to_tiptap(row: sqlx::postgres::PgRow) -> Result<TiptapV2, sqlx::Error> {
    let content_text: String = row.try_get("content")?;
    let content = serde_json::from_str(&content_text).unwrap_or(Value::Object(Default::default()));

    let history_text: String = row.try_get("history")?;
    let history = parse_history(&history_text);

    Ok(TiptapV2::new(
        TiptapId::new(row.try_get::<String, _>("id")?),
        row.try_get("creator_id")?,
        row.try_get("site")?,
        content,
        history,
        AuditFields::new(
            row.try_get("created_at")?,
            row.try_get("updated_at")?,
            row.try_get("server_version")?,
            row.try_get("is_deleted")?,
        ),
    ))
}

/// Parses the history JSONB text into a vec of [`HistoryEntry`].
///
/// Malformed entries are silently skipped to avoid breaking reads on partial corruption.
fn parse_history(history_text: &str) -> Vec<HistoryEntry> {
    let arr: Vec<Value> = serde_json::from_str(history_text).unwrap_or_default();
    arr.into_iter()
        .filter_map(|v| {
            let time = v.get("time")?.as_i64()?;
            let content = v.get("content")?.clone();
            Some(HistoryEntry { time, content })
        })
        .collect()
}
