use only_cache_sqlite::RepositoryPool;
use only_sync_schema::EntrySchemaV1;
use rusqlite::params;

use crate::{JournalError, SyncStatus};

/// Filter parameters for listing entries; all fields are optional and combined with AND.
///
/// Used by both [`EntryRepository::list`] and [`EntryRepository::search`] so callers
/// can combine FTS search with any subset of the other predicates.
#[derive(Debug, Default)]
pub struct EntryFilter {
    /// Include only entries whose payload.tags array contains this exact tag name.
    pub tag: Option<String>,
    /// Include only entries whose payload.location array starts with these path components
    /// in order. Each element must match the corresponding index exactly.
    pub location: Vec<String>,
    /// Include only bookmarked entries when true.
    pub bookmarked: bool,
    /// Include only entries created on this calendar date (YYYY-MM-DD, SQLite localtime).
    pub on: Option<String>,
    /// Include only entries created on or before this calendar date (YYYY-MM-DD, SQLite localtime).
    pub before: Option<String>,
    /// Include only entries whose local month+day matches today's.
    pub today: bool,
}

/// Selects the text-search strategy used by [`EntryRepository::query`].
enum TextSearch<'a> {
    /// Full-text search via FTS5 MATCH. Suitable for queries with ≥ 3 characters.
    Fts(&'a str),
    /// Substring match via LIKE `%query%`. Used for short queries that the FTS5
    /// tokenizer cannot process (< 3 characters).
    Like(&'a str),
}

/// Provides CRUD access to the entries table backed by a shared connection pool.
pub struct EntryRepository<'a> {
    pool: &'a RepositoryPool,
}

impl<'a> EntryRepository<'a> {
    pub(crate) fn new(pool: &'a RepositoryPool) -> Self {
        Self { pool }
    }

