use super::Migration;

/// v2.7.0 — creates d_card, d_folder, d_tiptap_v2, the global server-version sequence,
/// and the trigger function that all v2 tables share for monotonically increasing server_version.
pub fn migration() -> Migration {
    Migration::new("v2.7.0", UP_STATEMENTS, DOWN_STATEMENTS)
}

static UP_STATEMENTS: &[&str] = &[
    r#"
CREATE TABLE public.d_card (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    folder_id    UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    title        varchar(1024) NOT NULL,
    draft        UUID NOT NULL,
    payload      jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_text     text DEFAULT ''::text NOT NULL,
    is_bookmarked SMALLINT DEFAULT 0,
    is_archived  SMALLINT DEFAULT 0,
    review_count int4 DEFAULT 0 NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_card_creator_server_version ON public.d_card USING btree (creator_id, server_version);
CREATE INDEX idx_card_raw_text_trgm ON public.d_card USING gin (raw_text gin_trgm_ops);
CREATE INDEX idx_card_title_trgm ON public.d_card USING gin (title gin_trgm_ops);
"#,
    r#"
CREATE TABLE public.d_folder (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    parent_id    UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    title        varchar(1024) NOT NULL,
    payload      jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_bookmarked SMALLINT DEFAULT 0,
    is_archived  SMALLINT DEFAULT 0,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_folder_creator_server_version ON public.d_folder USING btree (creator_id, server_version);
CREATE INDEX idx_folder_title_trgm ON public.d_folder USING gin (title gin_trgm_ops);
"#,
    r#"
CREATE TABLE public.d_tiptap_v2 (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    site         SMALLINT NOT NULL,
    "content"    jsonb DEFAULT '{}'::jsonb NOT NULL,
    history      jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_tiptap_creator_server_version ON public.d_tiptap_v2 USING btree (creator_id, server_version);
"#,
    r#"
CREATE SEQUENCE global_sync_version_seq;

CREATE OR REPLACE FUNCTION global_bump_server_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.server_version = nextval('global_sync_version_seq');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_card_version
BEFORE INSERT OR UPDATE ON public.d_card
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();

CREATE TRIGGER trg_folder_version
BEFORE INSERT OR UPDATE ON public.d_folder
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();

CREATE TRIGGER trg_tiptap_version
BEFORE INSERT OR UPDATE ON public.d_tiptap_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
];

static DOWN_STATEMENTS: &[&str] = &[r#"
DROP TABLE IF EXISTS public.d_card CASCADE;
DROP TABLE IF EXISTS public.d_folder CASCADE;
DROP TABLE IF EXISTS public.d_tiptap_v2 CASCADE;
DROP FUNCTION IF EXISTS global_bump_server_version;
DROP SEQUENCE IF EXISTS global_sync_version_seq;
"#];
