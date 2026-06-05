use only_application::{TodoRepository, TodoRepositoryError};
use only_domain::{AuditFields, CollectionId, TiptapId, Todo, TodoId};
use sqlx::{Pool, Postgres, Row as _};
use time::OffsetDateTime;

/// Epoch millisecond sentinel equivalent to 2096-10-02 00:00:00 UTC.
///
/// Used in `list_all_planned` to exclude far-future placeholder schedules that were
/// never meant to represent real scheduling intent, matching the original Go filter.
const SCHEDULE_FAR_FUTURE_MS: i64 = 3_999_139_200_000;

/// PostgreSQL-backed implementation of [`TodoRepository`] against the `d_todo_v2` table.
pub struct PostgresTodoRepository {
    pool: Pool<Postgres>,
}

impl PostgresTodoRepository {
    /// Wraps an existing connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

impl TodoRepository for PostgresTodoRepository {
    async fn list_all_planned(&self, creator_id: i32) -> Result<Vec<Todo>, TodoRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id::text, creator_id, title, completed, collection_id::text,
                   difficulty, d_order, link, draft::text, schedule, done,
                   d_count, kanban::text, created_at, updated_at, server_version, is_deleted
            FROM d_todo_v2
            WHERE creator_id = $1
              AND completed = FALSE
              AND collection_id != '00000000-0000-0000-0000-000000000000'
              AND (schedule IS NULL OR schedule < $2)
              AND is_deleted = FALSE
            "#,
        )
        .bind(creator_id)
        .bind(SCHEDULE_FAR_FUTURE_MS)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| TodoRepositoryError::OperationFailed(e.to_string()))?;

        rows.into_iter()
            .map(|r| {
                row_to_todo(r).map_err(|e| TodoRepositoryError::OperationFailed(e.to_string()))
            })
            .collect()
    }

    async fn list_today(&self, creator_id: i32) -> Result<Vec<Todo>, TodoRepositoryError> {
        // Compute local day boundaries in milliseconds for a DB-agnostic range query.
        let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
        let day_start_ms = now
            .replace_time(time::Time::MIDNIGHT)
            .unix_timestamp_nanos() as i64
            / 1_000_000;
        let day_end_ms = day_start_ms + 86_400_000; // + 24 h in ms

        let rows = sqlx::query(
            r#"
            SELECT id::text, creator_id, title, completed, collection_id::text,
                   difficulty, d_order, link, draft::text, schedule, done,
                   d_count, kanban::text, created_at, updated_at, server_version, is_deleted
            FROM d_todo_v2
            WHERE creator_id = $1
              AND completed = FALSE
              AND schedule >= $2
              AND schedule < $3
              AND is_deleted = FALSE
            "#,
        )
        .bind(creator_id)
        .bind(day_start_ms)
        .bind(day_end_ms)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| TodoRepositoryError::OperationFailed(e.to_string()))?;

        rows.into_iter()
            .map(|r| {
                row_to_todo(r).map_err(|e| TodoRepositoryError::OperationFailed(e.to_string()))
            })
            .collect()
    }

    async fn set_schedule_for_ids(
        &self,
        ids: &[TodoId],
        schedule_ms: i64,
        creator_id: i32,
    ) -> Result<(), TodoRepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        let id_strings: Vec<&str> = ids.iter().map(TodoId::as_ref).collect();
        sqlx::query(
            r#"
            UPDATE d_todo_v2
            SET schedule = $1, done = FALSE, updated_at = $2
            WHERE creator_id = $3
              AND completed = FALSE
              AND id::text = ANY($4)
              AND is_deleted = FALSE
            "#,
        )
        .bind(schedule_ms)
        .bind(schedule_ms)
        .bind(creator_id)
        .bind(&id_strings)
        .execute(&self.pool)
        .await
        .map_err(|e| TodoRepositoryError::OperationFailed(e.to_string()))?;

        Ok(())
    }

    async fn soft_delete_by_collection(
        &self,
        collection_id: &CollectionId,
        creator_id: i32,
        deleted_at: i64,
    ) -> Result<(), TodoRepositoryError> {
        sqlx::query(
            r#"
            UPDATE d_todo_v2
            SET is_deleted = TRUE, updated_at = $1
            WHERE collection_id = $2::uuid AND creator_id = $3 AND is_deleted = FALSE
            "#,
        )
        .bind(deleted_at)
        .bind(collection_id.as_ref())
        .bind(creator_id)
        .execute(&self.pool)
        .await
        .map_err(|e| TodoRepositoryError::OperationFailed(e.to_string()))?;

        Ok(())
    }
}

/// The zero UUID string used as a sentinel for "no collection" (inbox) in the v2 schema.
const ZERO_UUID: &str = "00000000-0000-0000-0000-000000000000";

/// Maps a raw `d_todo_v2` row to the [`Todo`] domain model.
///
/// Zero-UUID columns (collection_id, draft, kanban) are mapped to `None` as per the domain convention.
/// The difficulty sentinel value of -1 stored in the DB is mapped to `None`.
fn row_to_todo(row: sqlx::postgres::PgRow) -> Result<Todo, sqlx::Error> {
    let raw_collection_id: String = row.try_get("collection_id")?;
    let collection_id = if raw_collection_id == ZERO_UUID {
        None
    } else {
        Some(CollectionId::new(raw_collection_id))
    };

    let raw_draft: String = row.try_get("draft")?;
    let draft = if raw_draft == ZERO_UUID {
        None
    } else {
        Some(TiptapId::new(raw_draft))
    };

    let raw_kanban: String = row.try_get("kanban")?;
    let kanban = if raw_kanban == ZERO_UUID {
        None
    } else {
        Some(raw_kanban)
    };

    let raw_difficulty: i32 = row.try_get("difficulty")?;
    let difficulty = if raw_difficulty == -1 {
        None
    } else {
        Some(raw_difficulty)
    };

    let raw_order: i32 = row.try_get("d_order")?;
    // The schema stores 1 as the default; None means unordered only if 0 is sentinel.
    // Keep parity with Go which exposes the raw value directly.
    let order = Some(raw_order);

    Ok(Todo::new(
        TodoId::new(row.try_get::<String, _>("id")?),
        row.try_get("creator_id")?,
        row.try_get::<String, _>("title")?,
        row.try_get("completed")?,
        collection_id,
        difficulty,
        order,
        row.try_get::<Option<String>, _>("link")?,
        draft,
        row.try_get("schedule")?,
        row.try_get("done")?,
        row.try_get("d_count")?,
        kanban,
        AuditFields::new(
            row.try_get("created_at")?,
            row.try_get("updated_at")?,
            row.try_get("server_version")?,
            row.try_get("is_deleted")?,
        ),
    ))
}
