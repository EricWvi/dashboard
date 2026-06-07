use super::Migration;

/// v2.8.0 — creates d_user_v2, the normalized user profile table with RSS and email feed tokens.
pub fn migration() -> Migration {
    Migration::new("v2.8.0", UP_STATEMENTS, DOWN_STATEMENTS)
}

static UP_STATEMENTS: &[&str] = &[r#"
CREATE TABLE public.d_user_v2 (
    id           serial4 PRIMARY KEY,
    email        varchar(100) NOT NULL,
    updated_at   BIGINT NOT NULL,
    server_version BIGINT NOT NULL,
    avatar       varchar(1024) DEFAULT ''::character varying NOT NULL,
    username     varchar(255)  DEFAULT ''::character varying NOT NULL,
    rss_token    varchar(255)  DEFAULT ''::character varying NOT NULL,
    email_token  varchar(255)  DEFAULT ''::character varying NOT NULL,
    email_feed   varchar(255)  DEFAULT ''::character varying NOT NULL,
    "language"   varchar(10)   DEFAULT 'zh-CN'::character varying NOT NULL,
    CONSTRAINT d_user_v2_email_key UNIQUE (email)
);
CREATE TRIGGER trg_user_v2_version
BEFORE INSERT OR UPDATE ON public.d_user_v2
FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
"#];

static DOWN_STATEMENTS: &[&str] = &["DROP TABLE IF EXISTS public.d_user_v2 CASCADE;"];
