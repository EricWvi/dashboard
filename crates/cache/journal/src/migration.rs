use only_cache_sqlite::{DatabaseError, Migration, MigrationCatalog};

const V0001_UP: &str = r#"
CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    draft TEXT NOT NULL DEFAULT '',
    payload TEXT NOT NULL DEFAULT '{}',
    word_count INTEGER NOT NULL DEFAULT 0,
    raw_text TEXT NOT NULL DEFAULT '',
    bookmark INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    sync_status INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON entries(sync_status);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    id UNINDEXED,
    raw_text,
    tokenize='trigram'
);

CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
    INSERT OR REPLACE INTO entries_fts(id, raw_text) VALUES (new.id, new.raw_text);
END;
CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE OF raw_text ON entries BEGIN
    INSERT OR REPLACE INTO entries_fts(id, raw_text) VALUES (new.id, new.raw_text);
END;
CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
    DELETE FROM entries_fts WHERE id = old.id;
END;

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    sync_status INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tags_sync_status ON tags(sync_status);

CREATE TABLE IF NOT EXISTS tiptaps (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '{}',
    history TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    sync_status INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tiptaps_sync_status ON tiptaps(sync_status);

CREATE TABLE IF NOT EXISTS user (
    key TEXT PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    sync_status INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
);
"#;

const V0001_DOWN: &str = r#"
DROP TRIGGER IF EXISTS entries_ad;
DROP TRIGGER IF EXISTS entries_au;
DROP TRIGGER IF EXISTS entries_ai;
DROP TABLE IF EXISTS entries_fts;
DROP TABLE IF EXISTS sync_meta;
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS tiptaps;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS entries;
"#;

/// Builds the journal migration catalog with all schema versions.
pub fn journal_catalog() -> Result<MigrationCatalog, DatabaseError> {
    MigrationCatalog::new(vec![Migration::new("0001", &[V0001_UP], &[V0001_DOWN])])
}
