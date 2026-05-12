use app_sqlite::{DatabaseError, Migration, MigrationCatalog};

const UP_STATEMENTS: &[&str] = &[r#"
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

CREATE VIRTUAL TABLE IF NOT EXISTS entries_raw_text_search USING fts5(
    id UNINDEXED,
    raw_text,
    tokenize='trigram'
);

CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
INSERT OR REPLACE INTO entries_raw_text_search(id, raw_text) VALUES (new.id, new.raw_text);
END;

CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
DELETE FROM entries_raw_text_search WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE OF raw_text ON entries BEGIN
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
"#];

const DOWN_STATEMENTS: &[&str] = &[r#"
DROP TABLE IF EXISTS statistics;
DROP TABLE IF EXISTS sync_meta;
DROP TABLE IF EXISTS tiptaps;
DROP TABLE IF EXISTS tags;
DROP TRIGGER IF EXISTS entries_au;
DROP TRIGGER IF EXISTS entries_ad;
DROP TRIGGER IF EXISTS entries_ai;
DROP TABLE IF EXISTS entries_raw_text_search;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS user;
"#];

pub fn catalog() -> Result<MigrationCatalog, DatabaseError> {
    MigrationCatalog::new(vec![Migration::new("0001", UP_STATEMENTS, DOWN_STATEMENTS)])
}
