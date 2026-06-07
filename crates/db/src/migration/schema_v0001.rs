use super::Migration;

/// v0.1.0 — creates the initial d_media table for tracking uploaded media files.
/// Timestamps use TIMESTAMP WITH TIME ZONE because this table predates the BIGINT epoch convention
/// used by the v2 tables.
pub fn migration() -> Migration {
    Migration::new("v0.1.0", UP_STATEMENTS, DOWN_STATEMENTS)
}

static UP_STATEMENTS: &[&str] = &[r#"
CREATE TABLE public.d_media (
    id                 SERIAL PRIMARY KEY,
    creator_id         integer NOT NULL,
    link               uuid    DEFAULT gen_random_uuid(),
    key                VARCHAR(1024) NOT NULL UNIQUE,
    presigned_url      VARCHAR(2048) DEFAULT NULL,
    last_presigned_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at         TIMESTAMP WITH TIME ZONE DEFAULT NULL
);
"#];

static DOWN_STATEMENTS: &[&str] = &["DROP TABLE IF EXISTS public.d_media CASCADE;"];
