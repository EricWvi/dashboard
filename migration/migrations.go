package migration

import (
	"gorm.io/gorm"
)

// GetAllMigrations returns all defined migrations in order
func GetAllMigrations() []MigrationStep {
	return []MigrationStep{
		{
			Version: "v0.1.0",
			Name:    "Create user+media+migration",
			Up:      InitTables,
			Down:    DropInitTables,
		},
		{
			Version: "v2.7.0",
			Name:    "Add card and folder table",
			Up:      AddCardFolderTables,
			Down:    RemoveCardFolderTables,
		},
		{
			Version: "v2.8.0",
			Name:    "Add userv2 table",
			Up:      AddUserV2Table,
			Down:    RemoveUserV2Table,
		},
		{
			Version: "v2.10.0",
			Name:    "Migrate to local-first v2 models",
			Up:      MigrateToLocalFirstV2Models,
			Down:    RollbackToLocalFirstV2Models,
		},
	}
}

// ------------------- v2.10.0 -------------------
func MigrateToLocalFirstV2Models(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_blog_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			title varchar(1024) NOT NULL,
			visibility varchar(10) DEFAULT 'Private'::character varying(10) NOT NULL,
			draft UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
			payload jsonb DEFAULT '{}'::jsonb NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_blog_v2_creator_server_version ON public.d_blog_v2 USING btree (creator_id, server_version);
		CREATE TRIGGER trg_blog_v2_version
		BEFORE INSERT OR UPDATE ON public.d_blog_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();


		CREATE TABLE public.d_bookmark_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			url varchar(1024) NOT NULL,
			title varchar(1024) NOT NULL,
			click int4 DEFAULT 0 NOT NULL,
			"domain" varchar(64) NOT NULL,
			payload jsonb DEFAULT '{}'::jsonb NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_bookmark_v2_creator_server_version ON public.d_bookmark_v2 USING btree (creator_id, server_version);
		CREATE TRIGGER trg_bookmark_v2_version
		BEFORE INSERT OR UPDATE ON public.d_bookmark_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();


		CREATE TABLE public.d_collection_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			"name" varchar(255) NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_collection_v2_creator_server_version ON public.d_collection_v2 USING btree (creator_id, server_version);
		CREATE TRIGGER trg_collection_v2_version
		BEFORE INSERT OR UPDATE ON public.d_collection_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();


		CREATE TABLE public.d_echo_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			e_type varchar(64) NOT NULL,
			"year" int4 NOT NULL,
			sub int4 NOT NULL,
			draft UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
			mark bool DEFAULT false NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_echo_v2_creator_server_version ON public.d_echo_v2 USING btree (creator_id, server_version);
		CREATE TRIGGER trg_echo_v2_version
		BEFORE INSERT OR UPDATE ON public.d_echo_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();

		
		CREATE TABLE public.d_entry_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			draft UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
			payload jsonb DEFAULT '{}'::jsonb NOT NULL,
			word_count int4 DEFAULT 0 NOT NULL,
			raw_text text DEFAULT ''::text NOT NULL,
			bookmark bool DEFAULT false NOT NULL,
			review_count int4 DEFAULT 0 NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_entry_v2_creator_created_at ON public.d_entry_v2 USING btree (creator_id, created_at DESC);
		CREATE INDEX idx_entry_v2_payload_tags ON public.d_entry_v2 USING gin (((payload -> 'tags'::text)));
		CREATE INDEX idx_entry_v2_raw_text_trgm ON public.d_entry_v2 USING gin (raw_text gin_trgm_ops);
		CREATE INDEX idx_entry_v2_creator_server_version ON public.d_entry_v2 USING btree (creator_id, server_version);
		CREATE TRIGGER trg_entry_v2_version
		BEFORE INSERT OR UPDATE ON public.d_entry_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();


		CREATE TABLE public.d_quick_note_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			title varchar(1024) NOT NULL,
			draft UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
			d_order int4 DEFAULT '-1'::integer NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_quick_note_v2_creator_server_version ON public.d_quick_note_v2 USING btree (creator_id, server_version);
		CREATE TRIGGER trg_quick_note_v2_version
		BEFORE INSERT OR UPDATE ON public.d_quick_note_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();


		CREATE TABLE public.d_tag_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			"name" varchar(255) NOT NULL,
			t_group varchar(63) DEFAULT 'dashboard'::character varying NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_tag_v2_creator_server_version ON public.d_tag_v2 USING btree (creator_id, server_version);
		CREATE TRIGGER trg_tag_v2_version
		BEFORE INSERT OR UPDATE ON public.d_tag_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();


		CREATE TABLE public.d_todo_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			title varchar(1024) NOT NULL,
			completed bool DEFAULT false NULL,
			collection_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
			difficulty int4 DEFAULT '-1'::integer NULL,
			d_order int4 DEFAULT 1 NULL,
			link varchar(1024) DEFAULT NULL::character varying NULL,
			draft UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
			schedule BIGINT NULL,
			done bool DEFAULT false NULL,
			d_count int4 DEFAULT 0 NULL,
			kanban UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_todo_v2_creator_server_version ON public.d_todo_v2 USING btree (creator_id, server_version);
		CREATE TRIGGER trg_todo_v2_version
		BEFORE INSERT OR UPDATE ON public.d_todo_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();


		CREATE TABLE public.d_watch_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			w_type varchar(64) NOT NULL,
			title varchar(1024) NOT NULL,
			status varchar(64) DEFAULT 'To Watch'::character varying NOT NULL,
			"year" int4 DEFAULT 2099 NULL,
			rate int4 DEFAULT 0 NULL,
			payload jsonb DEFAULT '{}'::jsonb NOT NULL,
			author varchar(256) DEFAULT ''::character varying NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_watch_v2_creator_server_version ON public.d_watch_v2 USING btree (creator_id, server_version);
		CREATE TRIGGER trg_watch_v2_version
		BEFORE INSERT OR UPDATE ON public.d_watch_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
	`).Error
}

func RollbackToLocalFirstV2Models(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_blog_v2 CASCADE;
		DROP TABLE IF EXISTS public.d_bookmark_v2 CASCADE;
		DROP TABLE IF EXISTS public.d_collection_v2 CASCADE;
		DROP TABLE IF EXISTS public.d_echo_v2 CASCADE;
		DROP TABLE IF EXISTS public.d_entry_v2 CASCADE;
		DROP TABLE IF EXISTS public.d_quick_note_v2 CASCADE;
		DROP TABLE IF EXISTS public.d_tag_v2 CASCADE;
		DROP TABLE IF EXISTS public.d_todo_v2 CASCADE;
		DROP TABLE IF EXISTS public.d_watch_v2 CASCADE;
	`).Error
}

