use app_sqlite::{DatabaseError, RepositoryPool};
use rusqlite::{Connection, OptionalExtension, Result as SqliteResult, Row, params};

use crate::{
    Entry, EntryField, EntryMeta, GetEntriesResult, HistoryEntry, JournalData, JournalError,
    QueryCondition, Statistic, SyncMeta, Tag, TagField, TiptapV2, TiptapV2Field, User,
};

const SYNC_STATUS_SYNCED: i64 = 1;
const SYNC_STATUS_PENDING: i64 = 2;
const USER_KEY: &str = "current_user";

const STATISTIC_KEY_WORDS_COUNT: &str = "wordsCount";
const STATISTIC_KEY_CURRENT_YEAR: &str = "currentYear";
const STATISTIC_KEY_ENTRY_DATE: &str = "entryDate";
const STATISTIC_KEY_ALL_DATES: &str = "allDates";

pub struct JournalRepository {
    pool: RepositoryPool,
}

impl JournalRepository {
    pub fn new(pool: RepositoryPool) -> Self {
        Self { pool }
    }

    pub fn get_user(&self) -> Result<Option<User>, JournalError> {
        self.pool.with_connection(|connection| {
            let mut statement = connection.prepare(
                "SELECT key, username, email, avatar, language, updated_at, sync_status FROM user WHERE key = ?1",
            )?;
            let user = statement
                .query_row(params![USER_KEY], Self::row_to_user)
                .optional()?;
            Ok(user)
        }).map_err(JournalError::from)
    }