    /// Inserts or replaces an entry record with the given sync state.
    pub fn upsert(
        &self,
        entry: &EntrySchemaV1,
        sync_status: SyncStatus,
    ) -> Result<(), JournalError> {
        let draft = entry.draft.as_deref().unwrap_or("");
        let payload = serde_json::to_string(&entry.payload)?;
        self.pool.with_connection(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO entries \
                 (id, draft, payload, word_count, raw_text, bookmark, \
                  created_at, updated_at, is_deleted, sync_status) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    entry.id,
                    draft,
                    payload,
                    entry.word_count,
                    entry.raw_text,
                    entry.bookmark as i64,
                    entry.created_at,
                    entry.updated_at,
                    entry.is_deleted as i64,
                    sync_status as i64,
                ],
            )?;
            Ok(())
        })?;
        Ok(())
    }

    /// Returns the entry with the given id, or None if it does not exist.
    pub fn find_by_id(&self, id: &str) -> Result<Option<EntrySchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, draft, payload, word_count, raw_text, bookmark, \
                 created_at, updated_at, is_deleted \
                 FROM entries WHERE id = ?1",
            )?;
            let mut rows = stmt.query_map(params![id], map_row)?;
            Ok(rows.next().transpose()?)
        })?)
    }

    /// Returns non-deleted entries matching `filter`, ordered by creation time descending.
    pub fn list(&self, filter: &EntryFilter) -> Result<Vec<EntrySchemaV1>, JournalError> {
        self.query(None, filter)
    }

    /// Returns non-deleted entries matching `query` and `filter`, ordered by creation time
    /// descending. Short queries (< 3 chars) use LIKE substring matching because the FTS5
    /// tokenizer cannot produce a meaningful token from them.
    pub fn search(
        &self,
        query: &str,
        filter: &EntryFilter,
    ) -> Result<Vec<EntrySchemaV1>, JournalError> {
        let trimmed = query.trim();
        let mode = if trimmed.chars().count() < 3 {
            TextSearch::Like(trimmed)
        } else {
            TextSearch::Fts(trimmed)
        };
        self.query(Some(mode), filter)
    }

    /// Returns all entries (including deleted) with the given sync state.
    pub fn list_by_sync_status(
        &self,
        sync_status: SyncStatus,
    ) -> Result<Vec<EntrySchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, draft, payload, word_count, raw_text, bookmark, \
                 created_at, updated_at, is_deleted \
                 FROM entries WHERE sync_status = ?1",
            )?;
            Ok(stmt
                .query_map(params![sync_status as i64], map_row)?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }

    /// Returns the sum of word_count for all non-deleted entries.
    pub fn count_words(&self) -> Result<i64, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            Ok(conn.query_row(
                "SELECT COALESCE(SUM(word_count), 0) FROM entries WHERE is_deleted = 0",
                [],
                |row| row.get(0),
            )?)
        })?)
    }

    /// Returns the count of all non-deleted entries.
    pub fn count_all(&self) -> Result<i64, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            Ok(conn.query_row(
                "SELECT COUNT(*) FROM entries WHERE is_deleted = 0",
                [],
                |row| row.get(0),
            )?)
        })?)
    }

    /// Returns the count of non-deleted entries whose local creation date falls in the given year.
    pub fn count_by_year(&self, year: i32) -> Result<i64, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            Ok(conn.query_row(
                "SELECT COUNT(*) FROM entries WHERE is_deleted = 0 \
                 AND CAST(strftime('%Y', created_at / 1000, 'unixepoch', 'localtime') AS INTEGER) = ?1",
                params![year],
                |row| row.get(0),
            )?)
        })?)
    }

    /// Returns per-day entry counts for the current calendar year ordered by date ascending.
    /// Each tuple is `(date_string, count)`, e.g. `("2026-01-15", 3)`.
    pub fn count_current_year(&self) -> Result<Vec<(String, i32)>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch', 'localtime') AS date, \
                        COUNT(*) AS cnt \
                 FROM entries \
                 WHERE is_deleted = 0 \
                   AND CAST(strftime('%Y', created_at / 1000, 'unixepoch', 'localtime') AS INTEGER) \
                       = CAST(strftime('%Y', 'now', 'localtime') AS INTEGER) \
                 GROUP BY date \
                 ORDER BY date ASC",
            )?;
            Ok(stmt
                .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }

    /// Returns distinct `(year, month, day)` tuples for all non-deleted entries,
    /// ordered year DESC, month DESC, day DESC.
    pub fn list_date_parts(&self) -> Result<Vec<(i32, i32, i32)>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT DISTINCT \
                    CAST(strftime('%Y', created_at / 1000, 'unixepoch', 'localtime') AS INTEGER), \
                    CAST(strftime('%m', created_at / 1000, 'unixepoch', 'localtime') AS INTEGER), \
                    CAST(strftime('%d', created_at / 1000, 'unixepoch', 'localtime') AS INTEGER) \
                 FROM entries \
                 WHERE is_deleted = 0 \
                 ORDER BY 1 DESC, 2 DESC, 3 DESC",
            )?;
            Ok(stmt
                .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }

    /// Updates the sync state of a single entry identified by id.
    pub fn update_sync_status(
        &self,
        id: &str,
        sync_status: SyncStatus,
    ) -> Result<(), JournalError> {
        self.pool.with_connection(|conn| {
            conn.execute(
                "UPDATE entries SET sync_status = ?1 WHERE id = ?2",
                params![sync_status as i64, id],
            )?;
            Ok(())
        })?;
        Ok(())
    }

    /// Shared SQL builder used by both `list` and `search`.
    ///
    /// When `search` is `Some(TextSearch::Fts(_))` the FROM clause joins `entries_fts` and a
    /// MATCH predicate is prepended. When it is `Some(TextSearch::Like(_))` a LIKE substring
    /// predicate on `raw_text` is used instead, which handles short queries the FTS tokenizer
    /// cannot process.
    fn query(
        &self,
        search: Option<TextSearch<'_>>,
        filter: &EntryFilter,
    ) -> Result<Vec<EntrySchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut where_parts: Vec<String> = vec!["e.is_deleted = 0".to_string()];
            // Positional bind values; Box<dyn ToSql> lets us mix types without generics.
            let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

            match &search {
                Some(TextSearch::Fts(q)) => {
                    // FTS MATCH must be first so SQLite evaluates the index before other predicates.
                    where_parts.push("entries_fts MATCH ?".to_string());
                    values.push(Box::new(q.to_string()));
                }
                Some(TextSearch::Like(q)) => {
                    where_parts.push("e.raw_text LIKE ?".to_string());
                    values.push(Box::new(format!("%{q}%")));
                }
                None => {}
            }

            if let Some(tag) = &filter.tag {
                where_parts.push(
                    "EXISTS (SELECT 1 FROM json_each(json_extract(e.payload, '$.tags')) \
                     WHERE value = ?)"
                        .to_string(),
                );
                values.push(Box::new(tag.clone()));
            }
            if !filter.location.is_empty() {
                where_parts.push(
                    "COALESCE(json_array_length(json_extract(e.payload, '$.location')), 0) >= ?"
                        .to_string(),
                );
                values.push(Box::new(filter.location.len() as i64));
                for (i, component) in filter.location.iter().enumerate() {
                    where_parts.push(format!("json_extract(e.payload, '$.location[{i}]') = ?"));
                    values.push(Box::new(component.clone()));
                }
            }
            if filter.bookmarked {
                where_parts.push("e.bookmark = 1".to_string());
            }
            if let Some(on) = &filter.on {
                where_parts.push(
                    "strftime('%Y-%m-%d', e.created_at / 1000, 'unixepoch', 'localtime') = ?"
                        .to_string(),
                );
                values.push(Box::new(on.clone()));
            } else if let Some(before) = &filter.before {
                where_parts.push(
                    "strftime('%Y-%m-%d', e.created_at / 1000, 'unixepoch', 'localtime') <= ?"
                        .to_string(),
                );
                values.push(Box::new(before.clone()));
            } else if filter.today {
                where_parts.push(
                    "strftime('%m-%d', e.created_at / 1000, 'unixepoch', 'localtime') \
                     = strftime('%m-%d', 'now', 'localtime')"
                        .to_string(),
                );
            }

            let from = if matches!(search, Some(TextSearch::Fts(_))) {
                "entries e JOIN entries_fts ON e.id = entries_fts.id"
            } else {
                "entries e"
            };
            let sql = format!(
                "SELECT e.id, e.draft, e.payload, e.word_count, e.raw_text, e.bookmark, \
                 e.created_at, e.updated_at, e.is_deleted \
                 FROM {from} WHERE {} ORDER BY e.created_at DESC",
                where_parts.join(" AND "),
            );

            let params_refs: Vec<&dyn rusqlite::types::ToSql> =
                values.iter().map(std::convert::AsRef::as_ref).collect();
            let mut stmt = conn.prepare(&sql)?;
            Ok(stmt
                .query_map(params_refs.as_slice(), map_row)?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }
}