// ------------------- v2.8.0 -------------------
func AddUserV2Table(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_user_v2 (
			id serial4 PRIMARY KEY,
			email varchar(100) NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			avatar varchar(1024) DEFAULT ''::character varying NOT NULL,
			username varchar(255) DEFAULT ''::character varying NOT NULL,
			rss_token varchar(255) DEFAULT ''::character varying NOT NULL,
			email_token varchar(255) DEFAULT ''::character varying NOT NULL,
			email_feed varchar(255) DEFAULT ''::character varying NOT NULL,
			"language" varchar(10) DEFAULT 'zh-CN'::character varying NOT NULL,
			CONSTRAINT d_user_v2_email_key UNIQUE (email)
		);
		CREATE TRIGGER trg_user_v2_version
		BEFORE INSERT OR UPDATE ON public.d_user_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
	`).Error
}

func RemoveUserV2Table(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_user_v2 CASCADE;
	`).Error
}

// ------------------- v2.7.0 -------------------
func AddCardFolderTables(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_card (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			folder_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
			title varchar(1024) NOT NULL,
			draft UUID NOT NULL,
			payload jsonb DEFAULT '{}'::jsonb NOT NULL,
			raw_text text DEFAULT ''::text NOT NULL,
			is_bookmarked SMALLINT DEFAULT 0,
			is_archived SMALLINT DEFAULT 0,
			review_count int4 DEFAULT 0 NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_card_creator_server_version ON public.d_card USING btree (creator_id, server_version);
		CREATE INDEX idx_card_raw_text_trgm ON public.d_card USING gin (raw_text gin_trgm_ops);
		CREATE INDEX idx_card_title_trgm ON public.d_card USING gin (title gin_trgm_ops);

		CREATE TABLE public.d_folder (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			parent_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
			title varchar(1024) NOT NULL,
			payload jsonb DEFAULT '{}'::jsonb NOT NULL,
			is_bookmarked SMALLINT DEFAULT 0,
			is_archived SMALLINT DEFAULT 0,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_folder_creator_server_version ON public.d_folder USING btree (creator_id, server_version);
		CREATE INDEX idx_folder_title_trgm ON public.d_folder USING gin (title gin_trgm_ops);

		CREATE TABLE public.d_tiptap_v2 (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			site SMALLINT NOT NULL,
			"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
			history jsonb DEFAULT '[]'::jsonb NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_tiptap_creator_server_version ON public.d_tiptap_v2 USING btree (creator_id, server_version);

		CREATE SEQUENCE global_sync_version_seq;

		-- Create a function that resets the version on update
		CREATE OR REPLACE FUNCTION global_bump_server_version()
		RETURNS TRIGGER AS $$
		BEGIN
			-- All tables pull from the same global counter
			NEW.server_version = nextval('global_sync_version_seq');
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;

		-- Attach the trigger to the table
		CREATE TRIGGER trg_card_version
		BEFORE INSERT OR UPDATE ON public.d_card
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();

		CREATE TRIGGER trg_folder_version
		BEFORE INSERT OR UPDATE ON public.d_folder
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();

		CREATE TRIGGER trg_tiptap_version
		BEFORE INSERT OR UPDATE ON public.d_tiptap_v2
		FOR EACH ROW EXECUTE FUNCTION global_bump_server_version();
	`).Error
}

func RemoveCardFolderTables(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_card CASCADE;
		DROP TABLE IF EXISTS public.d_folder CASCADE;
		DROP TABLE IF EXISTS public.d_tiptap_v2 CASCADE;
		DROP FUNCTION IF EXISTS global_bump_server_version;
		DROP SEQUENCE IF EXISTS global_sync_version_seq;
	`).Error
}

// ------------------- v0.1.0 -------------------
func InitTables(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_media (
			id SERIAL PRIMARY KEY,
			creator_id integer NOT NULL,
			link uuid DEFAULT gen_random_uuid(),
			key VARCHAR(1024) NOT NULL UNIQUE,
			presigned_url VARCHAR(2048) DEFAULT NULL,
			last_presigned_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);
	`).Error
}

func DropInitTables(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_media CASCADE;
	`).Error
}
