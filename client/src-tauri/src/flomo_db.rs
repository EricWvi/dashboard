use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{params, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use reqwest;

// --- Migration ---

struct MigrationStep {
    version: &'static str,
    name: &'static str,
    sql: &'static str,
}

fn migrations() -> Vec<MigrationStep> {
    vec![
        MigrationStep {
            version: "v0.1.0",
            name: "Create user+cards+folders+tiptaps+sync_meta+migration",
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


            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                folder_id TEXT NOT NULL,
                title TEXT NOT NULL,
                draft TEXT NOT NULL,
                payload TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                is_bookmarked INTEGER NOT NULL,
                is_archived INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                sync_status INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_cards_sync_status ON cards(sync_status);
            CREATE INDEX IF NOT EXISTS idx_cards_folder_id ON cards(folder_id);
            CREATE INDEX IF NOT EXISTS idx_cards_is_archived ON cards(is_archived);
            CREATE INDEX IF NOT EXISTS idx_cards_is_bookmarked ON cards(is_bookmarked);
            CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON cards(updated_at);

            CREATE VIRTUAL TABLE cards_title_search USING fts5(
                id UNINDEXED,
                title,
                tokenize='trigram'
            );

            CREATE TRIGGER cards_ai AFTER INSERT ON cards BEGIN
            INSERT INTO cards_title_search(id, title) VALUES (new.id, new.title);
            END;

            CREATE TRIGGER cards_ad AFTER DELETE ON cards BEGIN
            DELETE FROM cards_title_search WHERE id = old.id;
            END;

            CREATE TRIGGER cards_au AFTER UPDATE OF title ON cards BEGIN
            INSERT OR REPLACE INTO cards_title_search(id, title) VALUES (new.id, new.title);
            END;

            CREATE VIRTUAL TABLE cards_raw_text_search USING fts5(
                id UNINDEXED,
                raw_text,
                tokenize='trigram'
            );

            CREATE TRIGGER cards_text_ai AFTER INSERT ON cards BEGIN
            INSERT INTO cards_raw_text_search(id, raw_text) VALUES (new.id, new.raw_text);
            END;

            CREATE TRIGGER cards_text_ad AFTER DELETE ON cards BEGIN
            DELETE FROM cards_raw_text_search WHERE id = old.id;
            END;

            CREATE TRIGGER cards_text_au AFTER UPDATE OF raw_text ON cards BEGIN
            INSERT OR REPLACE INTO cards_raw_text_search(id, raw_text) VALUES (new.id, new.raw_text);
            END;


            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                parent_id TEXT NOT NULL,
                title TEXT NOT NULL,
                payload TEXT NOT NULL,
                is_bookmarked INTEGER NOT NULL,
                is_archived INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                sync_status INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_folders_sync_status ON folders(sync_status);
            CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
            CREATE INDEX IF NOT EXISTS idx_folders_is_archived ON folders(is_archived);
            CREATE INDEX IF NOT EXISTS idx_folders_is_bookmarked ON folders(is_bookmarked);
            CREATE INDEX IF NOT EXISTS idx_folders_updated_at ON folders(updated_at);

            CREATE VIRTUAL TABLE folders_title_search USING fts5(
                id UNINDEXED,
                title,
                tokenize='trigram'
            );

            CREATE TRIGGER folders_ai AFTER INSERT ON folders BEGIN
            INSERT INTO folders_title_search(id, title) VALUES (new.id, new.title);
            END;

            CREATE TRIGGER folders_ad AFTER DELETE ON folders BEGIN
            DELETE FROM folders_title_search WHERE id = old.id;
            END;

            CREATE TRIGGER folders_au AFTER UPDATE OF title ON folders BEGIN
            INSERT OR REPLACE INTO folders_title_search(id, title) VALUES (new.id, new.title);
            END;


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
            CREATE INDEX IF NOT EXISTS idx_tiptaps_updated_at ON tiptaps(updated_at);

            CREATE TABLE IF NOT EXISTS sync_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        ",
        },
    ]
}

// --- Models ---

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
pub struct Card {
    pub id: String,
    pub folder_id: String,
    pub title: String,
    pub draft: String,
    pub payload: serde_json::Value,
    pub raw_text: String,
    pub is_bookmarked: i64,
    pub is_archived: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardField {
    pub folder_id: String,
    pub title: String,
    pub draft: String,
    pub payload: serde_json::Value,
    pub raw_text: String,
    pub is_bookmarked: i64,
    pub is_archived: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub parent_id: String,
    pub title: String,
    pub payload: serde_json::Value,
    pub is_bookmarked: i64,
    pub is_archived: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderField {
    pub parent_id: String,
    pub title: String,
    pub payload: serde_json::Value,
    pub is_bookmarked: i64,
    pub is_archived: i64,
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
pub struct PendingChanges {
    pub cards: Vec<Card>,
    pub folders: Vec<Folder>,
    pub tiptaps: Vec<TiptapV2>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlomoData {
    pub cards: Vec<Card>,
    pub folders: Vec<Folder>,
    pub tiptaps: Vec<TiptapV2>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendWrapper<T> {
    pub request_id: String,
    pub code: i32,
    pub message: serde_json::Value,
    #[serde(skip)]
    _marker: std::marker::PhantomData<T>,
}

impl<T: for<'de> serde::Deserialize<'de>> BackendWrapper<T> {
    pub fn into_result(self) -> Result<T, String> {
        if self.code == 200 {
            serde_json::from_value(self.message).map_err(|e| e.to_string())
        } else {
            Err(self
                .message
                .as_str()
                .unwrap_or("Unknown error")
                .to_string())
        }
    }
}

// --- Constants ---
const SYNC_STATUS_SYNCED: i64 = 1;
const SYNC_STATUS_PENDING: i64 = 2;
const ARCHIVE_FOLDER_ID: &str = "archive-folder-id";
const USER_KEY: &str = "current_user";

// --- Database ---

pub struct FlomoDb {
    pool: Pool<SqliteConnectionManager>,
}

impl FlomoDb {
    pub fn new(path: &str) -> SqliteResult<Self> {
        let manager = SqliteConnectionManager::file(path).with_init(|conn| {
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "busy_timeout", "5000")?;
            conn.pragma_update(None, "synchronous", "NORMAL")?;
            #[cfg(debug_assertions)]
            conn.trace(Some(|sql| {
                println!("[flomo_db][sql] {}", sql);
            }));
            Ok(())
        });
        let pool = Pool::builder()
            .max_size(8)
            .build(manager)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let db = FlomoDb { pool };
        db.run_migrations()?;
        Ok(db)
    }

    #[cfg(test)]
    pub fn new_in_memory() -> SqliteResult<Self> {
        let manager = SqliteConnectionManager::memory().with_init(|conn| {
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "synchronous", "NORMAL")?;
            #[cfg(debug_assertions)]
            conn.trace(Some(|sql| {
                println!("[flomo_db][sql] {}", sql);
            }));
            Ok(())
        });
        // max_size=1: in-memory databases are per-connection; a single connection
        // ensures all operations share the same in-memory database.
        let pool = Pool::builder()
            .max_size(1)
            .build(manager)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let db = FlomoDb { pool };
        db.run_migrations()?;
        Ok(db)
    }

    fn conn(
        &self,
    ) -> SqliteResult<r2d2::PooledConnection<SqliteConnectionManager>> {
        self.pool
            .get()
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
    }

    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn()?;

        // Ensure the migration tracking table exists
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

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;

            conn.execute_batch(step.sql)?;
            conn.execute(
                "INSERT INTO migration (version, name, applied_at) VALUES (?1, ?2, ?3)",
                params![step.version, step.name, now],
            )?;
        }

        Ok(())
    }

    // --- User ---

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

    // --- Cards ---

    pub fn get_card(&self, id: &str) -> SqliteResult<Option<Card>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, folder_id, title, draft, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM cards WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            let payload_str: String = row.get(4)?;
            let is_deleted: i64 = row.get(9)?;
            Ok(Card {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                title: row.get(2)?,
                draft: row.get(3)?,
                payload: parse_json_or_empty(&payload_str),
                raw_text: "".to_string(),
                is_bookmarked: row.get(5)?,
                is_archived: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                is_deleted: is_deleted != 0,
                sync_status: row.get(10)?,
            })
        })?;
        match rows.next() {
            Some(card) => Ok(Some(card?)),
            None => Ok(None),
        }
    }

    pub fn get_full_card(&self, id: &str) -> SqliteResult<Option<Card>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, folder_id, title, draft, payload, raw_text, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM cards WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            let payload_str: String = row.get(4)?;
            let is_deleted: i64 = row.get(10)?;
            Ok(Card {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                title: row.get(2)?,
                draft: row.get(3)?,
                payload: parse_json_or_empty(&payload_str),
                raw_text: row.get(5)?,
                is_bookmarked: row.get(6)?,
                is_archived: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                is_deleted: is_deleted != 0,
                sync_status: row.get(11)?,
            })
        })?;
        match rows.next() {
            Some(card) => Ok(Some(card?)),
            None => Ok(None),
        }
    }

    pub fn get_cards_in_folder(&self, folder_id: &str) -> SqliteResult<Vec<Card>> {
        let conn = self.conn()?;
        if folder_id == ARCHIVE_FOLDER_ID {
            let mut stmt = conn.prepare(
                "SELECT id, folder_id, title, draft, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM cards WHERE is_archived = 1 AND is_deleted = 0",
            )?;
            let rows = stmt.query_map([], |row| {
                let payload_str: String = row.get(4)?;
                let is_deleted: i64 = row.get(9)?;
                Ok(Card {
                    id: row.get(0)?,
                    folder_id: row.get(1)?,
                    title: row.get(2)?,
                    draft: row.get(3)?,
                    payload: parse_json_or_empty(&payload_str),
                    raw_text: "".to_string(),
                    is_bookmarked: row.get(5)?,
                    is_archived: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(10)?,
                })
            })?;
            rows.collect()
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, folder_id, title, draft, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM cards WHERE folder_id = ?1 AND is_deleted = 0 AND is_archived = 0",
            )?;
            let rows = stmt.query_map(params![folder_id], |row| {
                let payload_str: String = row.get(4)?;
                let is_deleted: i64 = row.get(9)?;
                Ok(Card {
                    id: row.get(0)?,
                    folder_id: row.get(1)?,
                    title: row.get(2)?,
                    draft: row.get(3)?,
                    payload: parse_json_or_empty(&payload_str),
                    raw_text: "".to_string(),
                    is_bookmarked: row.get(5)?,
                    is_archived: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(10)?,
                })
            })?;
            rows.collect()
        }
    }

    pub fn add_card(&self, card: &CardField) -> SqliteResult<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = current_time_ms();
        let conn = self.conn()?;
        let payload_str = serde_json::to_string(&card.payload).unwrap_or_default();
        conn.execute(
            "INSERT INTO cards (id, folder_id, title, draft, payload, raw_text, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, ?11)",
            params![id, card.folder_id, card.title, card.draft, payload_str, card.raw_text, card.is_bookmarked, card.is_archived, now, now, SYNC_STATUS_PENDING],
        )?;
        Ok(id)
    }

    pub fn put_card(&self, card: &Card) -> SqliteResult<()> {
        let conn = self.conn()?;
        let payload_str = serde_json::to_string(&card.payload).unwrap_or_default();
        let is_deleted_int: i64 = if card.is_deleted { 1 } else { 0 };
        conn.execute(
            "INSERT OR REPLACE INTO cards (id, folder_id, title, draft, payload, raw_text, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![card.id, card.folder_id, card.title, card.draft, payload_str, card.raw_text, card.is_bookmarked, card.is_archived, card.created_at, card.updated_at, is_deleted_int, card.sync_status],
        )?;
        Ok(())
    }

    pub fn put_cards(&self, cards: &[Card]) -> SqliteResult<()> {
        let conn = self.conn()?;
        let tx = conn.unchecked_transaction()?;
        for card in cards {
            let payload_str = serde_json::to_string(&card.payload).unwrap_or_default();
            let is_deleted_int: i64 = if card.is_deleted { 1 } else { 0 };
            tx.execute(
                "INSERT OR REPLACE INTO cards (id, folder_id, title, draft, payload, raw_text, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![card.id, card.folder_id, card.title, card.draft, payload_str, card.raw_text, card.is_bookmarked, card.is_archived, card.created_at, card.updated_at, is_deleted_int, card.sync_status],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn update_card(&self, id: &str, updates: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();

        // Build dynamic SET clause from the updates JSON object
        let obj = updates.as_object().unwrap_or(&serde_json::Map::new()).clone();
        if obj.is_empty() {
            // Just update timestamp and sync status
            conn.execute(
                "UPDATE cards SET updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                params![now, SYNC_STATUS_PENDING, id],
            )?;
            return Ok(());
        }

        let mut set_parts: Vec<String> = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        for (key, val) in &obj {
            let col = camel_to_snake(key);
            set_parts.push(format!("{} = ?", col));
            match val {
                serde_json::Value::String(s) => values.push(Box::new(s.clone())),
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        values.push(Box::new(i));
                    } else if let Some(f) = n.as_f64() {
                        values.push(Box::new(f));
                    }
                }
                serde_json::Value::Bool(b) => values.push(Box::new(*b as i64)),
                _ => values.push(Box::new(serde_json::to_string(val).unwrap_or_default())),
            }
        }

        set_parts.push("updated_at = ?".to_string());
        values.push(Box::new(now));
        set_parts.push("sync_status = ?".to_string());
        values.push(Box::new(SYNC_STATUS_PENDING));

        let sql = format!("UPDATE cards SET {} WHERE id = ?", set_parts.join(", "));
        values.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice())?;
        Ok(())
    }

    pub fn delete_card(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM cards WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn soft_delete_card(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();
        conn.execute(
            "UPDATE cards SET is_deleted = 1, updated_at = ?1, sync_status = ?2 WHERE id = ?3",
            params![now, SYNC_STATUS_PENDING, id],
        )?;
        Ok(())
    }

    pub fn mark_card_synced(&self, id: &str, updated_at: i64) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE cards SET sync_status = ?1 WHERE id = ?2 AND updated_at = ?3",
            params![SYNC_STATUS_SYNCED, id, updated_at],
        )?;
        Ok(())
    }

    pub fn get_bookmarked_cards(&self) -> SqliteResult<Vec<Card>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, folder_id, title, draft, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM cards WHERE is_bookmarked = 1 AND is_deleted = 0",
        )?;
        let rows = stmt.query_map([], |row| {
            let payload_str: String = row.get(4)?;
            let is_deleted: i64 = row.get(9)?;
            Ok(Card {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                title: row.get(2)?,
                draft: row.get(3)?,
                payload: parse_json_or_empty(&payload_str),
                raw_text: "".to_string(),
                is_bookmarked: row.get(5)?,
                is_archived: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                is_deleted: is_deleted != 0,
                sync_status: row.get(10)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_recent_cards(&self, limit: i64) -> SqliteResult<Vec<Card>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, folder_id, title, draft, payload, raw_text, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM cards WHERE is_deleted = 0 ORDER BY updated_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |row| {
            let payload_str: String = row.get(4)?;
            let is_deleted: i64 = row.get(10)?;
            Ok(Card {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                title: row.get(2)?,
                draft: row.get(3)?,
                payload: parse_json_or_empty(&payload_str),
                raw_text: row.get(5)?,
                is_bookmarked: row.get(6)?,
                is_archived: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                is_deleted: is_deleted != 0,
                sync_status: row.get(11)?,
            })
        })?;
        rows.collect()
    }

    pub fn search_card(&self, query: &str) -> SqliteResult<Vec<String>> {
        let conn = self.conn()?;
        let trimmed_query = query.trim();
        if trimmed_query.is_empty() {
            return Ok(vec![]);
        }
        let pattern = format!("%{}%", trimmed_query);
        let (sql, params) = if trimmed_query.chars().count() < 3 {
            (
                "SELECT c.id FROM cards c WHERE c.title LIKE ?1 AND c.is_deleted = 0",
                params![pattern],
            )
        } else {
            (
                "SELECT c.id FROM cards c JOIN cards_title_search ct ON c.id = ct.id WHERE cards_title_search MATCH ?1 AND c.is_deleted = 0",
                params![trimmed_query],
            )
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(params, |row| {
            Ok(row.get(0)?)
        })?;
        rows.collect()
    }

    pub fn search_content(&self, query: &str) -> SqliteResult<Vec<String>> {
        let conn = self.conn()?;
        let trimmed_query = query.trim();
        if trimmed_query.is_empty() {
            return Ok(vec![]);
        }
        let pattern = format!("%{}%", trimmed_query);
        let (sql, params) = if trimmed_query.chars().count() < 3 {
            (
                "SELECT id FROM cards WHERE raw_text LIKE ?1 AND is_deleted = 0",
                params![pattern],
            )
        } else {
            (
                "SELECT c.id FROM cards c JOIN cards_raw_text_search cr ON c.id = cr.id WHERE cards_raw_text_search MATCH ?1 AND c.is_deleted = 0",
                params![trimmed_query],
            )
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(params, |row| {
            Ok(row.get(0)?)
        })?;
        rows.collect()
    }

    // --- Folders ---

    pub fn get_folder(&self, id: &str) -> SqliteResult<Option<Folder>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, parent_id, title, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM folders WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            let payload_str: String = row.get(3)?;
            let is_deleted: i64 = row.get(8)?;
            Ok(Folder {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                title: row.get(2)?,
                payload: parse_json_or_empty(&payload_str),
                is_bookmarked: row.get(4)?,
                is_archived: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                is_deleted: is_deleted != 0,
                sync_status: row.get(9)?,
            })
        })?;
        match rows.next() {
            Some(folder) => Ok(Some(folder?)),
            None => Ok(None),
        }
    }

    pub fn get_folders_in_parent(&self, parent_id: &str) -> SqliteResult<Vec<Folder>> {
        let conn = self.conn()?;
        if parent_id == ARCHIVE_FOLDER_ID {
            let mut stmt = conn.prepare(
                "SELECT id, parent_id, title, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM folders WHERE is_archived = 1 AND is_deleted = 0",
            )?;
            let rows = stmt.query_map([], |row| {
                let payload_str: String = row.get(3)?;
                let is_deleted: i64 = row.get(8)?;
                Ok(Folder {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    title: row.get(2)?,
                    payload: parse_json_or_empty(&payload_str),
                    is_bookmarked: row.get(4)?,
                    is_archived: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(9)?,
                })
            })?;
            rows.collect()
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, parent_id, title, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM folders WHERE parent_id = ?1 AND is_deleted = 0 AND is_archived = 0",
            )?;
            let rows = stmt.query_map(params![parent_id], |row| {
                let payload_str: String = row.get(3)?;
                let is_deleted: i64 = row.get(8)?;
                Ok(Folder {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    title: row.get(2)?,
                    payload: parse_json_or_empty(&payload_str),
                    is_bookmarked: row.get(4)?,
                    is_archived: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(9)?,
                })
            })?;
            rows.collect()
        }
    }

    pub fn add_folder(&self, folder: &FolderField) -> SqliteResult<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = current_time_ms();
        let conn = self.conn()?;
        let payload_str = serde_json::to_string(&folder.payload).unwrap_or_default();
        conn.execute(
            "INSERT INTO folders (id, parent_id, title, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9)",
            params![id, folder.parent_id, folder.title, payload_str, folder.is_bookmarked, folder.is_archived, now, now, SYNC_STATUS_PENDING],
        )?;
        Ok(id)
    }

    pub fn put_folder(&self, folder: &Folder) -> SqliteResult<()> {
        let conn = self.conn()?;
        let payload_str = serde_json::to_string(&folder.payload).unwrap_or_default();
        let is_deleted_int: i64 = if folder.is_deleted { 1 } else { 0 };
        conn.execute(
            "INSERT OR REPLACE INTO folders (id, parent_id, title, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![folder.id, folder.parent_id, folder.title, payload_str, folder.is_bookmarked, folder.is_archived, folder.created_at, folder.updated_at, is_deleted_int, folder.sync_status],
        )?;
        Ok(())
    }

    pub fn put_folders(&self, folders: &[Folder]) -> SqliteResult<()> {
        let conn = self.conn()?;
        let tx = conn.unchecked_transaction()?;
        for folder in folders {
            let payload_str = serde_json::to_string(&folder.payload).unwrap_or_default();
            let is_deleted_int: i64 = if folder.is_deleted { 1 } else { 0 };
            tx.execute(
                "INSERT OR REPLACE INTO folders (id, parent_id, title, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![folder.id, folder.parent_id, folder.title, payload_str, folder.is_bookmarked, folder.is_archived, folder.created_at, folder.updated_at, is_deleted_int, folder.sync_status],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn update_folder(&self, id: &str, updates: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();

        let obj = updates.as_object().unwrap_or(&serde_json::Map::new()).clone();
        if obj.is_empty() {
            conn.execute(
                "UPDATE folders SET updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                params![now, SYNC_STATUS_PENDING, id],
            )?;
            return Ok(());
        }

        let mut set_parts: Vec<String> = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        for (key, val) in &obj {
            let col = camel_to_snake(key);
            set_parts.push(format!("{} = ?", col));
            match val {
                serde_json::Value::String(s) => values.push(Box::new(s.clone())),
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        values.push(Box::new(i));
                    } else if let Some(f) = n.as_f64() {
                        values.push(Box::new(f));
                    }
                }
                serde_json::Value::Bool(b) => values.push(Box::new(*b as i64)),
                _ => values.push(Box::new(serde_json::to_string(val).unwrap_or_default())),
            }
        }

        set_parts.push("updated_at = ?".to_string());
        values.push(Box::new(now));
        set_parts.push("sync_status = ?".to_string());
        values.push(Box::new(SYNC_STATUS_PENDING));

        let sql = format!("UPDATE folders SET {} WHERE id = ?", set_parts.join(", "));
        values.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice())?;
        Ok(())
    }

    pub fn delete_folder(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn soft_delete_folder(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();
        conn.execute(
            "UPDATE folders SET is_deleted = 1, updated_at = ?1, sync_status = ?2 WHERE id = ?3",
            params![now, SYNC_STATUS_PENDING, id],
        )?;
        Ok(())
    }

    pub fn mark_folder_synced(&self, id: &str, updated_at: i64) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE folders SET sync_status = ?1 WHERE id = ?2 AND updated_at = ?3",
            params![SYNC_STATUS_SYNCED, id, updated_at],
        )?;
        Ok(())
    }

    pub fn get_bookmarked_folders(&self) -> SqliteResult<Vec<Folder>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, parent_id, title, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM folders WHERE is_bookmarked = 1 AND is_deleted = 0",
        )?;
        let rows = stmt.query_map([], |row| {
            let payload_str: String = row.get(3)?;
            let is_deleted: i64 = row.get(8)?;
            Ok(Folder {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                title: row.get(2)?,
                payload: parse_json_or_empty(&payload_str),
                is_bookmarked: row.get(4)?,
                is_archived: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                is_deleted: is_deleted != 0,
                sync_status: row.get(9)?,
            })
        })?;
        rows.collect()
    }

    pub fn last_order_in_folder(&self, folder_id: &str, item_type: &str) -> SqliteResult<Option<String>> {
        let conn = self.conn()?;
        let sql = match item_type {
            "card" => "SELECT json_extract(payload, '$.sortOrder') FROM cards WHERE folder_id = ?1 AND is_deleted = 0 AND is_archived = 0 AND json_extract(payload, '$.sortOrder') IS NOT NULL ORDER BY json_extract(payload, '$.sortOrder') DESC LIMIT 1",
            "folder" => "SELECT json_extract(payload, '$.sortOrder') FROM folders WHERE parent_id = ?1 AND is_deleted = 0 AND is_archived = 0 AND json_extract(payload, '$.sortOrder') IS NOT NULL ORDER BY json_extract(payload, '$.sortOrder') DESC LIMIT 1",
            _ => return Ok(None),
        };
        let mut stmt = conn.prepare(sql)?;
        let result = stmt.query_row(params![folder_id], |row| {
            let sort_order: Option<String> = row.get(0)?;
            Ok(sort_order)
        });
        match result {
            Ok(sort_order) => Ok(sort_order),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn search_folder(&self, query: &str) -> SqliteResult<Vec<String>> {
        let conn = self.conn()?;
        let trimmed_query = query.trim();
        if trimmed_query.is_empty() {
            return Ok(vec![]);
        }
        let pattern = format!("%{}%", trimmed_query);
        let (sql, params) = if trimmed_query.chars().count() < 3 {
            (
                "SELECT id FROM folders WHERE title LIKE ?1 AND is_deleted = 0",
                params![pattern],
            )
        } else {
            (
                "SELECT f.id FROM folders f JOIN folders_title_search ft ON f.id = ft.id WHERE folders_title_search MATCH ?1 AND f.is_deleted = 0",
                params![trimmed_query],
            )
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(params, |row| {
            Ok(row.get(0)?)
        })?;
        rows.collect()
    }

    // --- Tiptaps ---

    pub fn get_tiptap(&self, id: &str) -> SqliteResult<Option<TiptapV2>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, content, history, created_at, updated_at, is_deleted, sync_status FROM tiptaps WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            let content_str: String = row.get(1)?;
            let history_str: String = row.get(2)?;
            let is_deleted: i64 = row.get(5)?;
            Ok(TiptapV2 {
                id: row.get(0)?,
                content: parse_json_or_empty(&content_str),
                history: serde_json::from_str(&history_str).unwrap_or_default(),
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                is_deleted: is_deleted != 0,
                sync_status: row.get(6)?,
            })
        })?;
        match rows.next() {
            Some(tiptap) => Ok(Some(tiptap?)),
            None => Ok(None),
        }
    }

    pub fn add_tiptap(&self, tiptap: &TiptapV2Field) -> SqliteResult<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = current_time_ms();
        let conn = self.conn()?;
        let content_str = serde_json::to_string(&tiptap.content).unwrap_or_default();
        let history_str = serde_json::to_string(&tiptap.history).unwrap_or_default();
        conn.execute(
            "INSERT INTO tiptaps (id, content, history, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
            params![id, content_str, history_str, now, now, SYNC_STATUS_PENDING],
        )?;
        Ok(id)
    }

    pub fn put_tiptap(&self, tiptap: &TiptapV2) -> SqliteResult<()> {
        let conn = self.conn()?;
        let content_str = serde_json::to_string(&tiptap.content).unwrap_or_default();
        let history_str = serde_json::to_string(&tiptap.history).unwrap_or_default();
        let is_deleted_int: i64 = if tiptap.is_deleted { 1 } else { 0 };
        conn.execute(
            "INSERT OR REPLACE INTO tiptaps (id, content, history, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![tiptap.id, content_str, history_str, tiptap.created_at, tiptap.updated_at, is_deleted_int, tiptap.sync_status],
        )?;
        Ok(())
    }

    pub fn put_tiptaps(&self, tiptaps: &[TiptapV2]) -> SqliteResult<()> {
        let conn = self.conn()?;
        let tx = conn.unchecked_transaction()?;
        for tiptap in tiptaps {
            let content_str = serde_json::to_string(&tiptap.content).unwrap_or_default();
            let history_str = serde_json::to_string(&tiptap.history).unwrap_or_default();
            let is_deleted_int: i64 = if tiptap.is_deleted { 1 } else { 0 };
            tx.execute(
                "INSERT OR REPLACE INTO tiptaps (id, content, history, created_at, updated_at, is_deleted, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![tiptap.id, content_str, history_str, tiptap.created_at, tiptap.updated_at, is_deleted_int, tiptap.sync_status],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn sync_tiptap(&self, id: &str, content: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();
        let content_str = serde_json::to_string(content).unwrap_or_default();
        conn.execute(
            "UPDATE tiptaps SET content = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4",
            params![content_str, now, SYNC_STATUS_PENDING, id],
        )?;
        Ok(())
    }

    pub fn update_tiptap(&self, id: &str, updates: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();

        let obj = updates.as_object().unwrap_or(&serde_json::Map::new()).clone();
        if obj.is_empty() {
            conn.execute(
                "UPDATE tiptaps SET updated_at = ?1, sync_status = ?2 WHERE id = ?3",
                params![now, SYNC_STATUS_PENDING, id],
            )?;
            return Ok(());
        }

        let mut set_parts: Vec<String> = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        for (key, val) in &obj {
            let col = camel_to_snake(key);
            set_parts.push(format!("{} = ?", col));
            match val {
                serde_json::Value::String(s) => values.push(Box::new(s.clone())),
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        values.push(Box::new(i));
                    } else if let Some(f) = n.as_f64() {
                        values.push(Box::new(f));
                    }
                }
                serde_json::Value::Bool(b) => values.push(Box::new(*b as i64)),
                _ => values.push(Box::new(serde_json::to_string(val).unwrap_or_default())),
            }
        }

        set_parts.push("updated_at = ?".to_string());
        values.push(Box::new(now));
        set_parts.push("sync_status = ?".to_string());
        values.push(Box::new(SYNC_STATUS_PENDING));

        let sql = format!("UPDATE tiptaps SET {} WHERE id = ?", set_parts.join(", "));
        values.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice())?;
        Ok(())
    }

    pub fn delete_tiptap(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM tiptaps WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn soft_delete_tiptap(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();
        conn.execute(
            "UPDATE tiptaps SET is_deleted = 1, updated_at = ?1, sync_status = ?2 WHERE id = ?3",
            params![now, SYNC_STATUS_PENDING, id],
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
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT history FROM tiptaps WHERE id = ?1")?;
        let mut rows = stmt.query_map(params![id], |row| {
            let history_str: String = row.get(0)?;
            Ok(history_str)
        })?;
        match rows.next() {
            Some(history_str) => {
                let history_str = history_str?;
                let history: Vec<HistoryEntry> =
                    serde_json::from_str(&history_str).unwrap_or_default();
                Ok(history.iter().map(|e| e.time).collect())
            }
            None => Ok(vec![]),
        }
    }

    pub fn get_tiptap_history(
        &self,
        id: &str,
        ts: i64,
    ) -> SqliteResult<serde_json::Value> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT history FROM tiptaps WHERE id = ?1")?;
        let mut rows = stmt.query_map(params![id], |row| {
            let history_str: String = row.get(0)?;
            Ok(history_str)
        })?;
        match rows.next() {
            Some(history_str) => {
                let history_str = history_str?;
                let history: Vec<HistoryEntry> =
                    serde_json::from_str(&history_str).unwrap_or_default();
                match history.iter().find(|e| e.time == ts) {
                    Some(entry) => Ok(entry.content.clone()),
                    None => Err(rusqlite::Error::QueryReturnedNoRows),
                }
            }
            None => Err(rusqlite::Error::QueryReturnedNoRows),
        }
    }

    pub fn restore_tiptap_history(&self, id: &str, ts: i64) -> SqliteResult<()> {
        let conn = self.conn()?;
        let now = current_time_ms();
        let mut stmt = conn.prepare("SELECT history FROM tiptaps WHERE id = ?1")?;
        let mut rows = stmt.query_map(params![id], |row| {
            let history_str: String = row.get(0)?;
            Ok(history_str)
        })?;
        match rows.next() {
            Some(history_str) => {
                let history_str = history_str?;
                let history: Vec<HistoryEntry> =
                    serde_json::from_str(&history_str).unwrap_or_default();
                match history.iter().find(|e| e.time == ts) {
                    Some(entry) => {
                        let content_str =
                            serde_json::to_string(&entry.content).unwrap_or_default();
                        conn.execute(
                            "UPDATE tiptaps SET content = ?1, updated_at = ?2, sync_status = ?3 WHERE id = ?4",
                            params![content_str, now, SYNC_STATUS_PENDING, id],
                        )?;
                        Ok(())
                    }
                    None => Err(rusqlite::Error::QueryReturnedNoRows),
                }
            }
            None => Err(rusqlite::Error::QueryReturnedNoRows),
        }
    }

    // --- Sync ---

    pub fn get_pending_changes(&self) -> SqliteResult<PendingChanges> {
        let conn = self.conn()?;

        let cards = {
            let mut stmt = conn.prepare(
                "SELECT id, folder_id, title, draft, payload, raw_text, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM cards WHERE sync_status = ?1",
            )?;
            let rows = stmt.query_map(params![SYNC_STATUS_PENDING], |row| {
                let payload_str: String = row.get(4)?;
                let is_deleted: i64 = row.get(10)?;
                Ok(Card {
                    id: row.get(0)?,
                    folder_id: row.get(1)?,
                    title: row.get(2)?,
                    draft: row.get(3)?,
                    payload: parse_json_or_empty(&payload_str),
                    raw_text: row.get(5)?,
                    is_bookmarked: row.get(6)?,
                    is_archived: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(11)?,
                })
            })?;
            rows.collect::<SqliteResult<Vec<Card>>>()?
        };

        let folders = {
            let mut stmt = conn.prepare(
                "SELECT id, parent_id, title, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM folders WHERE sync_status = ?1",
            )?;
            let rows = stmt.query_map(params![SYNC_STATUS_PENDING], |row| {
                let payload_str: String = row.get(3)?;
                let is_deleted: i64 = row.get(8)?;
                Ok(Folder {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    title: row.get(2)?,
                    payload: parse_json_or_empty(&payload_str),
                    is_bookmarked: row.get(4)?,
                    is_archived: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(9)?,
                })
            })?;
            rows.collect::<SqliteResult<Vec<Folder>>>()?
        };

        let tiptaps = {
            let mut stmt = conn.prepare(
                "SELECT id, content, history, created_at, updated_at, is_deleted, sync_status FROM tiptaps WHERE sync_status = ?1",
            )?;
            let rows = stmt.query_map(params![SYNC_STATUS_PENDING], |row| {
                let content_str: String = row.get(1)?;
                let history_str: String = row.get(2)?;
                let is_deleted: i64 = row.get(5)?;
                Ok(TiptapV2 {
                    id: row.get(0)?,
                    content: parse_json_or_empty(&content_str),
                    history: serde_json::from_str(&history_str).unwrap_or_default(),
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(6)?,
                })
            })?;
            rows.collect::<SqliteResult<Vec<TiptapV2>>>()?
        };

        Ok(PendingChanges {
            cards,
            folders,
            tiptaps,
        })
    }

    pub fn get_local_data_for_sync(&self) -> SqliteResult<PendingChanges> {
        let conn = self.conn()?;

        let cards = {
            let mut stmt = conn.prepare(
                "SELECT id, folder_id, title, draft, payload, raw_text, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM cards",
            )?;
            let rows = stmt.query_map([], |row| {
                let payload_str: String = row.get(4)?;
                let is_deleted: i64 = row.get(10)?;
                Ok(Card {
                    id: row.get(0)?,
                    folder_id: row.get(1)?,
                    title: row.get(2)?,
                    draft: row.get(3)?,
                    payload: parse_json_or_empty(&payload_str),
                    raw_text: row.get(5)?,
                    is_bookmarked: row.get(6)?,
                    is_archived: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(11)?,
                })
            })?;
            rows.collect::<SqliteResult<Vec<Card>>>()?
        };

        let folders = {
            let mut stmt = conn.prepare(
                "SELECT id, parent_id, title, payload, is_bookmarked, is_archived, created_at, updated_at, is_deleted, sync_status FROM folders",
            )?;
            let rows = stmt.query_map([], |row| {
                let payload_str: String = row.get(3)?;
                let is_deleted: i64 = row.get(8)?;
                Ok(Folder {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    title: row.get(2)?,
                    payload: parse_json_or_empty(&payload_str),
                    is_bookmarked: row.get(4)?,
                    is_archived: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(9)?,
                })
            })?;
            rows.collect::<SqliteResult<Vec<Folder>>>()?
        };

        let tiptaps = {
            let mut stmt = conn.prepare(
                "SELECT id, content, history, created_at, updated_at, is_deleted, sync_status FROM tiptaps",
            )?;
            let rows = stmt.query_map([], |row| {
                let content_str: String = row.get(1)?;
                let history_str: String = row.get(2)?;
                let is_deleted: i64 = row.get(5)?;
                Ok(TiptapV2 {
                    id: row.get(0)?,
                    content: parse_json_or_empty(&content_str),
                    history: serde_json::from_str(&history_str).unwrap_or_default(),
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    is_deleted: is_deleted != 0,
                    sync_status: row.get(6)?,
                })
            })?;
            rows.collect::<SqliteResult<Vec<TiptapV2>>>()?
        };

        Ok(PendingChanges {
            cards,
            folders,
            tiptaps,
        })
    }

    pub fn get_sync_meta(&self, key: &str) -> SqliteResult<Option<SyncMeta>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT key, value FROM sync_meta WHERE key = ?1")?;
        let mut rows = stmt.query_map(params![key], |row| {
            let value_str: String = row.get(1)?;
            Ok(SyncMeta {
                key: row.get(0)?,
                value: serde_json::from_str(&value_str).unwrap_or(serde_json::Value::String(value_str)),
            })
        })?;
        match rows.next() {
            Some(meta) => Ok(Some(meta?)),
            None => Ok(None),
        }
    }

    pub fn set_sync_meta(&self, key: &str, value: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.conn()?;
        let value_str = serde_json::to_string(value).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?1, ?2)",
            params![key, value_str],
        )?;
        Ok(())
    }

    pub fn get_last_server_version(&self) -> SqliteResult<i64> {
        match self.get_sync_meta("lastServerVersion")? {
            Some(meta) => {
                if let Some(n) = meta.value.as_i64() {
                    Ok(n)
                } else if let Some(s) = meta.value.as_str() {
                    Ok(s.parse().unwrap_or(0))
                } else {
                    Ok(0)
                }
            }
            None => Ok(0),
        }
    }

    pub fn clear_all_data(&self) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute_batch(
            "
            DELETE FROM user;
            DELETE FROM cards;
            DELETE FROM folders;
            DELETE FROM tiptaps;
            DELETE FROM sync_meta;
            ",
        )?;
        Ok(())
    }
}

