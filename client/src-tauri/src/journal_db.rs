use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{params, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

struct MigrationStep {
    version: &'static str,
    name: &'static str,
    sql: &'static str,
}

fn migrations() -> Vec<MigrationStep> {
    vec![MigrationStep {
        version: "v0.1.0",
        name: "Create journal tables",
        sql: "
            CREATE TABLE IF NOT EXISTS user (
                key TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                avatar TEXT NOT NULL,
                language TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_status INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                draft TEXT NOT NULL,
                payload TEXT NOT NULL,
                word_count INTEGER NOT NULL,
                raw_text TEXT NOT NULL,
                bookmark INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                sync_status INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON entries(sync_status);
            CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);

            CREATE VIRTUAL TABLE entries_raw_text_search USING fts5(
                id UNINDEXED,
                raw_text,
                tokenize='trigram'
            );

            CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
            INSERT OR REPLACE INTO entries_raw_text_search(id, raw_text) VALUES (new.id, new.raw_text);
            END;

            CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN
            DELETE FROM entries_raw_text_search WHERE id = old.id;
            END;

            CREATE TRIGGER entries_au AFTER UPDATE OF raw_text ON entries BEGIN
            INSERT OR REPLACE INTO entries_raw_text_search(id, raw_text) VALUES (new.id, new.raw_text);
            END;

            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                sync_status INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_tags_sync_status ON tags(sync_status);

            CREATE TABLE IF NOT EXISTS tiptaps (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                history TEXT NOT NULL DEFAULT '[]',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                sync_status INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_tiptaps_sync_status ON tiptaps(sync_status);

            CREATE TABLE IF NOT EXISTS sync_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS statistics (
                st_key TEXT PRIMARY KEY,
                st_value TEXT NOT NULL
            );
        ",
    }]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub key: String,
    pub username: String,
    pub email: String,
    pub avatar: String,
    pub language: String,
    pub updated_at: i64,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub draft: String,
    pub payload: serde_json::Value,
    pub word_count: i64,
    pub raw_text: String,
    pub bookmark: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryField {
    pub draft: String,
    pub payload: serde_json::Value,
    pub word_count: i64,
    pub raw_text: String,
    pub bookmark: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryMeta {
    pub id: String,
    pub draft: String,
    pub year: i64,
    pub month: i64,
    pub day: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagField {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub time: i64,
    pub content: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TiptapV2 {
    pub id: String,
    pub content: serde_json::Value,
    pub history: Vec<HistoryEntry>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TiptapV2Field {
    pub content: serde_json::Value,
    pub history: Vec<HistoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncMeta {
    pub key: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statistic {
    #[serde(rename = "stKey")]
    pub st_key: String,
    #[serde(rename = "stValue")]
    pub st_value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JournalData {
    pub entries: Vec<Entry>,
    pub tags: Vec<Tag>,
    pub tiptaps: Vec<TiptapV2>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryCondition {
    pub operator: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetEntriesResult {
    pub entries: Vec<EntryMeta>,
    pub has_more: bool,
}

const SYNC_STATUS_SYNCED: i64 = 1;
const SYNC_STATUS_PENDING: i64 = 2;
const USER_KEY: &str = "current_user";

const STATISTIC_KEY_WORDS_COUNT: &str = "wordsCount";
const STATISTIC_KEY_CURRENT_YEAR: &str = "currentYear";
const STATISTIC_KEY_ENTRY_DATE: &str = "entryDate";
const STATISTIC_KEY_ALL_DATES: &str = "allDates";

pub struct JournalDb {
    pool: Pool<SqliteConnectionManager>,
}

impl JournalDb {
    pub fn new(path: &str) -> SqliteResult<Self> {
        let manager = SqliteConnectionManager::file(path).with_init(|conn| {
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "busy_timeout", "5000")?;
            conn.pragma_update(None, "synchronous", "NORMAL")?;
            #[cfg(debug_assertions)]
            conn.trace(Some(|sql| {
                println!("[journal_db][sql] {}", sql);
            }));
            Ok(())
        });
        let pool = Pool::builder()
            .max_size(8)
            .build(manager)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let db = JournalDb { pool };
        db.run_migrations()?;
        Ok(db)
    }

    fn conn(&self) -> SqliteResult<r2d2::PooledConnection<SqliteConnectionManager>> {
        self.pool
            .get()
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
    }

    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS migration (
                \"version\" TEXT PRIMARY KEY,
                \"name\" TEXT NOT NULL,
                applied_at INTEGER NOT NULL
            );",
        )?;

        for step in migrations() {
            let already_applied: bool = conn
                .query_row(
                    "SELECT 1 FROM migration WHERE version = ?1 LIMIT 1",
                    params![step.version],
                    |_| Ok(()),
                )
                .is_ok();

            if already_applied {
                continue;
            }

            conn.execute_batch(step.sql)?;
            conn.execute(
                "INSERT INTO migration (version, name, applied_at) VALUES (?1, ?2, ?3)",
                params![step.version, step.name, current_time_ms()],
            )?;
        }

        Ok(())
    }

    pub fn get_user(&self) -> SqliteResult<Option<User>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT key, username, email, avatar, language, updated_at, sync_status FROM user WHERE key = ?1",
        )?;
        let mut rows = stmt.query_map(params![USER_KEY], |row| {
            Ok(User {
                key: row.get(0)?,
                username: row.get(1)?,
                email: row.get(2)?,
                avatar: row.get(3)?,
                language: row.get(4)?,
                updated_at: row.get(5)?,
                sync_status: row.get(6)?,
            })
        })?;
        match rows.next() {
            Some(user) => Ok(Some(user?)),
            None => Ok(None),
        }
    }

    pub fn put_user(&self, user: &User) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO user (key, username, email, avatar, language, updated_at, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![USER_KEY, user.username, user.email, user.avatar, user.language, user.updated_at, user.sync_status],
        )?;
        Ok(())
    }

    fn row_to_entry(row: &rusqlite::Row) -> SqliteResult<Entry> {
        let payload_str: String = row.get(2)?;
        let bookmark: i64 = row.get(5)?;
        let is_deleted: i64 = row.get(8)?;
        Ok(Entry {
            id: row.get(0)?,
            draft: row.get(1)?,
            payload: parse_json_or_empty(&payload_str),
            word_count: row.get(3)?,
            raw_text: row.get(4)?,
            bookmark: bookmark != 0,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            is_deleted: is_deleted != 0,
            sync_status: row.get(9)?,
        })
    }

    pub fn get_entry(&self, id: &str) -> SqliteResult<Option<Entry>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status FROM entries WHERE id = ?1")?;
        let mut rows = stmt.query_map(params![id], Self::row_to_entry)?;
        match rows.next() {
            Some(entry) => Ok(Some(entry?)),
            None => Ok(None),
        }
    }

    pub fn get_entries(
        &self,
        page: i64,
        condition: &[QueryCondition],
    ) -> SqliteResult<GetEntriesResult> {
        let conn = self.conn()?;
        let page_size = 8_i64;
        let offset = (page.max(1) - 1) * page_size;

        let use_random = condition.iter().any(|c| c.operator == "random");
        if use_random {
            let client = reqwest::Client::new();
            let url = format!(
                "{}/api/journal?Action=GetEntries&page={}&condition=[{%22operator%22:%22random%22,%22value%22:%22Shuffle%22}]",
                backend_url(),
                page
            );
            let response = apply_auth_header(client.get(&url))
                .send()
                .await
                .map_err(|e| format!("Failed to send get random entries request: {}", e))?;
            if !response.status().is_success() {
                return Err(format!(
                    "Get random entries failed with status: {}",
                    response.status()
                ));
            }
            let json = response
                .json::<serde_json::Value>()
                .await
                .map_err(|e| format!("Failed to parse get random entries response: {}", e))?;

            let entries = json["entries"]
                .as_array()
                .ok_or_else(|| "Missing entries array in response".to_string())?
                .iter()
                .map(|v| Ok(EntryMeta {
                    id: v["id"].as_str().ok_or_else(|| "Missing id".to_string())?.to_string(),
                    draft: v["draft"].as_bool().ok_or_else(|| "Missing draft".to_string())?,
                    year: v["year"].as_i64().ok_or_else(|| "Missing year".to_string())?,
                    month: v["month"].as_i64().ok_or_else(|| "Missing month".to_string())?,
                    day: v["day"].as_i64().ok_or_else(|| "Missing day".to_string())?,
                }))
                .collect::<Result<Vec<EntryMeta>, String>>()?;

            let has_more = json["has_more"]
                .as_bool()
                .ok_or_else(|| "Missing has_more in response".to_string())?;

            return Ok(GetEntriesResult { entries, has_more });
        }

        let search_text = condition.iter().any(|c| c.operator == "contains");
        let mut where_parts = vec!["is_deleted = 0".to_string()];
        let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        if search_text {
            where_parts.push("entries_raw_text_search MATCH ?".to_string());
            condition.iter().find(|c| c.operator == "contains").and_then(|c| c.value.as_str()).map(|s| {
                values.push(Box::new(s.to_string()));
            });
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
                        for (i, v) in loc.iter().enumerate() {
                            if let Some(s) = v.as_str() {
                                where_parts.push(format!(
                                    "json_extract(e.payload, '$.location[{}]') = ?",
                                    i
                                ));
                                values.push(Box::new(s.to_string()));
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
                    if let Some(s) = cond.value.as_str() {
                        where_parts.push(
                            "strftime('%Y-%m-%d', e.created_at / 1000, 'unixepoch', 'localtime') = ?"
                                .to_string(),
                        );
                        values.push(Box::new(s.to_string()));
                    }
                }
                "before" => {
                    if let Some(s) = cond.value.as_str() {
                        where_parts.push("strftime('%Y-%m-%d', e.created_at / 1000, 'unixepoch', 'localtime') <= ?".to_string());
                        values.push(Box::new(s.to_string()));
                    }
                }
                _ => {}
            }
        }

        let mut sql = format!(
            "SELECT id, draft, CAST(strftime('%Y', e.created_at / 1000, 'unixepoch', 'localtime') AS INTEGER), CAST(strftime('%m', e.created_at / 1000, 'unixepoch', 'localtime') AS INTEGER), CAST(strftime('%d', e.created_at / 1000, 'unixepoch', 'localtime') AS INTEGER) FROM {} WHERE {}",
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
            values.iter().map(|v| v.as_ref()).collect();
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(EntryMeta {
                id: row.get(0)?,
                draft: row.get(1)?,
                year: row.get(2)?,
                month: row.get(3)?,
                day: row.get(4)?,
            })
        })?;

        let mut metas: Vec<EntryMeta> = rows.collect::<SqliteResult<Vec<EntryMeta>>>()?;
        let has_more = metas.len() > page_size as usize;
        if has_more {
            metas.truncate(page_size as usize);
        }

        Ok(GetEntriesResult {
            entries: metas,
            has_more,
        })
    }

    fn date_parts(ts: i64, conn: &rusqlite::Connection) -> SqliteResult<(i64, i64, i64)> {
        conn.query_row(
            "SELECT
                CAST(strftime('%Y', ?1 / 1000, 'unixepoch', 'localtime') AS INTEGER),
                CAST(strftime('%m', ?1 / 1000, 'unixepoch', 'localtime') AS INTEGER),
                CAST(strftime('%d', ?1 / 1000, 'unixepoch', 'localtime') AS INTEGER)",
            params![ts],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
    }

    fn get_statistic_map(
        &self,
        key: &str,
    ) -> SqliteResult<serde_json::Map<String, serde_json::Value>> {
        Ok(self
            .get_statistic(key)?
            .and_then(|s| s.st_value.as_object().cloned())
            .unwrap_or_default())
    }

    fn get_statistic_i64(&self, key: &str) -> SqliteResult<i64> {
        Ok(self
            .get_statistic(key)?
            .and_then(|s| {
                s.st_value
                    .as_i64()
                    .or_else(|| s.st_value.as_str().and_then(|x| x.parse().ok()))
            })
            .unwrap_or(0))
    }

    fn on_entry_create(&self, created_at: i64, word_count: i64) -> SqliteResult<()> {
        let words = self.get_statistic_i64(STATISTIC_KEY_WORDS_COUNT)?;
        self.set_statistic(
            STATISTIC_KEY_WORDS_COUNT,
            &serde_json::json!(words + word_count),
        )?;

        let conn = self.conn()?;
        let (year, month, day) = Self::date_parts(created_at, &conn)?;
        let date_key = format!("{:04}-{:02}-{:02}", year, month, day);
        let year_key = year.to_string();
        let month_key = month.to_string();

        let mut current_year = self.get_statistic_map(STATISTIC_KEY_CURRENT_YEAR)?;
        let old = current_year
            .get(&date_key)
            .and_then(|v| v.as_i64())
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

        let exists = days.iter().any(|x| x.as_i64() == Some(day));
        if !exists {
            days.push(serde_json::json!(day));
            days.sort_by(|a, b| b.as_i64().unwrap_or(0).cmp(&a.as_i64().unwrap_or(0)));
            self.set_statistic(
                STATISTIC_KEY_ENTRY_DATE,
                &serde_json::Value::Object(entry_date),
            )?;
            let c = self.get_statistic_i64(STATISTIC_KEY_ALL_DATES)?;
            self.set_statistic(STATISTIC_KEY_ALL_DATES, &serde_json::json!(c + 1))?;
        } else {
            self.set_statistic(
                STATISTIC_KEY_ENTRY_DATE,
                &serde_json::Value::Object(entry_date),
            )?;
        }

        Ok(())
    }

    fn on_entry_delete(&self, created_at: i64, word_count: i64) -> SqliteResult<()> {
        let words = self.get_statistic_i64(STATISTIC_KEY_WORDS_COUNT)?;
        self.set_statistic(
            STATISTIC_KEY_WORDS_COUNT,
            &serde_json::json!((words - word_count).max(0)),
        )?;

        let conn = self.conn()?;
        let (year, month, day) = Self::date_parts(created_at, &conn)?;
        let date_key = format!("{:04}-{:02}-{:02}", year, month, day);

        let mut current_year = self.get_statistic_map(STATISTIC_KEY_CURRENT_YEAR)?;
        let old = current_year
            .get(&date_key)
            .and_then(|v| v.as_i64())
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

    fn on_entry_update(&self, old_word_count: i64, new_word_count: i64) -> SqliteResult<()> {
        if old_word_count == new_word_count {
            return Ok(());
        }
        let words = self.get_statistic_i64(STATISTIC_KEY_WORDS_COUNT)?;
        self.set_statistic(
            STATISTIC_KEY_WORDS_COUNT,
            &serde_json::json!(words + new_word_count - old_word_count),
        )
    }

    pub fn add_entry(&self, entry: &EntryField) -> SqliteResult<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = current_time_ms();
        let conn = self.conn()?;
        let payload_str = serde_json::to_string(&entry.payload).unwrap_or_default();
        conn.execute(
            "INSERT INTO entries (id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9)",
            params![id, entry.draft, payload_str, entry.word_count, entry.raw_text, bool_to_i64(entry.bookmark), now, now, SYNC_STATUS_PENDING],
        )?;
        self.on_entry_create(now, entry.word_count)?;
        Ok(id)
    }

    pub fn put_entry(&self, entry: &Entry) -> SqliteResult<()> {
        let conn = self.conn()?;
        let payload_str = serde_json::to_string(&entry.payload).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO entries (id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![entry.id, entry.draft, payload_str, entry.word_count, entry.raw_text, bool_to_i64(entry.bookmark), entry.created_at, entry.updated_at, bool_to_i64(entry.is_deleted), entry.sync_status],
        )?;
        Ok(())
    }

    pub fn put_entries(&self, entries: &[Entry]) -> SqliteResult<()> {
        let mut conn = self.conn()?;
        let tx = conn.unchecked_transaction()?;
        for entry in entries {
            let payload_str = serde_json::to_string(&entry.payload).unwrap_or_default();
            tx.execute(
                "INSERT OR REPLACE INTO entries (id, draft, payload, word_count, raw_text, bookmark, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![entry.id, entry.draft, payload_str, entry.word_count, entry.raw_text, bool_to_i64(entry.bookmark), entry.created_at, entry.updated_at, bool_to_i64(entry.is_deleted), entry.sync_status],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn update_entry(&self, id: &str, updates: &serde_json::Value) -> SqliteResult<()> {
        let old_word_count = self.get_entry(id)?.map(|e| e.word_count).unwrap_or(0);
        let conn = self.conn()?;
        let now = current_time_ms();

        let empty = serde_json::Map::new();
        let obj = updates.as_object().unwrap_or(&empty);
        if obj.is_empty() {
            conn.execute(
                "UPDATE entries SET updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                params![now, SYNC_STATUS_PENDING, id],
            )?;
            return Ok(());
        }

        let mut set_parts = Vec::new();
        let mut vals: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        for (k, v) in obj {
            set_parts.push(format!("{} = ?", camel_to_snake(k)));
            match v {
                serde_json::Value::String(s) => vals.push(Box::new(s.clone())),
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        vals.push(Box::new(i));
                    } else if let Some(f) = n.as_f64() {
                        vals.push(Box::new(f));
                    }
                }
                serde_json::Value::Bool(b) => vals.push(Box::new(bool_to_i64(*b))),
                _ => vals.push(Box::new(serde_json::to_string(v).unwrap_or_default())),
            }
        }
        set_parts.push("updated_at = ?".to_string());
        vals.push(Box::new(now));
        set_parts.push("sync_status = ?".to_string());
        vals.push(Box::new(SYNC_STATUS_PENDING));
        vals.push(Box::new(id.to_string()));

        let sql = format!("UPDATE entries SET {} WHERE id = ?", set_parts.join(", "));
        let refs: Vec<&dyn rusqlite::types::ToSql> = vals.iter().map(|x| x.as_ref()).collect();
        conn.execute(&sql, refs.as_slice())?;

        if let Some(new_wc) = obj.get("wordCount").and_then(|v| v.as_i64()) {
            if new_wc != old_word_count {
                self.on_entry_update(old_word_count, new_wc)?;
            }
        }
        Ok(())
    }

    pub fn delete_entry(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM entries WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn soft_delete_entry(&self, id: &str) -> SqliteResult<()> {
        let old = self.get_entry(id)?;
        let conn = self.conn()?;
        conn.execute(
            "UPDATE entries SET is_deleted = 1, updated_at = ?1, sync_status = ?2 WHERE id = ?3",
            params![current_time_ms(), SYNC_STATUS_PENDING, id],
        )?;
        if let Some(e) = old {
            self.on_entry_delete(e.created_at, e.word_count)?;
        }
        Ok(())
    }

    pub fn mark_entry_synced(&self, id: &str, updated_at: i64) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE entries SET sync_status = ?1 WHERE id = ?2 AND updated_at = ?3",
            params![SYNC_STATUS_SYNCED, id, updated_at],
        )?;
        Ok(())
    }

    fn row_to_tag(row: &rusqlite::Row) -> SqliteResult<Tag> {
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

    pub fn get_tag(&self, id: &str) -> SqliteResult<Option<Tag>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT id, name, created_at, updated_at, is_deleted, sync_status FROM tags WHERE id = ?1")?;
        let mut rows = stmt.query_map(params![id], Self::row_to_tag)?;
        match rows.next() {
            Some(tag) => Ok(Some(tag?)),
            None => Ok(None),
        }
    }

    pub fn get_all_tags(&self) -> SqliteResult<Vec<Tag>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT id, name, created_at, updated_at, is_deleted, sync_status FROM tags WHERE is_deleted = 0")?;
        let rows = stmt.query_map([], Self::row_to_tag)?;
        rows.collect()
    }

    pub fn add_tag(&self, tag: &TagField) -> SqliteResult<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = current_time_ms();
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO tags (id, name, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
            params![id, tag.name, now, now, SYNC_STATUS_PENDING],
        )?;
        Ok(id)
    }

    pub fn put_tag(&self, tag: &Tag) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO tags (id, name, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![tag.id, tag.name, tag.created_at, tag.updated_at, bool_to_i64(tag.is_deleted), tag.sync_status],
        )?;
        Ok(())
    }

    pub fn put_tags(&self, tags: &[Tag]) -> SqliteResult<()> {
        let mut conn = self.conn()?;
        let tx = conn.unchecked_transaction()?;
        for tag in tags {
            tx.execute(
                "INSERT OR REPLACE INTO tags (id, name, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![tag.id, tag.name, tag.created_at, tag.updated_at, bool_to_i64(tag.is_deleted), tag.sync_status],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn update_tag(&self, id: &str, updates: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();
        let name = updates.get("name").and_then(|v| v.as_str());
        if let Some(name) = name {
            conn.execute(
                "UPDATE tags SET name = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4",
                params![name, now, SYNC_STATUS_PENDING, id],
            )?;
        } else {
            conn.execute(
                "UPDATE tags SET updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                params![now, SYNC_STATUS_PENDING, id],
            )?;
        }
        Ok(())
    }

    pub fn delete_tag(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn soft_delete_tag(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE tags SET is_deleted = 1, updated_at = ?1, sync_status = ?2 WHERE id = ?3",
            params![current_time_ms(), SYNC_STATUS_PENDING, id],
        )?;
        Ok(())
    }

    pub fn mark_tag_synced(&self, id: &str, updated_at: i64) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE tags SET sync_status = ?1 WHERE id = ?2 AND updated_at = ?3",
            params![SYNC_STATUS_SYNCED, id, updated_at],
        )?;
        Ok(())
    }

    fn row_to_tiptap(row: &rusqlite::Row) -> SqliteResult<TiptapV2> {
        let content: String = row.get(1)?;
        let history: String = row.get(2)?;
        let is_deleted: i64 = row.get(5)?;
        Ok(TiptapV2 {
            id: row.get(0)?,
            content: parse_json_or_empty(&content),
            history: serde_json::from_str(&history).unwrap_or_default(),
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            is_deleted: is_deleted != 0,
            sync_status: row.get(6)?,
        })
    }

    pub fn get_tiptap(&self, id: &str) -> SqliteResult<Option<TiptapV2>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT id, content, history, created_at, updated_at, is_deleted, sync_status FROM tiptaps WHERE id = ?1")?;
        let mut rows = stmt.query_map(params![id], Self::row_to_tiptap)?;
        match rows.next() {
            Some(v) => Ok(Some(v?)),
            None => Ok(None),
        }
    }

    pub fn add_tiptap(&self, tiptap: &TiptapV2Field) -> SqliteResult<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = current_time_ms();
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO tiptaps (id, content, history, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
            params![id, serde_json::to_string(&tiptap.content).unwrap_or_default(), serde_json::to_string(&tiptap.history).unwrap_or_default(), now, now, SYNC_STATUS_PENDING],
        )?;
        Ok(id)
    }

    pub fn put_tiptap(&self, tiptap: &TiptapV2) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO tiptaps (id, content, history, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![tiptap.id, serde_json::to_string(&tiptap.content).unwrap_or_default(), serde_json::to_string(&tiptap.history).unwrap_or_default(), tiptap.created_at, tiptap.updated_at, bool_to_i64(tiptap.is_deleted), tiptap.sync_status],
        )?;
        Ok(())
    }

    pub fn put_tiptaps(&self, tiptaps: &[TiptapV2]) -> SqliteResult<()> {
        let mut conn = self.conn()?;
        let tx = conn.unchecked_transaction()?;
        for t in tiptaps {
            tx.execute(
                "INSERT OR REPLACE INTO tiptaps (id, content, history, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![t.id, serde_json::to_string(&t.content).unwrap_or_default(), serde_json::to_string(&t.history).unwrap_or_default(), t.created_at, t.updated_at, bool_to_i64(t.is_deleted), t.sync_status],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn sync_tiptap(&self, id: &str, content: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE tiptaps SET content = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4",
            params![
                serde_json::to_string(content).unwrap_or_default(),
                current_time_ms(),
                SYNC_STATUS_PENDING,
                id
            ],
        )?;
        Ok(())
    }

    pub fn update_tiptap(&self, id: &str, updates: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();
        let content = updates
            .get("content")
            .map(|v| serde_json::to_string(v).unwrap_or_default());
        let history = updates
            .get("history")
            .map(|v| serde_json::to_string(v).unwrap_or_default());
        match (content, history) {
            (Some(c), Some(h)) => conn.execute("UPDATE tiptaps SET content = ?1, history = ?2, updated_at = ?3, sync_status = ?4 WHERE id = ?5", params![c, h, now, SYNC_STATUS_PENDING, id])?,
            (Some(c), None) => conn.execute("UPDATE tiptaps SET content = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4", params![c, now, SYNC_STATUS_PENDING, id])?,
            (None, Some(h)) => conn.execute("UPDATE tiptaps SET history = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4", params![h, now, SYNC_STATUS_PENDING, id])?,
            (None, None) => conn.execute("UPDATE tiptaps SET updated_at = ?1, sync_status = ?2 WHERE id = ?3", params![now, SYNC_STATUS_PENDING, id])?,
        };
        Ok(())
    }

    pub fn delete_tiptap(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM tiptaps WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn soft_delete_tiptap(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE tiptaps SET is_deleted = 1, updated_at = ?1, sync_status = ?2 WHERE id = ?3",
            params![current_time_ms(), SYNC_STATUS_PENDING, id],
        )?;
        Ok(())
    }

    pub fn mark_tiptap_synced(&self, id: &str, updated_at: i64) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE tiptaps SET sync_status = ?1 WHERE id = ?2 AND updated_at = ?3",
            params![SYNC_STATUS_SYNCED, id, updated_at],
        )?;
        Ok(())
    }

    pub fn list_tiptap_history(&self, id: &str) -> SqliteResult<Vec<i64>> {
        let tiptap = self.get_tiptap(id)?;
        Ok(tiptap
            .map(|t| t.history.into_iter().map(|h| h.time).collect())
            .unwrap_or_default())
    }

    pub fn get_tiptap_history(&self, id: &str, ts: i64) -> SqliteResult<serde_json::Value> {
        let tiptap = self.get_tiptap(id)?;
        let Some(t) = tiptap else {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        };
        match t.history.into_iter().find(|h| h.time == ts) {
            Some(h) => Ok(h.content),
            None => Err(rusqlite::Error::QueryReturnedNoRows),
        }
    }

    pub fn restore_tiptap_history(&self, id: &str, ts: i64) -> SqliteResult<()> {
        let content = self.get_tiptap_history(id, ts)?;
        self.sync_tiptap(id, &content)
    }

    pub fn get_pending_changes(&self) -> SqliteResult<JournalData> {
        self.get_journal_data(Some(SYNC_STATUS_PENDING))
    }

    pub fn get_local_data_for_sync(&self) -> SqliteResult<JournalData> {
        self.get_journal_data(None)
    }

    fn get_journal_data(&self, status: Option<i64>) -> SqliteResult<JournalData> {
        let conn = self.conn()?;

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

        let entries = {
            let mut stmt = conn.prepare(entries_sql)?;
            let rows = if let Some(s) = status {
                stmt.query_map(params![s], Self::row_to_entry)?
            } else {
                stmt.query_map([], Self::row_to_entry)?
            };
            rows.collect::<SqliteResult<Vec<Entry>>>()?
        };

        let tags = {
            let mut stmt = conn.prepare(tags_sql)?;
            let rows = if let Some(s) = status {
                stmt.query_map(params![s], Self::row_to_tag)?
            } else {
                stmt.query_map([], Self::row_to_tag)?
            };
            rows.collect::<SqliteResult<Vec<Tag>>>()?
        };

        let tiptaps = {
            let mut stmt = conn.prepare(tiptaps_sql)?;
            let rows = if let Some(s) = status {
                stmt.query_map(params![s], Self::row_to_tiptap)?
            } else {
                stmt.query_map([], Self::row_to_tiptap)?
            };
            rows.collect::<SqliteResult<Vec<TiptapV2>>>()?
        };

        Ok(JournalData {
            entries,
            tags,
            tiptaps,
        })
    }

    pub fn get_sync_meta(&self, key: &str) -> SqliteResult<Option<SyncMeta>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT key, value FROM sync_meta WHERE key = ?1")?;
        let mut rows = stmt.query_map(params![key], |row| {
            let v: String = row.get(1)?;
            Ok(SyncMeta {
                key: row.get(0)?,
                value: serde_json::from_str(&v).unwrap_or(serde_json::Value::String(v)),
            })
        })?;
        match rows.next() {
            Some(meta) => Ok(Some(meta?)),
            None => Ok(None),
        }
    }

    pub fn set_sync_meta(&self, key: &str, value: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?1, ?2)",
            params![key, serde_json::to_string(value).unwrap_or_default()],
        )?;
        Ok(())
    }

    pub fn get_last_server_version(&self) -> SqliteResult<i64> {
        match self.get_sync_meta("lastServerVersion")? {
            Some(meta) => Ok(meta
                .value
                .as_i64()
                .or_else(|| meta.value.as_str().and_then(|x| x.parse::<i64>().ok()))
                .unwrap_or(0)),
            None => Ok(0),
        }
    }

    pub fn clear_all_data(&self) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute_batch("DELETE FROM user; DELETE FROM entries; DELETE FROM tags; DELETE FROM tiptaps; DELETE FROM sync_meta; DELETE FROM statistics;")?;
        Ok(())
    }

    pub fn get_statistic(&self, key: &str) -> SqliteResult<Option<Statistic>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT st_key, st_value FROM statistics WHERE st_key = ?1")?;
        let mut rows = stmt.query_map(params![key], |row| {
            let v: String = row.get(1)?;
            Ok(Statistic {
                st_key: row.get(0)?,
                st_value: serde_json::from_str(&v).unwrap_or(serde_json::Value::String(v)),
            })
        })?;
        match rows.next() {
            Some(v) => Ok(Some(v?)),
            None => Ok(None),
        }
    }

    pub fn set_statistic(&self, key: &str, value: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO statistics (st_key, st_value) VALUES (?1, ?2)",
            params![
                key,
                serde_json::to_string(value).unwrap_or_else(|_| "null".to_string())
            ],
        )?;
        Ok(())
    }

    pub fn put_statistics(&self, statistics: &[Statistic]) -> SqliteResult<()> {
        let mut conn = self.conn()?;
        let tx = conn.unchecked_transaction()?;
        for s in statistics {
            tx.execute(
                "INSERT OR REPLACE INTO statistics (st_key, st_value) VALUES (?1, ?2)",
                params![
                    s.st_key,
                    serde_json::to_string(&s.st_value).unwrap_or_else(|_| "null".to_string())
                ],
            )?;
        }
        tx.commit()?;
        Ok(())
    }
}

