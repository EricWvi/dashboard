use only_application::{EntryFilter, EntryRepository, EntryRepositoryError};
use only_domain::{AuditFields, Entry, EntryId, TiptapId};
use sqlx::{Pool, Postgres, QueryBuilder, Row as _};
use time::OffsetDateTime;

/// Sentinel UUID string meaning "no linked draft".
const ZERO_UUID: &str = "00000000-0000-0000-0000-000000000000";

/// Number of entries returned per page (matches the original Go v2 constant).
const PAGE_SIZE: i64 = 8;

/// Number of entries returned by the random listing.
const RANDOM_SIZE: i64 = 8;

/// PostgreSQL-backed implementation of [`EntryRepository`] against the `d_entry_v2` table.
pub struct PostgresEntryRepository {
    pool: Pool<Postgres>,
}

impl PostgresEntryRepository {
    /// Wraps an existing connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

impl EntryRepository for PostgresEntryRepository {
    async fn create(&self, entry: Entry) -> Result<Entry, EntryRepositoryError> {
        let id_str = entry.id.as_ref();
        let draft_str = entry
            .draft
            .as_ref()
            .map(|d| d.as_ref().to_string())
            .unwrap_or_else(|| ZERO_UUID.to_string());
        let payload_str = serde_json::to_string(&entry.payload)
            .map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))?;

        let row = sqlx::query(
            r#"
            INSERT INTO d_entry_v2
                (id, creator_id, draft, payload, word_count, raw_text, bookmark, review_count,
                 created_at, updated_at, is_deleted)
            VALUES
                ($1::uuid, $2, $3::uuid, $4::jsonb, $5, $6, $7, $8, $9, $10, FALSE)
            RETURNING id::text, creator_id, draft::text, payload::text,
                      word_count, raw_text, bookmark, review_count,
                      created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(id_str)
        .bind(entry.creator_id)
        .bind(&draft_str)
        .bind(&payload_str)
        .bind(entry.word_count)
        .bind(&entry.raw_text)
        .bind(entry.bookmark)
        .bind(entry.review_count)
        .bind(entry.audit_fields.created_at)
        .bind(entry.audit_fields.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))?;