// --- Helpers ---

fn parse_json_or_empty(s: &str) -> serde_json::Value {
    serde_json::from_str(s).unwrap_or(serde_json::Value::Object(Default::default()))
}

fn current_time_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn camel_to_snake(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 {
                result.push('_');
            }
            result.push(c.to_lowercase().next().unwrap());
        } else {
            result.push(c);
        }
    }
    result
}

// --- Tauri Commands ---

#[cfg(feature = "flomo")]
pub mod commands {
    use super::*;
    use std::sync::OnceLock;
    use tauri::{AppHandle, Manager};

    static DB: OnceLock<FlomoDb> = OnceLock::new();

    pub fn init_db(app: &AppHandle) -> Result<(), String> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let db_path = app_data_dir.join("flomo.db");
        let db = FlomoDb::new(db_path.to_str().unwrap()).map_err(|e| e.to_string())?;
        DB.set(db).map_err(|_| "DB already initialized".to_string())?;
        Ok(())
    }

    fn get_db() -> Result<&'static FlomoDb, String> {
        DB.get().ok_or_else(|| "DB not initialized".to_string())
    }

    // User
    #[tauri::command]
    pub fn flomo_get_user() -> Result<Option<User>, String> {
        get_db()?.get_user().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_put_user(user: User) -> Result<(), String> {
        get_db()?.put_user(&user).map_err(|e| e.to_string())
    }

    // Cards
    #[tauri::command]
    pub fn flomo_get_card(id: String) -> Result<Option<Card>, String> {
        get_db()?.get_card(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_full_card(id: String) -> Result<Option<Card>, String> {
        get_db()?.get_full_card(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_cards_in_folder(folder_id: String) -> Result<Vec<Card>, String> {
        get_db()?.get_cards_in_folder(&folder_id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_add_card(card: CardField) -> Result<String, String> {
        get_db()?.add_card(&card).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_put_card(card: Card) -> Result<(), String> {
        get_db()?.put_card(&card).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_put_cards(cards: Vec<Card>) -> Result<(), String> {
        get_db()?.put_cards(&cards).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_update_card(id: String, updates: serde_json::Value) -> Result<(), String> {
        get_db()?.update_card(&id, &updates).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_delete_card(id: String) -> Result<(), String> {
        get_db()?.delete_card(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_soft_delete_card(id: String) -> Result<(), String> {
        get_db()?.soft_delete_card(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_mark_card_synced(id: String, updated_at: i64) -> Result<(), String> {
        get_db()?.mark_card_synced(&id, updated_at).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_bookmarked_cards() -> Result<Vec<Card>, String> {
        get_db()?.get_bookmarked_cards().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_recent_cards(limit: i64) -> Result<Vec<Card>, String> {
        get_db()?.get_recent_cards(limit).map_err(|e| e.to_string())
    }

    // Folders
    #[tauri::command]
    pub fn flomo_get_folder(id: String) -> Result<Option<Folder>, String> {
        get_db()?.get_folder(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_folders_in_parent(parent_id: String) -> Result<Vec<Folder>, String> {
        get_db()?.get_folders_in_parent(&parent_id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_add_folder(folder: FolderField) -> Result<String, String> {
        get_db()?.add_folder(&folder).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_put_folder(folder: Folder) -> Result<(), String> {
        get_db()?.put_folder(&folder).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_put_folders(folders: Vec<Folder>) -> Result<(), String> {
        get_db()?.put_folders(&folders).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_update_folder(id: String, updates: serde_json::Value) -> Result<(), String> {
        get_db()?.update_folder(&id, &updates).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_delete_folder(id: String) -> Result<(), String> {
        get_db()?.delete_folder(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_soft_delete_folder(id: String) -> Result<(), String> {
        get_db()?.soft_delete_folder(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_mark_folder_synced(id: String, updated_at: i64) -> Result<(), String> {
        get_db()?.mark_folder_synced(&id, updated_at).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_bookmarked_folders() -> Result<Vec<Folder>, String> {
        get_db()?.get_bookmarked_folders().map_err(|e| e.to_string())
    }

    // Order
    #[tauri::command]
    pub fn flomo_last_order_in_folder(folder_id: String, item_type: String) -> Result<Option<String>, String> {
        get_db()?.last_order_in_folder(&folder_id, &item_type).map_err(|e| e.to_string())
    }

    // Tiptaps
    #[tauri::command]
    pub fn flomo_get_tiptap(id: String) -> Result<Option<TiptapV2>, String> {
        get_db()?.get_tiptap(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_add_tiptap(tiptap: TiptapV2Field) -> Result<String, String> {
        get_db()?.add_tiptap(&tiptap).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_put_tiptap(tiptap: TiptapV2) -> Result<(), String> {
        get_db()?.put_tiptap(&tiptap).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_put_tiptaps(tiptaps: Vec<TiptapV2>) -> Result<(), String> {
        get_db()?.put_tiptaps(&tiptaps).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_sync_tiptap(id: String, content: serde_json::Value) -> Result<(), String> {
        get_db()?.sync_tiptap(&id, &content).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_update_tiptap(id: String, updates: serde_json::Value) -> Result<(), String> {
        get_db()?.update_tiptap(&id, &updates).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_delete_tiptap(id: String) -> Result<(), String> {
        get_db()?.delete_tiptap(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_soft_delete_tiptap(id: String) -> Result<(), String> {
        get_db()?.soft_delete_tiptap(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_mark_tiptap_synced(id: String, updated_at: i64) -> Result<(), String> {
        get_db()?.mark_tiptap_synced(&id, updated_at).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_list_tiptap_history(id: String) -> Result<Vec<i64>, String> {
        get_db()?.list_tiptap_history(&id).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_tiptap_history(id: String, ts: i64) -> Result<serde_json::Value, String> {
        get_db()?.get_tiptap_history(&id, ts).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_restore_tiptap_history(id: String, ts: i64) -> Result<(), String> {
        get_db()?.restore_tiptap_history(&id, ts).map_err(|e| e.to_string())
    }

    // Sync
    #[tauri::command]
    pub fn flomo_get_pending_changes() -> Result<PendingChanges, String> {
        get_db()?.get_pending_changes().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_local_data_for_sync() -> Result<PendingChanges, String> {
        get_db()?.get_local_data_for_sync().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_sync_meta(key: String) -> Result<Option<SyncMeta>, String> {
        get_db()?.get_sync_meta(&key).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_set_sync_meta(key: String, value: serde_json::Value) -> Result<(), String> {
        get_db()?.set_sync_meta(&key, &value).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_get_last_server_version() -> Result<i64, String> {
        get_db()?.get_last_server_version().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_clear_all_data() -> Result<(), String> {
        get_db()?.clear_all_data().map_err(|e| e.to_string())
    }

    // --- Sync API commands ---

    use crate::media_cache::backend_url;

    #[tauri::command]
    pub async fn flomo_full_sync() -> Result<serde_json::Value, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/flomo?Action=FullSync", backend_url());

        #[cfg(debug_assertions)]
        println!("[flomo_db][request] GET {}", url);

        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to send full sync request: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Full sync failed with status: {}", response.status()));
        }

        response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| format!("Failed to parse full sync response: {}", e))
    }

    #[tauri::command]
    pub async fn flomo_push(data: FlomoData) -> Result<serde_json::Value, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/flomo?Action=Push", backend_url());

        #[cfg(debug_assertions)]
        println!("[flomo_db][request] POST {}", url);

        let result = tokio::time::timeout(
            std::time::Duration::from_secs(5),
            async {
                let response = client
                    .post(&url)
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
            },
        )
        .await;

        match result {
            Ok(r) => r,
            Err(_) => Err("Request timeout after 5s".to_string()),
        }
    }

    #[tauri::command]
    pub async fn flomo_pull(version: i64) -> Result<serde_json::Value, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/flomo?Action=Pull&since={}", backend_url(), version);

        #[cfg(debug_assertions)]
        println!("[flomo_db][request] GET {}", url);

        let result = tokio::time::timeout(
            std::time::Duration::from_secs(5),
            async {
                let response = client
                    .get(&url)
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
            },
        )
        .await;

        match result {
            Ok(r) => r,
            Err(_) => Err("Request timeout after 5s".to_string()),
        }
    }

    // --- Search ---

    #[tauri::command]
    pub fn flomo_search_card(query: String) -> Result<Vec<String>, String> {
        get_db()?.search_card(&query).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_search_folder(query: String) -> Result<Vec<String>, String> {
        get_db()?.search_folder(&query).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn flomo_search_content(query: String) -> Result<Vec<String>, String> {
        get_db()?.search_content(&query).map_err(|e| e.to_string())
    }
}

// --- Tests ---

#[cfg(test)]
mod tests {
    use super::*;

    fn make_db() -> FlomoDb {
        FlomoDb::new_in_memory().expect("Failed to create in-memory DB")
    }

    // --- User tests ---

    #[test]
    fn test_user_crud() {
        let db = make_db();

        // Initially no user
        assert!(db.get_user().unwrap().is_none());

        // Put a user
        let user = User {
            key: USER_KEY.to_string(),
            username: "alice".to_string(),
            email: "alice@example.com".to_string(),
            avatar: "avatar.png".to_string(),
            language: "en-US".to_string(),
            updated_at: 1000,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_user(&user).unwrap();

        // Get user
        let fetched = db.get_user().unwrap().unwrap();
        assert_eq!(fetched.username, "alice");
        assert_eq!(fetched.email, "alice@example.com");
        assert_eq!(fetched.sync_status, SYNC_STATUS_SYNCED);

        // Update user
        let updated = User {
            username: "bob".to_string(),
            email: "bob@example.com".to_string(),
            updated_at: 2000,
            ..user
        };
        db.put_user(&updated).unwrap();
        let fetched = db.get_user().unwrap().unwrap();
        assert_eq!(fetched.username, "bob");
        assert_eq!(fetched.email, "bob@example.com");
        assert_eq!(fetched.updated_at, 2000);
    }

    // --- Card tests ---

    #[test]
    fn test_card_add_and_get() {
        let db = make_db();
        let card_field = CardField {
            folder_id: "folder-1".to_string(),
            title: "Test Card".to_string(),
            draft: "draft-1".to_string(),
            payload: serde_json::json!({"emoji": "🌟"}),
            raw_text: "Hello world".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
        };

        let id = db.add_card(&card_field).unwrap();
        assert!(!id.is_empty());

        let card = db.get_card(&id).unwrap().unwrap();
        assert_eq!(card.title, "Test Card");
        assert_eq!(card.folder_id, "folder-1");
        assert_eq!(card.sync_status, SYNC_STATUS_PENDING);
        assert!(!card.is_deleted);
        assert!(card.created_at > 0);
    }

    #[test]
    fn test_card_get_nonexistent() {
        let db = make_db();
        assert!(db.get_card("nonexistent").unwrap().is_none());
    }

    #[test]
    fn test_card_put_and_update() {
        let db = make_db();
        let card = Card {
            id: "card-1".to_string(),
            folder_id: "folder-1".to_string(),
            title: "Original".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "text".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_card(&card).unwrap();

        let fetched = db.get_card("card-1").unwrap().unwrap();
        assert_eq!(fetched.title, "Original");
        assert_eq!(fetched.sync_status, SYNC_STATUS_SYNCED);

        // Update card
        db.update_card(
            "card-1",
            &serde_json::json!({"title": "Updated", "isBookmarked": 1}),
        )
        .unwrap();

        let fetched = db.get_card("card-1").unwrap().unwrap();
        assert_eq!(fetched.title, "Updated");
        assert_eq!(fetched.is_bookmarked, 1);
        assert_eq!(fetched.sync_status, SYNC_STATUS_PENDING);
        assert!(fetched.updated_at > 1000);
    }

    #[test]
    fn test_card_put_bulk() {
        let db = make_db();
        let cards: Vec<Card> = (0..5)
            .map(|i| Card {
                id: format!("card-{}", i),
                folder_id: "folder-1".to_string(),
                title: format!("Card {}", i),
                draft: format!("d{}", i),
                payload: serde_json::json!({}),
                raw_text: format!("text {}", i),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            })
            .collect();

        db.put_cards(&cards).unwrap();

        for i in 0..5 {
            let card = db.get_card(&format!("card-{}", i)).unwrap().unwrap();
            assert_eq!(card.title, format!("Card {}", i));
        }
    }

    #[test]
    fn test_card_soft_delete() {
        let db = make_db();
        let card_field = CardField {
            folder_id: "folder-1".to_string(),
            title: "To Delete".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "text".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
        };
        let id = db.add_card(&card_field).unwrap();

        db.soft_delete_card(&id).unwrap();
        let card = db.get_card(&id).unwrap().unwrap();
        assert!(card.is_deleted);
        assert_eq!(card.sync_status, SYNC_STATUS_PENDING);
    }

    #[test]
    fn test_card_hard_delete() {
        let db = make_db();
        let card_field = CardField {
            folder_id: "folder-1".to_string(),
            title: "To Delete".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "text".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
        };
        let id = db.add_card(&card_field).unwrap();

        db.delete_card(&id).unwrap();
        assert!(db.get_card(&id).unwrap().is_none());
    }

    #[test]
    fn test_cards_in_folder() {
        let db = make_db();
        // Add cards to different folders
        let cards = vec![
            Card {
                id: "c1".to_string(),
                folder_id: "f1".to_string(),
                title: "Card 1".to_string(),
                draft: "d1".to_string(),
                payload: serde_json::json!({}),
                raw_text: "t1".to_string(),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            },
            Card {
                id: "c2".to_string(),
                folder_id: "f1".to_string(),
                title: "Card 2".to_string(),
                draft: "d2".to_string(),
                payload: serde_json::json!({}),
                raw_text: "t2".to_string(),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            },
            Card {
                id: "c3".to_string(),
                folder_id: "f2".to_string(),
                title: "Card 3".to_string(),
                draft: "d3".to_string(),
                payload: serde_json::json!({}),
                raw_text: "t3".to_string(),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            },
            // Deleted card in f1 - should not appear
            Card {
                id: "c4".to_string(),
                folder_id: "f1".to_string(),
                title: "Deleted Card".to_string(),
                draft: "d4".to_string(),
                payload: serde_json::json!({}),
                raw_text: "t4".to_string(),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: true,
                sync_status: SYNC_STATUS_SYNCED,
            },
            // Archived card in f1 - should not appear in normal folder query
            Card {
                id: "c5".to_string(),
                folder_id: "f1".to_string(),
                title: "Archived Card".to_string(),
                draft: "d5".to_string(),
                payload: serde_json::json!({}),
                raw_text: "t5".to_string(),
                is_bookmarked: 0,
                is_archived: 1,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            },
        ];
        db.put_cards(&cards).unwrap();

        let f1_cards = db.get_cards_in_folder("f1").unwrap();
        assert_eq!(f1_cards.len(), 2);

        let f2_cards = db.get_cards_in_folder("f2").unwrap();
        assert_eq!(f2_cards.len(), 1);

        // Archive folder returns archived cards
        let archived = db.get_cards_in_folder(ARCHIVE_FOLDER_ID).unwrap();
        assert_eq!(archived.len(), 1);
        assert_eq!(archived[0].title, "Archived Card");
    }

    #[test]
    fn test_card_mark_synced() {
        let db = make_db();
        let card_field = CardField {
            folder_id: "folder-1".to_string(),
            title: "Test".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "text".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
        };
        let id = db.add_card(&card_field).unwrap();
        let card = db.get_card(&id).unwrap().unwrap();
        assert_eq!(card.sync_status, SYNC_STATUS_PENDING);

        // Mark synced with matching updatedAt
        db.mark_card_synced(&id, card.updated_at).unwrap();
        let card = db.get_card(&id).unwrap().unwrap();
        assert_eq!(card.sync_status, SYNC_STATUS_SYNCED);
    }

    #[test]
    fn test_card_mark_synced_stale() {
        let db = make_db();
        let card_field = CardField {
            folder_id: "folder-1".to_string(),
            title: "Test".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "text".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
        };
        let id = db.add_card(&card_field).unwrap();

        // Mark synced with non-matching updatedAt should be a no-op
        db.mark_card_synced(&id, 99999).unwrap();
        let card = db.get_card(&id).unwrap().unwrap();
        assert_eq!(card.sync_status, SYNC_STATUS_PENDING);
    }

    #[test]
    fn test_card_search_trim_and_multibyte_length() {
        let db = make_db();
        let card = Card {
            id: "card-cn".to_string(),
            folder_id: "folder-1".to_string(),
            title: "你好世界".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "这是正文".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_card(&card).unwrap();

        assert!(db.search_card("").unwrap().is_empty());
        assert!(db.search_card("   ").unwrap().is_empty());
        assert_eq!(db.search_card("  你好  ").unwrap(), vec!["card-cn".to_string()]);
    }

    // --- Folder tests ---

    #[test]
    fn test_folder_add_and_get() {
        let db = make_db();
        let folder_field = FolderField {
            parent_id: "root".to_string(),
            title: "Test Folder".to_string(),
            payload: serde_json::json!({"emoji": "📁"}),
            is_bookmarked: 0,
            is_archived: 0,
        };

        let id = db.add_folder(&folder_field).unwrap();
        assert!(!id.is_empty());

        let folder = db.get_folder(&id).unwrap().unwrap();
        assert_eq!(folder.title, "Test Folder");
        assert_eq!(folder.parent_id, "root");
        assert_eq!(folder.sync_status, SYNC_STATUS_PENDING);
        assert!(!folder.is_deleted);
    }

    #[test]
    fn test_folder_get_nonexistent() {
        let db = make_db();
        assert!(db.get_folder("nonexistent").unwrap().is_none());
    }

    #[test]
    fn test_folder_put_and_update() {
        let db = make_db();
        let folder = Folder {
            id: "folder-1".to_string(),
            parent_id: "root".to_string(),
            title: "Original".to_string(),
            payload: serde_json::json!({}),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_folder(&folder).unwrap();

        db.update_folder(
            "folder-1",
            &serde_json::json!({"title": "Updated", "isBookmarked": 1}),
        )
        .unwrap();

        let fetched = db.get_folder("folder-1").unwrap().unwrap();
        assert_eq!(fetched.title, "Updated");
        assert_eq!(fetched.is_bookmarked, 1);
        assert_eq!(fetched.sync_status, SYNC_STATUS_PENDING);
    }

    #[test]
    fn test_folder_bulk_put() {
        let db = make_db();
        let folders: Vec<Folder> = (0..3)
            .map(|i| Folder {
                id: format!("folder-{}", i),
                parent_id: "root".to_string(),
                title: format!("Folder {}", i),
                payload: serde_json::json!({}),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            })
            .collect();

        db.put_folders(&folders).unwrap();

        for i in 0..3 {
            let folder = db.get_folder(&format!("folder-{}", i)).unwrap().unwrap();
            assert_eq!(folder.title, format!("Folder {}", i));
        }
    }

    #[test]
    fn test_folder_soft_delete() {
        let db = make_db();
        let folder_field = FolderField {
            parent_id: "root".to_string(),
            title: "To Delete".to_string(),
            payload: serde_json::json!({}),
            is_bookmarked: 0,
            is_archived: 0,
        };
        let id = db.add_folder(&folder_field).unwrap();

        db.soft_delete_folder(&id).unwrap();
        let folder = db.get_folder(&id).unwrap().unwrap();
        assert!(folder.is_deleted);
        assert_eq!(folder.sync_status, SYNC_STATUS_PENDING);
    }

    #[test]
    fn test_folder_hard_delete() {
        let db = make_db();
        let folder_field = FolderField {
            parent_id: "root".to_string(),
            title: "To Delete".to_string(),
            payload: serde_json::json!({}),
            is_bookmarked: 0,
            is_archived: 0,
        };
        let id = db.add_folder(&folder_field).unwrap();

        db.delete_folder(&id).unwrap();
        assert!(db.get_folder(&id).unwrap().is_none());
    }

    #[test]
    fn test_folders_in_parent() {
        let db = make_db();
        let folders = vec![
            Folder {
                id: "f1".to_string(),
                parent_id: "root".to_string(),
                title: "Folder 1".to_string(),
                payload: serde_json::json!({}),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            },
            Folder {
                id: "f2".to_string(),
                parent_id: "root".to_string(),
                title: "Folder 2".to_string(),
                payload: serde_json::json!({}),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            },
            Folder {
                id: "f3".to_string(),
                parent_id: "f1".to_string(),
                title: "Subfolder".to_string(),
                payload: serde_json::json!({}),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            },
            // Deleted folder
            Folder {
                id: "f4".to_string(),
                parent_id: "root".to_string(),
                title: "Deleted Folder".to_string(),
                payload: serde_json::json!({}),
                is_bookmarked: 0,
                is_archived: 0,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: true,
                sync_status: SYNC_STATUS_SYNCED,
            },
            // Archived folder
            Folder {
                id: "f5".to_string(),
                parent_id: "root".to_string(),
                title: "Archived Folder".to_string(),
                payload: serde_json::json!({}),
                is_bookmarked: 0,
                is_archived: 1,
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            },
        ];
        db.put_folders(&folders).unwrap();

        let root_folders = db.get_folders_in_parent("root").unwrap();
        assert_eq!(root_folders.len(), 2);

        let sub_folders = db.get_folders_in_parent("f1").unwrap();
        assert_eq!(sub_folders.len(), 1);

        // Archive folder query
        let archived = db.get_folders_in_parent(ARCHIVE_FOLDER_ID).unwrap();
        assert_eq!(archived.len(), 1);
        assert_eq!(archived[0].title, "Archived Folder");
    }

    #[test]
    fn test_folder_mark_synced() {
        let db = make_db();
        let folder_field = FolderField {
            parent_id: "root".to_string(),
            title: "Test".to_string(),
            payload: serde_json::json!({}),
            is_bookmarked: 0,
            is_archived: 0,
        };
        let id = db.add_folder(&folder_field).unwrap();
        let folder = db.get_folder(&id).unwrap().unwrap();
        assert_eq!(folder.sync_status, SYNC_STATUS_PENDING);

        db.mark_folder_synced(&id, folder.updated_at).unwrap();
        let folder = db.get_folder(&id).unwrap().unwrap();
        assert_eq!(folder.sync_status, SYNC_STATUS_SYNCED);
    }

    #[test]
    fn test_folder_search_trim_and_empty() {
        let db = make_db();
        let folder = Folder {
            id: "folder-cn".to_string(),
            parent_id: "root".to_string(),
            title: "你好文件夹".to_string(),
            payload: serde_json::json!({}),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_folder(&folder).unwrap();

        assert!(db.search_folder("").unwrap().is_empty());
        assert!(db.search_folder("   ").unwrap().is_empty());
        assert_eq!(
            db.search_folder("  你好  ").unwrap(),
            vec!["folder-cn".to_string()]
        );
    }

    // --- Tiptap tests ---

    #[test]
    fn test_tiptap_add_and_get() {
        let db = make_db();
        let tiptap_field = TiptapV2Field {
            content: serde_json::json!({"type": "doc", "content": []}),
            history: vec![HistoryEntry {
                time: 1000,
                content: serde_json::json!({"type": "doc", "content": [{"type": "paragraph"}]}),
            }],
        };

        let id = db.add_tiptap(&tiptap_field).unwrap();
        let tiptap = db.get_tiptap(&id).unwrap().unwrap();
        assert_eq!(tiptap.content["type"], "doc");
        assert_eq!(tiptap.history.len(), 1);
        assert_eq!(tiptap.sync_status, SYNC_STATUS_PENDING);
    }

    #[test]
    fn test_content_search_trim_and_empty() {
        let db = make_db();
        let card = Card {
            id: "content-cn".to_string(),
            folder_id: "folder-1".to_string(),
            title: "标题".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "这是中文内容".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_card(&card).unwrap();

        assert!(db.search_content("").unwrap().is_empty());
        assert!(db.search_content("   ").unwrap().is_empty());
        assert_eq!(
            db.search_content("  中文  ").unwrap(),
            vec!["content-cn".to_string()]
        );
    }

    #[test]
    fn test_search_index_update_triggers_reinsert_rows() {
        let db = make_db();

        let card = Card {
            id: "reindex-card".to_string(),
            folder_id: "folder-1".to_string(),
            title: "旧标题".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "旧内容".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_card(&card).unwrap();

        let folder = Folder {
            id: "reindex-folder".to_string(),
            parent_id: "root".to_string(),
            title: "旧目录".to_string(),
            payload: serde_json::json!({}),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_folder(&folder).unwrap();

        {
            let conn = db.conn().unwrap();
            conn.execute(
                "DELETE FROM cards_title_search WHERE id = ?1",
                params!["reindex-card"],
            )
            .unwrap();
            conn.execute(
                "DELETE FROM cards_raw_text_search WHERE id = ?1",
                params!["reindex-card"],
            )
            .unwrap();
            conn.execute(
                "DELETE FROM folders_title_search WHERE id = ?1",
                params!["reindex-folder"],
            )
            .unwrap();
        }

        db.update_card(
            "reindex-card",
            &serde_json::json!({"title": "新标题", "rawText": "新内容"}),
        )
        .unwrap();
        db.update_folder("reindex-folder", &serde_json::json!({"title": "新目录"}))
            .unwrap();

        assert_eq!(
            db.search_card("新标题").unwrap(),
            vec!["reindex-card".to_string()]
        );
        assert_eq!(
            db.search_content("新内容").unwrap(),
            vec!["reindex-card".to_string()]
        );
        assert_eq!(
            db.search_folder("新目录").unwrap(),
            vec!["reindex-folder".to_string()]
        );
    }

    #[test]
    fn test_tiptap_get_nonexistent() {
        let db = make_db();
        assert!(db.get_tiptap("nonexistent").unwrap().is_none());
    }

    #[test]
    fn test_tiptap_put() {
        let db = make_db();
        let tiptap = TiptapV2 {
            id: "tiptap-1".to_string(),
            content: serde_json::json!({"type": "doc"}),
            history: vec![],
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_tiptap(&tiptap).unwrap();

        let fetched = db.get_tiptap("tiptap-1").unwrap().unwrap();
        assert_eq!(fetched.sync_status, SYNC_STATUS_SYNCED);
    }

    #[test]
    fn test_tiptap_bulk_put() {
        let db = make_db();
        let tiptaps: Vec<TiptapV2> = (0..3)
            .map(|i| TiptapV2 {
                id: format!("tiptap-{}", i),
                content: serde_json::json!({"type": "doc", "idx": i}),
                history: vec![],
                created_at: 1000,
                updated_at: 1000,
                is_deleted: false,
                sync_status: SYNC_STATUS_SYNCED,
            })
            .collect();

        db.put_tiptaps(&tiptaps).unwrap();

        for i in 0..3 {
            let tiptap = db.get_tiptap(&format!("tiptap-{}", i)).unwrap().unwrap();
            assert_eq!(tiptap.content["idx"], i);
        }
    }

    #[test]
    fn test_tiptap_sync() {
        let db = make_db();
        let tiptap = TiptapV2 {
            id: "t1".to_string(),
            content: serde_json::json!({"type": "doc"}),
            history: vec![],
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_tiptap(&tiptap).unwrap();

        db.sync_tiptap("t1", &serde_json::json!({"type": "doc", "updated": true}))
            .unwrap();

        let fetched = db.get_tiptap("t1").unwrap().unwrap();
        assert_eq!(fetched.content["updated"], true);
        assert_eq!(fetched.sync_status, SYNC_STATUS_PENDING);
        assert!(fetched.updated_at > 1000);
    }

    #[test]
    fn test_tiptap_soft_delete() {
        let db = make_db();
        let tiptap_field = TiptapV2Field {
            content: serde_json::json!({"type": "doc"}),
            history: vec![],
        };
        let id = db.add_tiptap(&tiptap_field).unwrap();

        db.soft_delete_tiptap(&id).unwrap();
        let tiptap = db.get_tiptap(&id).unwrap().unwrap();
        assert!(tiptap.is_deleted);
    }

    #[test]
    fn test_tiptap_hard_delete() {
        let db = make_db();
        let tiptap_field = TiptapV2Field {
            content: serde_json::json!({"type": "doc"}),
            history: vec![],
        };
        let id = db.add_tiptap(&tiptap_field).unwrap();

        db.delete_tiptap(&id).unwrap();
        assert!(db.get_tiptap(&id).unwrap().is_none());
    }

    #[test]
    fn test_tiptap_mark_synced() {
        let db = make_db();
        let tiptap_field = TiptapV2Field {
            content: serde_json::json!({"type": "doc"}),
            history: vec![],
        };
        let id = db.add_tiptap(&tiptap_field).unwrap();
        let tiptap = db.get_tiptap(&id).unwrap().unwrap();

        db.mark_tiptap_synced(&id, tiptap.updated_at).unwrap();
        let tiptap = db.get_tiptap(&id).unwrap().unwrap();
        assert_eq!(tiptap.sync_status, SYNC_STATUS_SYNCED);
    }

    #[test]
    fn test_tiptap_history_operations() {
        let db = make_db();
        let history = vec![
            HistoryEntry {
                time: 1000,
                content: serde_json::json!({"version": 1}),
            },
            HistoryEntry {
                time: 2000,
                content: serde_json::json!({"version": 2}),
            },
            HistoryEntry {
                time: 3000,
                content: serde_json::json!({"version": 3}),
            },
        ];
        let tiptap = TiptapV2 {
            id: "t-hist".to_string(),
            content: serde_json::json!({"version": 4}),
            history,
            created_at: 1000,
            updated_at: 4000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_tiptap(&tiptap).unwrap();

        // List history
        let timestamps = db.list_tiptap_history("t-hist").unwrap();
        assert_eq!(timestamps, vec![1000, 2000, 3000]);

        // Get specific history
        let content = db.get_tiptap_history("t-hist", 2000).unwrap();
        assert_eq!(content["version"], 2);

        // Get nonexistent history timestamp
        assert!(db.get_tiptap_history("t-hist", 9999).is_err());

        // Restore history
        db.restore_tiptap_history("t-hist", 1000).unwrap();
        let fetched = db.get_tiptap("t-hist").unwrap().unwrap();
        assert_eq!(fetched.content["version"], 1);
        assert_eq!(fetched.sync_status, SYNC_STATUS_PENDING);
    }

    #[test]
    fn test_tiptap_history_nonexistent() {
        let db = make_db();
        let timestamps = db.list_tiptap_history("nonexistent").unwrap();
        assert!(timestamps.is_empty());
    }

    // --- Sync tests ---

    #[test]
    fn test_pending_changes() {
        let db = make_db();

        // Add some pending items
        let card_field = CardField {
            folder_id: "f1".to_string(),
            title: "Pending Card".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "text".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
        };
        db.add_card(&card_field).unwrap();

        let folder_field = FolderField {
            parent_id: "root".to_string(),
            title: "Pending Folder".to_string(),
            payload: serde_json::json!({}),
            is_bookmarked: 0,
            is_archived: 0,
        };
        db.add_folder(&folder_field).unwrap();

        // Add a synced card (should not appear)
        let synced_card = Card {
            id: "synced-card".to_string(),
            folder_id: "f1".to_string(),
            title: "Synced".to_string(),
            draft: "d2".to_string(),
            payload: serde_json::json!({}),
            raw_text: "text".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_card(&synced_card).unwrap();

        let pending = db.get_pending_changes().unwrap();
        assert_eq!(pending.cards.len(), 1);
        assert_eq!(pending.folders.len(), 1);
        assert_eq!(pending.tiptaps.len(), 0);
    }

    #[test]
    fn test_local_data_for_sync() {
        let db = make_db();

        let card = Card {
            id: "c1".to_string(),
            folder_id: "f1".to_string(),
            title: "Card 1".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "text".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_card(&card).unwrap();

        let folder = Folder {
            id: "f1".to_string(),
            parent_id: "root".to_string(),
            title: "Folder 1".to_string(),
            payload: serde_json::json!({}),
            is_bookmarked: 0,
            is_archived: 0,
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_folder(&folder).unwrap();

        let data = db.get_local_data_for_sync().unwrap();
        assert_eq!(data.cards.len(), 1);
        assert_eq!(data.folders.len(), 1);
        assert_eq!(data.tiptaps.len(), 0);
    }

    // --- SyncMeta tests ---

    #[test]
    fn test_sync_meta() {
        let db = make_db();

        assert!(db.get_sync_meta("testKey").unwrap().is_none());

        db.set_sync_meta("testKey", &serde_json::json!(42))
            .unwrap();
        let meta = db.get_sync_meta("testKey").unwrap().unwrap();
        assert_eq!(meta.value, serde_json::json!(42));

        // Overwrite
        db.set_sync_meta("testKey", &serde_json::json!("hello"))
            .unwrap();
        let meta = db.get_sync_meta("testKey").unwrap().unwrap();
        assert_eq!(meta.value, serde_json::json!("hello"));
    }

    #[test]
    fn test_last_server_version() {
        let db = make_db();

        assert_eq!(db.get_last_server_version().unwrap(), 0);

        db.set_sync_meta("lastServerVersion", &serde_json::json!(42))
            .unwrap();
        assert_eq!(db.get_last_server_version().unwrap(), 42);
    }

    // --- Clear all data test ---

    #[test]
    fn test_clear_all_data() {
        let db = make_db();

        // Add some data
        let card_field = CardField {
            folder_id: "f1".to_string(),
            title: "Card".to_string(),
            draft: "d1".to_string(),
            payload: serde_json::json!({}),
            raw_text: "text".to_string(),
            is_bookmarked: 0,
            is_archived: 0,
        };
        db.add_card(&card_field).unwrap();

        let folder_field = FolderField {
            parent_id: "root".to_string(),
            title: "Folder".to_string(),
            payload: serde_json::json!({}),
            is_bookmarked: 0,
            is_archived: 0,
        };
        db.add_folder(&folder_field).unwrap();

        let tiptap_field = TiptapV2Field {
            content: serde_json::json!({"type": "doc"}),
            history: vec![],
        };
        db.add_tiptap(&tiptap_field).unwrap();

        db.set_sync_meta("version", &serde_json::json!(1)).unwrap();

        let user = User {
            key: USER_KEY.to_string(),
            username: "test".to_string(),
            email: "test@test.com".to_string(),
            avatar: "".to_string(),
            language: "en-US".to_string(),
            updated_at: 1000,
            sync_status: SYNC_STATUS_SYNCED,
        };
        db.put_user(&user).unwrap();

        // Clear everything
        db.clear_all_data().unwrap();

        assert!(db.get_user().unwrap().is_none());
        let data = db.get_local_data_for_sync().unwrap();
        assert!(data.cards.is_empty());
        assert!(data.folders.is_empty());
        assert!(data.tiptaps.is_empty());
        assert!(db.get_sync_meta("version").unwrap().is_none());
    }

    // --- camel_to_snake test ---

    #[test]
    fn test_camel_to_snake() {
        assert_eq!(camel_to_snake("folderId"), "folder_id");
        assert_eq!(camel_to_snake("isBookmarked"), "is_bookmarked");
        assert_eq!(camel_to_snake("title"), "title");
        assert_eq!(camel_to_snake("rawText"), "raw_text");
    }
}