fn parse_json_or_empty(s: &str) -> serde_json::Value {
    serde_json::from_str(s).unwrap_or(serde_json::Value::Object(Default::default()))
}

fn current_time_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn bool_to_i64(v: bool) -> i64 {
    if v {
        1
    } else {
        0
    }
}

fn camel_to_snake(s: &str) -> String {
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 {
                out.push('_');
            }
            out.push(c.to_lowercase().next().unwrap_or(c));
        } else {
            out.push(c);
        }
    }
    out
}

#[cfg(feature = "journal")]
pub mod commands {
    use super::*;
    use crate::media_cache::{backend_url, current_auth_token};
    use std::sync::OnceLock;
    use tauri::{AppHandle, Manager};

    static DB: OnceLock<JournalDb> = OnceLock::new();

    pub fn init_db(app: &AppHandle) -> Result<(), String> {
        let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let db_path = app_data_dir.join("journal.db");
        let db = JournalDb::new(db_path.to_str().unwrap()).map_err(|e| e.to_string())?;
        DB.set(db)
            .map_err(|_| "DB already initialized".to_string())?;
        Ok(())
    }

    fn get_db() -> Result<&'static JournalDb, String> {
        DB.get().ok_or_else(|| "DB not initialized".to_string())
    }

    fn apply_auth_header(builder: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        builder.header("Onlyquant-Token", current_auth_token().unwrap_or_default())
    }

    #[tauri::command]
    pub fn journal_get_user() -> Result<Option<User>, String> {
        get_db()?.get_user().map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_put_user(user: User) -> Result<(), String> {
        get_db()?.put_user(&user).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn journal_get_entry(id: String) -> Result<Option<Entry>, String> {
        get_db()?.get_entry(&id).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_get_entries(
        page: i64,
        condition: Vec<QueryCondition>,
    ) -> Result<GetEntriesResult, String> {
        get_db()?
            .get_entries(page, &condition)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_add_entry(entry: EntryField) -> Result<String, String> {
        get_db()?.add_entry(&entry).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_put_entry(entry: Entry) -> Result<(), String> {
        get_db()?.put_entry(&entry).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_put_entries(entries: Vec<Entry>) -> Result<(), String> {
        get_db()?.put_entries(&entries).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_update_entry(id: String, updates: serde_json::Value) -> Result<(), String> {
        get_db()?
            .update_entry(&id, &updates)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_delete_entry(id: String) -> Result<(), String> {
        get_db()?.delete_entry(&id).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_soft_delete_entry(id: String) -> Result<(), String> {
        get_db()?.soft_delete_entry(&id).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_mark_entry_synced(id: String, updated_at: i64) -> Result<(), String> {
        get_db()?
            .mark_entry_synced(&id, updated_at)
            .map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn journal_get_tag(id: String) -> Result<Option<Tag>, String> {
        get_db()?.get_tag(&id).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_get_all_tags() -> Result<Vec<Tag>, String> {
        get_db()?.get_all_tags().map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_add_tag(tag: TagField) -> Result<String, String> {
        get_db()?.add_tag(&tag).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_put_tag(tag: Tag) -> Result<(), String> {
        get_db()?.put_tag(&tag).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_put_tags(tags: Vec<Tag>) -> Result<(), String> {
        get_db()?.put_tags(&tags).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_update_tag(id: String, updates: serde_json::Value) -> Result<(), String> {
        get_db()?
            .update_tag(&id, &updates)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_delete_tag(id: String) -> Result<(), String> {
        get_db()?.delete_tag(&id).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_soft_delete_tag(id: String) -> Result<(), String> {
        get_db()?.soft_delete_tag(&id).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_mark_tag_synced(id: String, updated_at: i64) -> Result<(), String> {
        get_db()?
            .mark_tag_synced(&id, updated_at)
            .map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn journal_get_tiptap(id: String) -> Result<Option<TiptapV2>, String> {
        get_db()?.get_tiptap(&id).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_add_tiptap(tiptap: TiptapV2Field) -> Result<String, String> {
        get_db()?.add_tiptap(&tiptap).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_put_tiptap(tiptap: TiptapV2) -> Result<(), String> {
        get_db()?.put_tiptap(&tiptap).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_put_tiptaps(tiptaps: Vec<TiptapV2>) -> Result<(), String> {
        get_db()?.put_tiptaps(&tiptaps).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_sync_tiptap(id: String, content: serde_json::Value) -> Result<(), String> {
        get_db()?
            .sync_tiptap(&id, &content)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_update_tiptap(id: String, updates: serde_json::Value) -> Result<(), String> {
        get_db()?
            .update_tiptap(&id, &updates)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_delete_tiptap(id: String) -> Result<(), String> {
        get_db()?.delete_tiptap(&id).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_soft_delete_tiptap(id: String) -> Result<(), String> {
        get_db()?.soft_delete_tiptap(&id).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_mark_tiptap_synced(id: String, updated_at: i64) -> Result<(), String> {
        get_db()?
            .mark_tiptap_synced(&id, updated_at)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_list_tiptap_history(id: String) -> Result<Vec<i64>, String> {
        get_db()?
            .list_tiptap_history(&id)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_get_tiptap_history(id: String, ts: i64) -> Result<serde_json::Value, String> {
        get_db()?
            .get_tiptap_history(&id, ts)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_restore_tiptap_history(id: String, ts: i64) -> Result<(), String> {
        get_db()?
            .restore_tiptap_history(&id, ts)
            .map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn journal_get_pending_changes() -> Result<JournalData, String> {
        get_db()?.get_pending_changes().map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_get_local_data_for_sync() -> Result<JournalData, String> {
        get_db()?
            .get_local_data_for_sync()
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_get_sync_meta(key: String) -> Result<Option<SyncMeta>, String> {
        get_db()?.get_sync_meta(&key).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_set_sync_meta(key: String, value: serde_json::Value) -> Result<(), String> {
        get_db()?
            .set_sync_meta(&key, &value)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_get_last_server_version() -> Result<i64, String> {
        get_db()?
            .get_last_server_version()
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_clear_all_data() -> Result<(), String> {
        get_db()?.clear_all_data().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn journal_get_statistic(key: String) -> Result<Option<Statistic>, String> {
        get_db()?.get_statistic(&key).map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_set_statistic(key: String, value: serde_json::Value) -> Result<(), String> {
        get_db()?
            .set_statistic(&key, &value)
            .map_err(|e| e.to_string())
    }
    #[tauri::command]
    pub fn journal_put_statistics(statistics: Vec<Statistic>) -> Result<(), String> {
        get_db()?
            .put_statistics(&statistics)
            .map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub async fn journal_full_sync() -> Result<serde_json::Value, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/journal?Action=FullSync", backend_url());
        let response = apply_auth_header(client.get(&url))
            .send()
            .await
            .map_err(|e| format!("Failed to send full sync request: {}", e))?;
        if !response.status().is_success() {
            return Err(format!(
                "Full sync failed with status: {}",
                response.status()
            ));
        }
        response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| format!("Failed to parse full sync response: {}", e))
    }

    #[tauri::command]
    pub async fn journal_push(data: JournalData) -> Result<serde_json::Value, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/journal?Action=Push", backend_url());
        let result = tokio::time::timeout(std::time::Duration::from_secs(5), async {
            let response = apply_auth_header(client.post(&url))
                .json(&data)
                .send()
                .await
                .map_err(|e| format!("Failed to send push request: {}", e))?;
            if !response.status().is_success() {
                return Err(format!("Push failed with status: {}", response.status()));
            }
            response
                .json::<serde_json::Value>()
                .await
                .map_err(|e| format!("Failed to parse push response: {}", e))
        })
        .await;
        match result {
            Ok(v) => v,
            Err(_) => Err("Request timeout after 5s".to_string()),
        }
    }

    #[tauri::command]
    pub async fn journal_pull(version: i64) -> Result<serde_json::Value, String> {
        let client = reqwest::Client::new();
        let url = format!(
            "{}/api/journal?Action=Pull&since={}",
            backend_url(),
            version
        );
        let result = tokio::time::timeout(std::time::Duration::from_secs(5), async {
            let response = apply_auth_header(client.get(&url))
                .send()
                .await
                .map_err(|e| format!("Failed to send pull request: {}", e))?;
            if !response.status().is_success() {
                return Err(format!("Pull failed with status: {}", response.status()));
            }
            response
                .json::<serde_json::Value>()
                .await
                .map_err(|e| format!("Failed to parse pull response: {}", e))
        })
        .await;
        match result {
            Ok(v) => v,
            Err(_) => Err("Request timeout after 5s".to_string()),
        }
    }
}