        row_to_entry(row).map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))
    }

    async fn find_by_id_and_creator(
        &self,
        id: &EntryId,
        creator_id: i32,
    ) -> Result<Option<Entry>, EntryRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT id::text, creator_id, draft::text, payload::text,
                   word_count, raw_text, bookmark, review_count,
                   created_at, updated_at, server_version, is_deleted
            FROM d_entry_v2
            WHERE id = $1::uuid AND creator_id = $2 AND is_deleted = FALSE
            "#,
        )
        .bind(id.as_ref())
        .bind(creator_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))?;

        row.map(|r| {
            row_to_entry(r).map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))
        })
        .transpose()
    }

    async fn list(
        &self,
        creator_id: i32,
        filter: &EntryFilter,
        page: u32,
    ) -> Result<(Vec<Entry>, bool), EntryRepositoryError> {
        let offset = (page.saturating_sub(1) as i64) * PAGE_SIZE;

        let mut qb = QueryBuilder::<Postgres>::new(
            r#"SELECT id::text, creator_id, draft::text, payload::text,
                      word_count, raw_text, bookmark, review_count,
                      created_at, updated_at, server_version, is_deleted
               FROM d_entry_v2
               WHERE creator_id = "#,
        );
        qb.push_bind(creator_id);
        qb.push(" AND is_deleted = FALSE");

        if let Some(tag) = &filter.tag {
            let tag_json = serde_json::json!([tag]).to_string();
            qb.push(" AND payload->'tags' @> ");
            qb.push_bind(tag_json);
            qb.push("::jsonb");
        }
        if let Some(contains) = &filter.contains {
            qb.push(" AND raw_text ILIKE ");
            qb.push_bind(format!("%{contains}%"));
        }
        if filter.bookmarked == Some(true) {
            qb.push(" AND bookmark = TRUE");
        }
        if let Some(on) = &filter.on {
            let (start_ms, end_ms) =
                parse_local_date_range(on).map_err(EntryRepositoryError::OperationFailed)?;
            qb.push(" AND created_at >= ");
            qb.push_bind(start_ms);
            qb.push(" AND created_at < ");
            qb.push_bind(end_ms);
        } else if let Some(before) = &filter.before {
            // Entries strictly before the start of the given date.
            let (start_ms, _) =
                parse_local_date_range(before).map_err(EntryRepositoryError::OperationFailed)?;
            qb.push(" AND created_at < ");
            qb.push_bind(start_ms);
        } else if filter.today {
            // Entries from the same calendar day (month + day) in any year.
            let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
            let month = now.month() as i32;
            let day = now.day() as i32;
            qb.push(" AND EXTRACT(MONTH FROM to_timestamp(created_at / 1000.0))::int = ");
            qb.push_bind(month);
            qb.push(" AND EXTRACT(DAY FROM to_timestamp(created_at / 1000.0))::int = ");
            qb.push_bind(day);
        }

        qb.push(" ORDER BY created_at DESC LIMIT ");
        qb.push_bind(PAGE_SIZE + 1);
        qb.push(" OFFSET ");
        qb.push_bind(offset);

        let rows = qb
            .build()
            .fetch_all(&self.pool)
            .await
            .map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))?;

        let mut entries: Vec<Entry> = rows
            .into_iter()
            .map(|r| {
                row_to_entry(r).map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))
            })
            .collect::<Result<_, _>>()?;

        let has_more = entries.len() > PAGE_SIZE as usize;
        if has_more {
            entries.truncate(PAGE_SIZE as usize);
        }

        Ok((entries, has_more))
    }

    async fn list_random(&self, creator_id: i32) -> Result<Vec<Entry>, EntryRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id::text, creator_id, draft::text, payload::text,
                   word_count, raw_text, bookmark, review_count,
                   created_at, updated_at, server_version, is_deleted
            FROM d_entry_v2
            WHERE creator_id = $1 AND is_deleted = FALSE
            ORDER BY RANDOM()
            LIMIT $2
            "#,
        )
        .bind(creator_id)
        .bind(RANDOM_SIZE)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))?;

        rows.into_iter()
            .map(|r| {
                row_to_entry(r).map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))
            })
            .collect()
    }

    async fn update(&self, entry: Entry) -> Result<Option<Entry>, EntryRepositoryError> {
        let draft_str = entry
            .draft
            .as_ref()
            .map(|d| d.as_ref().to_string())
            .unwrap_or_else(|| ZERO_UUID.to_string());
        let payload_str = serde_json::to_string(&entry.payload)
            .map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))?;

        let result = sqlx::query(
            r#"
            UPDATE d_entry_v2
            SET draft = $1::uuid, payload = $2::jsonb, word_count = $3, raw_text = $4,
                bookmark = $5, review_count = $6, updated_at = $7
            WHERE id = $8::uuid AND creator_id = $9 AND is_deleted = FALSE
            RETURNING id::text, creator_id, draft::text, payload::text,
                      word_count, raw_text, bookmark, review_count,
                      created_at, updated_at, server_version, is_deleted
            "#,
        )
        .bind(&draft_str)
        .bind(&payload_str)
        .bind(entry.word_count)
        .bind(&entry.raw_text)
        .bind(entry.bookmark)
        .bind(entry.review_count)
        .bind(entry.audit_fields.updated_at)
        .bind(entry.id.as_ref())
        .bind(entry.creator_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))?;

        result
            .map(|r| {
                row_to_entry(r).map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))
            })
            .transpose()
    }

    async fn soft_delete(
        &self,
        id: &EntryId,
        creator_id: i32,
        deleted_at: i64,
    ) -> Result<bool, EntryRepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE d_entry_v2
            SET is_deleted = TRUE, updated_at = $1
            WHERE id = $2::uuid AND creator_id = $3 AND is_deleted = FALSE
            "#,
        )
        .bind(deleted_at)
        .bind(id.as_ref())
        .bind(creator_id)
        .execute(&self.pool)
        .await
        .map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }

    async fn set_bookmark(
        &self,
        id: &EntryId,
        creator_id: i32,
        bookmark: bool,
        updated_at: i64,
    ) -> Result<bool, EntryRepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE d_entry_v2
            SET bookmark = $1, updated_at = $2
            WHERE id = $3::uuid AND creator_id = $4 AND is_deleted = FALSE
            "#,
        )
        .bind(bookmark)
        .bind(updated_at)
        .bind(id.as_ref())
        .bind(creator_id)
        .execute(&self.pool)
        .await
        .map_err(|e| EntryRepositoryError::OperationFailed(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }
}

/// Maps a `d_entry_v2` row to the [`Entry`] domain model.
fn row_to_entry(row: sqlx::postgres::PgRow) -> Result<Entry, sqlx::Error> {
    let raw_draft: String = row.try_get("draft")?;
    let draft = if raw_draft == ZERO_UUID {
        None
    } else {
        Some(TiptapId::new(raw_draft))
    };

    let payload_text: String = row.try_get("payload")?;
    let payload = serde_json::from_str(&payload_text)
        .unwrap_or(serde_json::Value::Object(serde_json::Map::default()));

    Ok(Entry::new(
        EntryId::new(row.try_get::<String, _>("id")?),
        row.try_get("creator_id")?,
        draft,
        payload,
        row.try_get("word_count")?,
        row.try_get::<String, _>("raw_text")?,
        row.try_get("bookmark")?,
        row.try_get("review_count")?,
        AuditFields::new(
            row.try_get("created_at")?,
            row.try_get("updated_at")?,
            row.try_get("server_version")?,
            row.try_get("is_deleted")?,
        ),
    ))
}

/// Parses a YYYY-MM-DD date string and returns the [start_ms, end_ms) range in local time.
fn parse_local_date_range(date_str: &str) -> Result<(i64, i64), String> {
    use time::{Date, Time, format_description};

    let format = format_description::parse("[year]-[month]-[day]").map_err(|e| e.to_string())?;
    let date = Date::parse(date_str, &format).map_err(|e| e.to_string())?;

    let local_offset = OffsetDateTime::now_local()
        .map(OffsetDateTime::offset)
        .unwrap_or(time::UtcOffset::UTC);

    let start = time::PrimitiveDateTime::new(date, Time::MIDNIGHT).assume_offset(local_offset);
    let start_ms = start.unix_timestamp() * 1000;
    let end_ms = start_ms + 86_400_000;

    Ok((start_ms, end_ms))
}