fn json_from_str<T: serde::de::DeserializeOwned>(s: &str) -> rusqlite::Result<T> {
    serde_json::from_str(s).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e))
    })
}

fn map_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<EntrySchemaV1> {
    let draft: String = row.get(1)?;
    let payload_str: String = row.get(2)?;
    Ok(EntrySchemaV1 {
        id: row.get(0)?,
        draft: if draft.is_empty() { None } else { Some(draft) },
        payload: json_from_str(&payload_str)?,
        word_count: row.get::<_, i32>(3)?,
        raw_text: row.get(4)?,
        bookmark: row.get::<_, i64>(5)? != 0,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        is_deleted: row.get::<_, i64>(8)? != 0,
    })
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;
    use serde_json::json;

    use crate::repository::entry::EntryFilter;
    use crate::{JournalDb, SyncStatus};

    fn entry(id: &str, created_at: i64) -> only_sync_schema::EntrySchemaV1 {
        only_sync_schema::EntrySchemaV1 {
            id: id.to_string(),
            draft: None,
            payload: json!({}),
            word_count: 3,
            raw_text: "hello world test".to_string(),
            bookmark: false,
            created_at,
            updated_at: created_at,
            is_deleted: false,
        }
    }

    #[test]
    fn upsert_and_find_by_id() {
        let db = JournalDb::in_memory().unwrap();
        let e = entry("e1", 1000);
        db.entries().upsert(&e, SyncStatus::Synced).unwrap();
        assert_eq!(db.entries().find_by_id("e1").unwrap(), Some(e));
    }

    #[test]
    fn find_by_id_returns_none_for_missing_entry() {
        let db = JournalDb::in_memory().unwrap();
        assert_eq!(db.entries().find_by_id("missing").unwrap(), None);
    }

    #[test]
    fn list_excludes_deleted_entries() {
        let db = JournalDb::in_memory().unwrap();
        db.entries()
            .upsert(&entry("e1", 1000), SyncStatus::Synced)
            .unwrap();
        let mut deleted = entry("e2", 2000);
        deleted.is_deleted = true;
        db.entries().upsert(&deleted, SyncStatus::Synced).unwrap();
        let ids: Vec<_> = db
            .entries()
            .list(&EntryFilter::default())
            .unwrap()
            .into_iter()
            .map(|e| e.id)
            .collect();
        assert_eq!(ids, vec!["e1"]);
    }

    #[test]
    fn upsert_twice_overwrites_entry() {
        let db = JournalDb::in_memory().unwrap();
        db.entries()
            .upsert(&entry("e1", 1000), SyncStatus::Synced)
            .unwrap();
        let mut updated = entry("e1", 1000);
        updated.word_count = 99;
        db.entries().upsert(&updated, SyncStatus::Synced).unwrap();
        assert_eq!(
            db.entries().find_by_id("e1").unwrap().unwrap().word_count,
            99
        );
    }

    #[test]
    fn list_by_sync_status_filters_correctly() {
        let db = JournalDb::in_memory().unwrap();
        db.entries()
            .upsert(&entry("e1", 1000), SyncStatus::Synced)
            .unwrap();
        db.entries()
            .upsert(&entry("e2", 2000), SyncStatus::Pending)
            .unwrap();
        let ids: Vec<_> = db
            .entries()
            .list_by_sync_status(SyncStatus::Pending)
            .unwrap()
            .into_iter()
            .map(|e| e.id)
            .collect();
        assert_eq!(ids, vec!["e2"]);
    }

    #[test]
    fn list_filter_bookmarked() {
        let db = JournalDb::in_memory().unwrap();
        db.entries()
            .upsert(&entry("e1", 1000), SyncStatus::Synced)
            .unwrap();
        let mut bookmarked = entry("e2", 2000);
        bookmarked.bookmark = true;
        db.entries()
            .upsert(&bookmarked, SyncStatus::Synced)
            .unwrap();
        let ids: Vec<_> = db
            .entries()
            .list(&EntryFilter {
                bookmarked: true,
                ..Default::default()
            })
            .unwrap()
            .into_iter()
            .map(|e| e.id)
            .collect();
        assert_eq!(ids, vec!["e2"]);
    }

    #[test]
    fn list_filter_tag() {
        let db = JournalDb::in_memory().unwrap();
        let mut tagged = entry("e1", 1000);
        tagged.payload = json!({"tags": ["rust"]});
        db.entries().upsert(&tagged, SyncStatus::Synced).unwrap();
        db.entries()
            .upsert(&entry("e2", 2000), SyncStatus::Synced)
            .unwrap();
        let ids: Vec<_> = db
            .entries()
            .list(&EntryFilter {
                tag: Some("rust".to_string()),
                ..Default::default()
            })
            .unwrap()
            .into_iter()
            .map(|e| e.id)
            .collect();
        assert_eq!(ids, vec!["e1"]);
    }

    #[test]
    fn search_finds_entries_by_raw_text() {
        let db = JournalDb::in_memory().unwrap();
        db.entries()
            .upsert(&entry("e1", 1000), SyncStatus::Synced)
            .unwrap();
        let results = db
            .entries()
            .search("hello", &EntryFilter::default())
            .unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "e1");
    }
}