    pub fn put_user(&self, user: &User) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            connection.execute(
                "INSERT OR REPLACE INTO user (key, username, email, avatar, language, updated_at, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![USER_KEY, user.username, user.email, user.avatar, user.language, user.updated_at, user.sync_status],
            )?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn get_entry(&self, id: &str) -> Result<Option<Entry>, JournalError> {
        self.pool.with_connection(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status FROM entries WHERE id = ?1",
            )?;
            let entry = statement.query_row(params![id], Self::row_to_entry).optional()?;
            Ok(entry)
        }).map_err(JournalError::from)
    }

    pub fn get_entries(
        &self,
        page: i64,
        condition: &[QueryCondition],
    ) -> Result<GetEntriesResult, JournalError> {
        self.pool.with_connection(|connection| {
            let page_size = 8_i64;
            let offset = (page.max(1) - 1) * page_size;

            let search_text = condition.iter().any(|c| c.operator == "contains");
            let mut where_parts = vec!["e.is_deleted = 0".to_string()];
            let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

            if search_text {
                where_parts.push("s.raw_text MATCH ?".to_string());
                if let Some(text) = condition
                    .iter()
                    .find(|c| c.operator == "contains")
                    .and_then(|c| c.value.as_str())
                {
                    values.push(Box::new(text.to_string()));
                }
            }

            for cond in condition {
                match cond.operator.as_str() {
                    "tag" => {
                        if let Some(tag) = cond.value.as_str() {
                            where_parts.push("EXISTS (SELECT 1 FROM json_each(json_extract(e.payload, '$.tags')) WHERE value = ?)".to_string());
                            values.push(Box::new(tag.to_string()));
                        }
                    }
                    "location" => {
                        if let Some(loc) = cond.value.as_array() {
                            where_parts.push("COALESCE(json_array_length(json_extract(e.payload, '$.location')), 0) >= ?".to_string());
                            values.push(Box::new(loc.len() as i64));
                            for (index, value) in loc.iter().enumerate() {
                                if let Some(item) = value.as_str() {
                                    where_parts.push(format!(
                                        "json_extract(e.payload, '$.location[{index}]') = ?"
                                    ));
                                    values.push(Box::new(item.to_string()));
                                }
                            }
                        }
                    }
                    "todays" => {
                        where_parts.push("strftime('%m-%d', e.created_at / 1000, 'unixepoch', 'localtime') = strftime('%m-%d', 'now', 'localtime')".to_string());
                    }
                    "bookmarked" => {
                        where_parts.push("e.bookmark = 1".to_string());
                    }
                    "on" => {
                        if let Some(value) = cond.value.as_str() {
                            where_parts.push("strftime('%Y-%m-%d', e.created_at / 1000, 'unixepoch', 'localtime') = ?".to_string());
                            values.push(Box::new(value.to_string()));
                        }
                    }
                    "before" => {
                        if let Some(value) = cond.value.as_str() {
                            where_parts.push("strftime('%Y-%m-%d', e.created_at / 1000, 'unixepoch', 'localtime') <= ?".to_string());
                            values.push(Box::new(value.to_string()));
                        }
                    }
                    _ => {}
                }
            }

            let mut sql = format!(
                "SELECT e.id, e.draft, CAST(strftime('%Y', e.created_at / 1000, 'unixepoch', 'localtime') AS INTEGER), CAST(strftime('%m', e.created_at / 1000, 'unixepoch', 'localtime') AS INTEGER), CAST(strftime('%d', e.created_at / 1000, 'unixepoch', 'localtime') AS INTEGER) FROM {} WHERE {}",
                if search_text {
                    "entries e JOIN entries_raw_text_search s ON e.id = s.id"
                } else {
                    "entries e"
                },
                where_parts.join(" AND ")
            );
            sql.push_str(" ORDER BY e.created_at DESC LIMIT ? OFFSET ?");
            values.push(Box::new(page_size + 1));
            values.push(Box::new(offset));

            let params_refs: Vec<&dyn rusqlite::types::ToSql> =
                values.iter().map(|value| value.as_ref()).collect();
            let mut statement = connection.prepare(&sql)?;
            let rows = statement.query_map(params_refs.as_slice(), |row| {
                Ok(EntryMeta {
                    id: row.get(0)?,
                    draft: row.get(1)?,
                    year: row.get(2)?,
                    month: row.get(3)?,
                    day: row.get(4)?,
                })
            })?;

            let mut entries = rows.collect::<SqliteResult<Vec<_>>>()?;
            let has_more = entries.len() > page_size as usize;
            if has_more {
                entries.truncate(page_size as usize);
            }

            Ok(GetEntriesResult { entries, has_more })
        }).map_err(JournalError::from)
    }

    pub fn add_entry(&self, entry: &EntryField) -> Result<String, JournalError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = current_time_ms();
        self.pool.with_connection(|connection| {
            connection.execute(
                "INSERT INTO entries (id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9)",
                params![id, entry.draft, serde_json::to_string(&entry.payload)?, entry.word_count, entry.raw_text, bool_to_i64(entry.bookmark), now, now, SYNC_STATUS_PENDING],
            )?;
            Ok(())
        })?;
        self.on_entry_create(now, entry.word_count)?;
        Ok(id)
    }

    pub fn put_entry(&self, entry: &Entry) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            connection.execute(
                "INSERT OR REPLACE INTO entries (id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![entry.id, entry.draft, serde_json::to_string(&entry.payload)?, entry.word_count, entry.raw_text, bool_to_i64(entry.bookmark), entry.created_at, entry.updated_at, bool_to_i64(entry.is_deleted), entry.sync_status],
            )?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn put_entries(&self, entries: &[Entry]) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            let transaction = connection.unchecked_transaction()?;
            for entry in entries {
                transaction.execute(
                    "INSERT OR REPLACE INTO entries (id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    params![entry.id, entry.draft, serde_json::to_string(&entry.payload)?, entry.word_count, entry.raw_text, bool_to_i64(entry.bookmark), entry.created_at, entry.updated_at, bool_to_i64(entry.is_deleted), entry.sync_status],
                )?;
            }
            transaction.commit()?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn update_entry(&self, id: &str, updates: &serde_json::Value) -> Result<(), JournalError> {
        let old_word_count = self
            .get_entry(id)?
            .map(|entry| entry.word_count)
            .unwrap_or(0);

        self.pool.with_connection(|connection| {
            let now = current_time_ms();
            let empty = serde_json::Map::new();
            let object = updates.as_object().unwrap_or(&empty);

            if object.is_empty() {
                connection.execute(
                    "UPDATE entries SET updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                    params![now, SYNC_STATUS_PENDING, id],
                )?;
                return Ok(());
            }

            let mut set_parts = Vec::new();
            let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

            for (key, value) in object {
                set_parts.push(format!("{} = ?", camel_to_snake(key)));
                match value {
                    serde_json::Value::String(text) => values.push(Box::new(text.clone())),
                    serde_json::Value::Number(number) => {
                        if let Some(integer) = number.as_i64() {
                            values.push(Box::new(integer));
                        } else if let Some(float) = number.as_f64() {
                            values.push(Box::new(float));
                        }
                    }
                    serde_json::Value::Bool(boolean) => {
                        values.push(Box::new(bool_to_i64(*boolean)));
                    }
                    _ => values.push(Box::new(serde_json::to_string(value)?)),
                }
            }

            set_parts.push("updated_at = ?".to_string());
            values.push(Box::new(now));
            set_parts.push("sync_status = ?".to_string());
            values.push(Box::new(SYNC_STATUS_PENDING));
            values.push(Box::new(id.to_string()));

            let sql = format!("UPDATE entries SET {} WHERE id = ?", set_parts.join(", "));
            let refs: Vec<&dyn rusqlite::types::ToSql> =
                values.iter().map(|value| value.as_ref()).collect();
            connection.execute(&sql, refs.as_slice())?;
            Ok(())
        })?;

        if let Some(new_word_count) = updates.get("wordCount").and_then(|value| value.as_i64()) {
            if new_word_count != old_word_count {
                self.on_entry_update(old_word_count, new_word_count)?;
            }
        }

        Ok(())
    }

    pub fn delete_entry(&self, id: &str) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                connection.execute("DELETE FROM entries WHERE id = ?1", params![id])?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn soft_delete_entry(&self, id: &str) -> Result<(), JournalError> {
        let old = self.get_entry(id)?;
        self.pool.with_connection(|connection| {
            connection.execute(
                "UPDATE entries SET is_deleted = 1, updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                params![current_time_ms(), SYNC_STATUS_PENDING, id],
            )?;
            Ok(())
        })?;

        if let Some(entry) = old {
            self.on_entry_delete(entry.created_at, entry.word_count)?;
        }

        Ok(())
    }

    pub fn mark_entry_synced(&self, id: &str, updated_at: i64) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                connection.execute(
                    "UPDATE entries SET sync_status = ?1 WHERE id = ?2 AND updated_at = ?3",
                    params![SYNC_STATUS_SYNCED, id, updated_at],
                )?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn get_tag(&self, id: &str) -> Result<Option<Tag>, JournalError> {
        self.pool.with_connection(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, name, created_at, updated_at, is_deleted, sync_status FROM tags WHERE id = ?1",
            )?;
            let tag = statement.query_row(params![id], Self::row_to_tag).optional()?;
            Ok(tag)
        }).map_err(JournalError::from)
    }

    pub fn get_all_tags(&self) -> Result<Vec<Tag>, JournalError> {
        self.pool.with_connection(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, name, created_at, updated_at, is_deleted, sync_status FROM tags WHERE is_deleted = 0",
            )?;
            let rows = statement.query_map([], Self::row_to_tag)?;
            Ok(rows.collect::<SqliteResult<Vec<_>>>()?)
        }).map_err(JournalError::from)
    }

    pub fn add_tag(&self, tag: &TagField) -> Result<String, JournalError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = current_time_ms();
        self.pool.with_connection(|connection| {
            connection.execute(
                "INSERT INTO tags (id, name, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
                params![id, tag.name, now, now, SYNC_STATUS_PENDING],
            )?;
            Ok(())
        })?;
        Ok(id)
    }

    pub fn put_tag(&self, tag: &Tag) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            connection.execute(
                "INSERT OR REPLACE INTO tags (id, name, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![tag.id, tag.name, tag.created_at, tag.updated_at, bool_to_i64(tag.is_deleted), tag.sync_status],
            )?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn put_tags(&self, tags: &[Tag]) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            let transaction = connection.unchecked_transaction()?;
            for tag in tags {
                transaction.execute(
                    "INSERT OR REPLACE INTO tags (id, name, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![tag.id, tag.name, tag.created_at, tag.updated_at, bool_to_i64(tag.is_deleted), tag.sync_status],
                )?;
            }
            transaction.commit()?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn update_tag(&self, id: &str, updates: &serde_json::Value) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                let now = current_time_ms();
                let name = updates.get("name").and_then(|value| value.as_str());
                if let Some(name) = name {
                    connection.execute(
                    "UPDATE tags SET name = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4",
                    params![name, now, SYNC_STATUS_PENDING, id],
                )?;
                } else {
                    connection.execute(
                        "UPDATE tags SET updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                        params![now, SYNC_STATUS_PENDING, id],
                    )?;
                }
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn delete_tag(&self, id: &str) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                connection.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn soft_delete_tag(&self, id: &str) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                connection.execute(
                "UPDATE tags SET is_deleted = 1, updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                params![current_time_ms(), SYNC_STATUS_PENDING, id],
            )?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn mark_tag_synced(&self, id: &str, updated_at: i64) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                connection.execute(
                    "UPDATE tags SET sync_status = ?1 WHERE id = ?2 AND updated_at = ?3",
                    params![SYNC_STATUS_SYNCED, id, updated_at],
                )?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn get_tiptap(&self, id: &str) -> Result<Option<TiptapV2>, JournalError> {
        self.pool.with_connection(|connection| {
            let mut statement = connection.prepare(
                "SELECT id, content, history, created_at, updated_at, is_deleted, sync_status FROM tiptaps WHERE id = ?1",
            )?;
            let tiptap = statement.query_row(params![id], Self::row_to_tiptap).optional()?;
            Ok(tiptap)
        }).map_err(JournalError::from)
    }

    pub fn add_tiptap(&self, tiptap: &TiptapV2Field) -> Result<String, JournalError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = current_time_ms();
        self.pool.with_connection(|connection| {
            connection.execute(
                "INSERT INTO tiptaps (id, content, history, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
                params![id, serde_json::to_string(&tiptap.content)?, serde_json::to_string(&tiptap.history)?, now, now, SYNC_STATUS_PENDING],
            )?;
            Ok(())
        })?;
        Ok(id)
    }

    pub fn put_tiptap(&self, tiptap: &TiptapV2) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            connection.execute(
                "INSERT OR REPLACE INTO tiptaps (id, content, history, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![tiptap.id, serde_json::to_string(&tiptap.content)?, serde_json::to_string(&tiptap.history)?, tiptap.created_at, tiptap.updated_at, bool_to_i64(tiptap.is_deleted), tiptap.sync_status],
            )?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn put_tiptaps(&self, tiptaps: &[TiptapV2]) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            let transaction = connection.unchecked_transaction()?;
            for tiptap in tiptaps {
                transaction.execute(
                    "INSERT OR REPLACE INTO tiptaps (id, content, history, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![tiptap.id, serde_json::to_string(&tiptap.content)?, serde_json::to_string(&tiptap.history)?, tiptap.created_at, tiptap.updated_at, bool_to_i64(tiptap.is_deleted), tiptap.sync_status],
                )?;
            }
            transaction.commit()?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn sync_tiptap(&self, id: &str, content: &serde_json::Value) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            connection.execute(
                "UPDATE tiptaps SET content = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4",
                params![serde_json::to_string(content)?, current_time_ms(), SYNC_STATUS_PENDING, id],
            )?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn update_tiptap(&self, id: &str, updates: &serde_json::Value) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            let now = current_time_ms();
            let content = updates
                .get("content")
                .map(serde_json::to_string)
                .transpose()?;
            let history = updates
                .get("history")
                .map(serde_json::to_string)
                .transpose()?;

            match (content, history) {
                (Some(content), Some(history)) => connection.execute(
                    "UPDATE tiptaps SET content = ?1, history = ?2, updated_at = ?3, sync_status = ?4 WHERE id = ?5",
                    params![content, history, now, SYNC_STATUS_PENDING, id],
                )?,
                (Some(content), None) => connection.execute(
                    "UPDATE tiptaps SET content = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4",
                    params![content, now, SYNC_STATUS_PENDING, id],
                )?,
                (None, Some(history)) => connection.execute(
                    "UPDATE tiptaps SET history = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4",
                    params![history, now, SYNC_STATUS_PENDING, id],
                )?,
                (None, None) => connection.execute(
                    "UPDATE tiptaps SET updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                    params![now, SYNC_STATUS_PENDING, id],
                )?,
            };

            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn delete_tiptap(&self, id: &str) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                connection.execute("DELETE FROM tiptaps WHERE id = ?1", params![id])?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn soft_delete_tiptap(&self, id: &str) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            connection.execute(
                "UPDATE tiptaps SET is_deleted = 1, updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                params![current_time_ms(), SYNC_STATUS_PENDING, id],
            )?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn mark_tiptap_synced(&self, id: &str, updated_at: i64) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                connection.execute(
                    "UPDATE tiptaps SET sync_status = ?1 WHERE id = ?2 AND updated_at = ?3",
                    params![SYNC_STATUS_SYNCED, id, updated_at],
                )?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn list_tiptap_history(&self, id: &str) -> Result<Vec<i64>, JournalError> {
        Ok(self
            .get_tiptap(id)?
            .map(|item| item.history.into_iter().map(|entry| entry.time).collect())
            .unwrap_or_default())
    }

    pub fn get_tiptap_history(&self, id: &str, ts: i64) -> Result<serde_json::Value, JournalError> {
        let tiptap = self
            .get_tiptap(id)?
            .ok_or(rusqlite::Error::QueryReturnedNoRows)?;
        tiptap
            .history
            .into_iter()
            .find(|entry| entry.time == ts)
            .map(|entry| entry.content)
            .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows.into())
    }

    pub fn restore_tiptap_history(&self, id: &str, ts: i64) -> Result<(), JournalError> {
        let content = self.get_tiptap_history(id, ts)?;
        self.sync_tiptap(id, &content)
    }

    pub fn get_pending_changes(&self) -> Result<JournalData, JournalError> {
        self.get_journal_data(Some(SYNC_STATUS_PENDING))
    }

    pub fn get_local_data_for_sync(&self) -> Result<JournalData, JournalError> {
        self.get_journal_data(None)
    }

    pub fn get_sync_meta(&self, key: &str) -> Result<Option<SyncMeta>, JournalError> {
        self.pool
            .with_connection(|connection| {
                let mut statement =
                    connection.prepare("SELECT key, value FROM sync_meta WHERE key = ?1")?;
                let meta = statement
                    .query_row(params![key], |row| {
                        let value: String = row.get(1)?;
                        Ok(SyncMeta {
                            key: row.get(0)?,
                            value: serde_json::from_str(&value)
                                .unwrap_or(serde_json::Value::String(value)),
                        })
                    })
                    .optional()?;
                Ok(meta)
            })
            .map_err(JournalError::from)
    }

    pub fn set_sync_meta(&self, key: &str, value: &serde_json::Value) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                connection.execute(
                    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?1, ?2)",
                    params![key, serde_json::to_string(value)?],
                )?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn get_last_server_version(&self) -> Result<i64, JournalError> {
        match self.get_sync_meta("lastServerVersion")? {
            Some(meta) => Ok(meta
                .value
                .as_i64()
                .or_else(|| {
                    meta.value
                        .as_str()
                        .and_then(|value| value.parse::<i64>().ok())
                })
                .unwrap_or(0)),
            None => Ok(0),
        }
    }

    pub fn clear_all_data(&self) -> Result<(), JournalError> {
        self.pool.with_connection(|connection| {
            connection.execute_batch(
                "DELETE FROM user; DELETE FROM entries; DELETE FROM tags; DELETE FROM tiptaps; DELETE FROM sync_meta; DELETE FROM statistics;",
            )?;
            Ok(())
        }).map_err(JournalError::from)
    }

    pub fn get_statistic(&self, key: &str) -> Result<Option<Statistic>, JournalError> {
        self.pool
            .with_connection(|connection| {
                let mut statement = connection
                    .prepare("SELECT st_key, st_value FROM statistics WHERE st_key = ?1")?;
                let statistic = statement
                    .query_row(params![key], |row| {
                        let value: String = row.get(1)?;
                        Ok(Statistic {
                            st_key: row.get(0)?,
                            st_value: serde_json::from_str(&value)
                                .unwrap_or(serde_json::Value::String(value)),
                        })
                    })
                    .optional()?;
                Ok(statistic)
            })
            .map_err(JournalError::from)
    }

    pub fn set_statistic(&self, key: &str, value: &serde_json::Value) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                connection.execute(
                    "INSERT OR REPLACE INTO statistics (st_key, st_value) VALUES (?1, ?2)",
                    params![key, serde_json::to_string(value)?],
                )?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    pub fn put_statistics(&self, statistics: &[Statistic]) -> Result<(), JournalError> {
        self.pool
            .with_connection(|connection| {
                let transaction = connection.unchecked_transaction()?;
                for statistic in statistics {
                    transaction.execute(
                        "INSERT OR REPLACE INTO statistics (st_key, st_value) VALUES (?1, ?2)",
                        params![
                            statistic.st_key,
                            serde_json::to_string(&statistic.st_value)?
                        ],
                    )?;
                }
                transaction.commit()?;
                Ok(())
            })
            .map_err(JournalError::from)
    }

    fn get_journal_data(&self, status: Option<i64>) -> Result<JournalData, JournalError> {
        self.pool.with_connection(|connection| {
            let entries_sql = if status.is_some() {
                "SELECT id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status FROM entries WHERE sync_status = ?1"
            } else {
                "SELECT id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status FROM entries"
            };
            let tags_sql = if status.is_some() {
                "SELECT id, name, created_at, updated_at, is_deleted, sync_status FROM tags WHERE sync_status = ?1"
            } else {
                "SELECT id, name, created_at, updated_at, is_deleted, sync_status FROM tags"
            };
            let tiptaps_sql = if status.is_some() {
                "SELECT id, content, history, created_at, updated_at, is_deleted, sync_status FROM tiptaps WHERE sync_status = ?1"
            } else {
                "SELECT id, content, history, created_at, updated_at, is_deleted, sync_status FROM tiptaps"
            };

            let entries = Self::collect_with_optional_status(connection, entries_sql, status, Self::row_to_entry)?;
            let tags = Self::collect_with_optional_status(connection, tags_sql, status, Self::row_to_tag)?;
            let tiptaps =
                Self::collect_with_optional_status(connection, tiptaps_sql, status, Self::row_to_tiptap)?;

            Ok(JournalData {
                entries,
                tags,
                tiptaps,
            })
        }).map_err(JournalError::from)
    }

    fn collect_with_optional_status<T>(
        connection: &Connection,
        sql: &str,
        status: Option<i64>,
        map: fn(&Row<'_>) -> SqliteResult<T>,
    ) -> Result<Vec<T>, DatabaseError> {
        let mut statement = connection.prepare(sql)?;
        let rows = if let Some(status) = status {
            statement.query_map(params![status], map)?
        } else {
            statement.query_map([], map)?
        };
        rows.collect::<SqliteResult<Vec<_>>>()
            .map_err(DatabaseError::from)
    }

    fn on_entry_create(&self, created_at: i64, word_count: i64) -> Result<(), JournalError> {
        let words = self.get_statistic_i64(STATISTIC_KEY_WORDS_COUNT)?;
        self.set_statistic(
            STATISTIC_KEY_WORDS_COUNT,
            &serde_json::json!(words + word_count),
        )?;
        let (year, month, day) = self.date_parts(created_at)?;
        let date_key = format!("{year:04}-{month:02}-{day:02}");
        let year_key = year.to_string();
        let month_key = month.to_string();

        let mut current_year = self.get_statistic_map(STATISTIC_KEY_CURRENT_YEAR)?;
        let old = current_year
            .get(&date_key)
            .and_then(|value| value.as_i64())
            .unwrap_or(0);
        current_year.insert(date_key, serde_json::json!(old + 1));
        self.set_statistic(
            STATISTIC_KEY_CURRENT_YEAR,
            &serde_json::Value::Object(current_year),
        )?;

        let mut entry_date = self.get_statistic_map(STATISTIC_KEY_ENTRY_DATE)?;
        let year_entry = entry_date
            .entry(year_key)
            .or_insert_with(|| serde_json::json!({}));
        let Some(year_map) = year_entry.as_object_mut() else {
            return Ok(());
        };
        let month_entry = year_map
            .entry(month_key)
            .or_insert_with(|| serde_json::json!([]));
        let Some(days) = month_entry.as_array_mut() else {
            return Ok(());
        };

        let exists = days.iter().any(|item| item.as_i64() == Some(day));
        if !exists {
            days.push(serde_json::json!(day));
            days.sort_by(|left, right| {
                right.as_i64().unwrap_or(0).cmp(&left.as_i64().unwrap_or(0))
            });
            self.set_statistic(
                STATISTIC_KEY_ENTRY_DATE,
                &serde_json::Value::Object(entry_date),
            )?;
            let count = self.get_statistic_i64(STATISTIC_KEY_ALL_DATES)?;
            self.set_statistic(STATISTIC_KEY_ALL_DATES, &serde_json::json!(count + 1))?;
        } else {
            self.set_statistic(
                STATISTIC_KEY_ENTRY_DATE,
                &serde_json::Value::Object(entry_date),
            )?;
        }

        Ok(())
    }

    fn on_entry_delete(&self, created_at: i64, word_count: i64) -> Result<(), JournalError> {
        let words = self.get_statistic_i64(STATISTIC_KEY_WORDS_COUNT)?;
        self.set_statistic(
            STATISTIC_KEY_WORDS_COUNT,
            &serde_json::json!((words - word_count).max(0)),
        )?;
        let (year, month, day) = self.date_parts(created_at)?;
        let date_key = format!("{year:04}-{month:02}-{day:02}");

        let mut current_year = self.get_statistic_map(STATISTIC_KEY_CURRENT_YEAR)?;
        let old = current_year
            .get(&date_key)
            .and_then(|value| value.as_i64())
            .unwrap_or(0);
        if old <= 1 {
            current_year.remove(&date_key);
        } else {
            current_year.insert(date_key, serde_json::json!(old - 1));
        }

        self.set_statistic(
            STATISTIC_KEY_CURRENT_YEAR,
            &serde_json::Value::Object(current_year),
        )?;
        Ok(())
    }

    fn on_entry_update(
        &self,
        old_word_count: i64,
        new_word_count: i64,
    ) -> Result<(), JournalError> {
        if old_word_count == new_word_count {
            return Ok(());
        }
        let words = self.get_statistic_i64(STATISTIC_KEY_WORDS_COUNT)?;
        self.set_statistic(
            STATISTIC_KEY_WORDS_COUNT,
            &serde_json::json!(words + new_word_count - old_word_count),
        )
    }

    fn get_statistic_map(
        &self,
        key: &str,
    ) -> Result<serde_json::Map<String, serde_json::Value>, JournalError> {
        Ok(self
            .get_statistic(key)?
            .and_then(|statistic| statistic.st_value.as_object().cloned())
            .unwrap_or_default())
    }

    fn get_statistic_i64(&self, key: &str) -> Result<i64, JournalError> {
        Ok(self
            .get_statistic(key)?
            .and_then(|statistic| {
                statistic.st_value.as_i64().or_else(|| {
                    statistic
                        .st_value
                        .as_str()
                        .and_then(|value| value.parse().ok())
                })
            })
            .unwrap_or(0))
    }

    fn date_parts(&self, ts: i64) -> Result<(i64, i64, i64), JournalError> {
        self.pool
            .with_connection(|connection| {
                Ok(connection.query_row(
                    "SELECT
                        CAST(strftime('%Y', ?1 / 1000, 'unixepoch', 'localtime') AS INTEGER),
                        CAST(strftime('%m', ?1 / 1000, 'unixepoch', 'localtime') AS INTEGER),
                        CAST(strftime('%d', ?1 / 1000, 'unixepoch', 'localtime') AS INTEGER)",
                    params![ts],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )?)
            })
            .map_err(JournalError::from)
    }

    fn row_to_user(row: &Row<'_>) -> SqliteResult<User> {
        Ok(User {
            key: row.get(0)?,
            username: row.get(1)?,
            email: row.get(2)?,
            avatar: row.get(3)?,
            language: row.get(4)?,
            updated_at: row.get(5)?,
            sync_status: row.get(6)?,
        })
    }

    fn row_to_entry(row: &Row<'_>) -> SqliteResult<Entry> {
        let payload: String = row.get(2)?;
        let bookmark: i64 = row.get(5)?;
        let is_deleted: i64 = row.get(8)?;
        Ok(Entry {
            id: row.get(0)?,
            draft: row.get(1)?,
            payload: parse_json_or_empty(&payload),
            word_count: row.get(3)?,
            raw_text: row.get(4)?,
            bookmark: bookmark != 0,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            is_deleted: is_deleted != 0,
            sync_status: row.get(9)?,
        })
    }

    fn row_to_tag(row: &Row<'_>) -> SqliteResult<Tag> {
        let is_deleted: i64 = row.get(4)?;
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
            is_deleted: is_deleted != 0,
            sync_status: row.get(5)?,
        })
    }

    fn row_to_tiptap(row: &Row<'_>) -> SqliteResult<TiptapV2> {
        let content: String = row.get(1)?;
        let history: String = row.get(2)?;
        let is_deleted: i64 = row.get(5)?;
        Ok(TiptapV2 {
            id: row.get(0)?,
            content: parse_json_or_empty(&content),
            history: serde_json::from_str::<Vec<HistoryEntry>>(&history).unwrap_or_default(),
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            is_deleted: is_deleted != 0,
            sync_status: row.get(6)?,
        })
    }
}

fn parse_json_or_empty(value: &str) -> serde_json::Value {
    serde_json::from_str(value).unwrap_or(serde_json::Value::Object(Default::default()))
}

fn current_time_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn bool_to_i64(value: bool) -> i64 {
    i64::from(value)
}

fn camel_to_snake(value: &str) -> String {
    let mut output = String::new();
    for (index, ch) in value.chars().enumerate() {
        if ch.is_uppercase() {
            if index > 0 {
                output.push('_');
            }
            output.push(ch.to_lowercase().next().unwrap_or(ch));
        } else {
            output.push(ch);
        }
    }
    output
}
