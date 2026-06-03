use super::Migration;

/// v2.10.0 — creates the full set of local-first v2 sync tables (blog, bookmark, collection,
/// echo, entry, quick_note, tag, todo, watch). Each table uses the global server-version trigger
/// established in v2.7.0 so all sync counters remain globally ordered.
pub fn migration() -> Migration {
    Migration::new("v2.10.0", UP_STATEMENTS, DOWN_STATEMENTS)
}

static UP_STATEMENTS: &[&str] = &[
    r#"
CREATE TABLE public.d_blog_v2 (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    title        varchar(1024) NOT NULL,
    visibility   varchar(10) DEFAULT 'Private'::character varying(10) NOT NULL,
    draft        UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    payload      jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_blog_v2_creator_server_version ON public.d_blog_v2 USING btree (creator_id, server_version);
CREATE TRIGGER trg_blog_v2_version
BEFORE INSERT OR UPDATE ON public.d_blog_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
    r#"
CREATE TABLE public.d_bookmark_v2 (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    url          varchar(1024) NOT NULL,
    title        varchar(1024) NOT NULL,
    click        int4 DEFAULT 0 NOT NULL,
    "domain"     varchar(64) NOT NULL,
    payload      jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_bookmark_v2_creator_server_version ON public.d_bookmark_v2 USING btree (creator_id, server_version);
CREATE TRIGGER trg_bookmark_v2_version
BEFORE INSERT OR UPDATE ON public.d_bookmark_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
    r#"
CREATE TABLE public.d_collection_v2 (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    "name"       varchar(255) NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_collection_v2_creator_server_version ON public.d_collection_v2 USING btree (creator_id, server_version);
CREATE TRIGGER trg_collection_v2_version
BEFORE INSERT OR UPDATE ON public.d_collection_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
    r#"
CREATE TABLE public.d_echo_v2 (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    e_type       varchar(64) NOT NULL,
    "year"       int4 NOT NULL,
    sub          int4 NOT NULL,
    draft        UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    mark         bool DEFAULT false NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_echo_v2_creator_server_version ON public.d_echo_v2 USING btree (creator_id, server_version);
CREATE TRIGGER trg_echo_v2_version
BEFORE INSERT OR UPDATE ON public.d_echo_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
    r#"
CREATE TABLE public.d_entry_v2 (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    draft        UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    payload      jsonb DEFAULT '{}'::jsonb NOT NULL,
    word_count   int4 DEFAULT 0 NOT NULL,
    raw_text     text DEFAULT ''::text NOT NULL,
    bookmark     bool DEFAULT false NOT NULL,
    review_count int4 DEFAULT 0 NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_entry_v2_creator_created_at ON public.d_entry_v2 USING btree (creator_id, created_at DESC);
CREATE INDEX idx_entry_v2_payload_tags ON public.d_entry_v2 USING gin (((payload -> 'tags'::text)));
CREATE INDEX idx_entry_v2_raw_text_trgm ON public.d_entry_v2 USING gin (raw_text gin_trgm_ops);
CREATE INDEX idx_entry_v2_creator_server_version ON public.d_entry_v2 USING btree (creator_id, server_version);
CREATE TRIGGER trg_entry_v2_version
BEFORE INSERT OR UPDATE ON public.d_entry_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
    r#"
CREATE TABLE public.d_quick_note_v2 (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    title        varchar(1024) NOT NULL,
    draft        UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    d_order      int4 DEFAULT '-1'::integer NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_quick_note_v2_creator_server_version ON public.d_quick_note_v2 USING btree (creator_id, server_version);
CREATE TRIGGER trg_quick_note_v2_version
BEFORE INSERT OR UPDATE ON public.d_quick_note_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
    r#"
CREATE TABLE public.d_tag_v2 (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    "name"       varchar(255) NOT NULL,
    t_group      varchar(63) DEFAULT 'dashboard'::character varying NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_tag_v2_creator_server_version ON public.d_tag_v2 USING btree (creator_id, server_version);
CREATE TRIGGER trg_tag_v2_version
BEFORE INSERT OR UPDATE ON public.d_tag_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
    r#"
CREATE TABLE public.d_todo_v2 (
    id            UUID PRIMARY KEY,
    creator_id    int4 NOT NULL,
    title         varchar(1024) NOT NULL,
    completed     bool DEFAULT false NULL,
    collection_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    difficulty    int4 DEFAULT '-1'::integer NULL,
    d_order       int4 DEFAULT 1 NULL,
    link          varchar(1024) DEFAULT NULL::character varying NULL,
    draft         UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    schedule      BIGINT NULL,
    done          bool DEFAULT false NULL,
    d_count       int4 DEFAULT 0 NULL,
    kanban        UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    created_at    BIGINT NOT NULL,
    updated_at    BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted    BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_todo_v2_creator_server_version ON public.d_todo_v2 USING btree (creator_id, server_version);
CREATE TRIGGER trg_todo_v2_version
BEFORE INSERT OR UPDATE ON public.d_todo_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
    r#"
CREATE TABLE public.d_watch_v2 (
    id           UUID PRIMARY KEY,
    creator_id   int4 NOT NULL,
    w_type       varchar(64) NOT NULL,
    title        varchar(1024) NOT NULL,
    status       varchar(64) DEFAULT 'To Watch'::character varying NOT NULL,
    "year"       int4 DEFAULT 2099 NULL,
    rate         int4 DEFAULT 0 NULL,
    payload      jsonb DEFAULT '{}'::jsonb NOT NULL,
    author       varchar(256) DEFAULT ''::character varying NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    is_deleted   BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_watch_v2_creator_server_version ON public.d_watch_v2 USING btree (creator_id, server_version);
CREATE TRIGGER trg_watch_v2_version
BEFORE INSERT OR UPDATE ON public.d_watch_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#,
];

static DOWN_STATEMENTS: &[&str] = &[r#"
DROP TABLE IF EXISTS public.d_blog_v2 CASCADE;
DROP TABLE IF EXISTS public.d_bookmark_v2 CASCADE;
DROP TABLE IF EXISTS public.d_collection_v2 CASCADE;
DROP TABLE IF EXISTS public.d_echo_v2 CASCADE;
DROP TABLE IF EXISTS public.d_entry_v2 CASCADE;
DROP TABLE IF EXISTS public.d_quick_note_v2 CASCADE;
DROP TABLE IF EXISTS public.d_tag_v2 CASCADE;
DROP TABLE IF EXISTS public.d_todo_v2 CASCADE;
DROP TABLE IF EXISTS public.d_watch_v2 CASCADE;
"#];
