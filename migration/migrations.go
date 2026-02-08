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
			Version: "v0.2.0",
			Name:    "Create todo+tag+collection table",
			Up:      CreateTodoTagCollectionTable,
			Down:    DropTodoTagCollectionTable,
		},
		{
			Version: "v0.3.0",
			Name:    "Add link+draft column",
			Up:      AddLinkDraftColumns,
			Down:    RemoveLinkDraftColumns,
		},
		{
			Version: "v0.4.0",
			Name:    "Add schedule column",
			Up:      AddScheduleColumn,
			Down:    RemoveScheduleColumn,
		},
		{
			Version: "v0.5.0",
			Name:    "Add tiptap table",
			Up:      AddTiptapTable,
			Down:    RemoveTiptapTable,
		},
		{
			Version: "v0.6.0",
			Name:    "modify default value of difficulty in d_todo table",
			Up:      AlterDifficultyDefault,
			Down:    DropDifficultyDefault,
		},
		{
			Version: "v0.7.0",
			Name:    "Add done+count column",
			Up:      AddDoneCountColumns,
			Down:    RemoveDoneCountColumns,
		},
		{
			Version: "v0.8.0",
			Name:    "Add kanban column",
			Up:      AddKanbanColumn,
			Down:    RemoveKanbanColumn,
		},
		{
			Version: "v0.9.0",
			Name:    "Add watch table",
			Up:      AddWatchTable,
			Down:    RemoveWatchTable,
		},
		{
			Version: "v0.10.0",
			Name:    "Add payload column",
			Up:      AddPayloadColumn,
			Down:    RemovePayloadColumn,
		},
		{
			Version: "v0.11.0",
			Name:    "Add bookmark table",
			Up:      AddBookmarkTable,
			Down:    RemoveBookmarkTable,
		},
		{
			Version: "v0.12.0",
			Name:    "Add author column to watch",
			Up:      AddAuthorColumn,
			Down:    RemoveAuthorColumn,
		},
		{
			Version: "v0.13.0",
			Name:    "Add quick note table",
			Up:      AddQuickNoteTable,
			Down:    RemoveQuickNoteTable,
		},
		{
			Version: "v0.14.0",
			Name:    "Add username+avatar columns to user",
			Up:      AddUsernameAvatar,
			Down:    RemoveUsernameAvatar,
		},
		{
			Version: "v0.15.0",
			Name:    "Add rss_token and email_token columns to user",
			Up:      AddRssEmailTokens,
			Down:    RemoveRssEmailTokens,
		},
		{
			Version: "v0.16.0",
			Name:    "Add order field to quick note",
			Up:      AddOrderFieldToQuickNote,
			Down:    RemoveOrderFieldFromQuickNote,
		},
		{
			Version: "v0.17.0",
			Name:    "Add echo table",
			Up:      AddEchoTable,
			Down:    RemoveEchoTable,
		},
		{
			Version: "v0.18.0",
			Name:    "Add blog table",
			Up:      AddBlogTable,
			Down:    RemoveBlogTable,
		},
		{
			Version: "v0.19.0",
			Name:    "Add language column to user",
			Up:      AddLanguageColumnToUser,
			Down:    RemoveLanguageColumnFromUser,
		},
		{
			Version: "v1.0.0",
			Name:    "Add unix timestamp column ts to tiptap",
			Up:      AddTimestampColumnToTiptap,
			Down:    RemoveTimestampColumnFromTiptap,
		},
		{
			Version: "v1.1.0",
			Name:    "Add history column to tiptap",
			Up:      AddHistoryColumnToTiptap,
			Down:    RemoveHistoryColumnFromTiptap,
		},
		{
			Version: "v1.2.0",
			Name:    "Add mark column to echo",
			Up:      AddMarkColumnToEcho,
			Down:    RemoveMarkColumnFromEcho,
		},
		{
			Version: "v2.0.0",
			Name:    "Add entry table",
			Up:      AddEntryTable,
			Down:    RemoveEntryTable,
		},
		{
			Version: "v2.1.0",
			Name:    "Add raw text column and trigram index to entry table",
			Up:      AddRawTextToEntryTable,
			Down:    RemoveRawTextFromEntryTable,
		},
		{
			Version: "v2.2.0",
			Name:    "Add multiple indexes for performance optimization",
			Up:      CreatePerformanceIndexes,
			Down:    DropPerformanceIndexes,
		},
		{
			Version: "v2.3.0",
			Name:    "Add bookmark column to entry table",
			Up:      AddBookmarkColumnToEntry,
			Down:    RemoveBookmarkColumnFromEntry,
		},
		{
			Version: "v2.4.0",
			Name:    "Add review count column to entry table",
			Up:      AddReviewCountColumnToEntry,
			Down:    RemoveReviewCountColumnFromEntry,
		},
		{
			Version: "v2.5.0",
			Name:    "Add group column to tag table",
			Up:      AddGroupColumnToTag,
			Down:    RemoveGroupColumnFromTag,
		},
		{
			Version: "v2.6.0",
			Name:    "Add GIN indexes on entry payload tags",
			Up:      AddEntryPayloadIndexes,
			Down:    RemoveEntryPayloadIndexes,
		},
		{
			Version: "v2.7.0",
			Name:    "Add card and folder table",
			Up:      AddCardFolderTables,
			Down:    RemoveCardFolderTables,
		},
	}
}

// ------------------- v2.7.0 -------------------
func AddCardFolderTables(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_card (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			folder_id UUID NULL,
			title varchar(1024) NOT NULL,
			draft UUID NOT NULL,
			payload jsonb DEFAULT '{}'::jsonb NOT NULL,
			raw_text text DEFAULT ''::text NOT NULL,
			review_count int4 DEFAULT 0 NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_card_creator_server_version ON public.d_card USING btree (creator_id, server_version);

		CREATE TABLE public.d_folder (
			id UUID PRIMARY KEY,
			creator_id int4 NOT NULL,
			parent_id UUID NULL,
			title varchar(1024) NOT NULL,
			payload jsonb DEFAULT '{}'::jsonb NOT NULL,
			created_at BIGINT NOT NULL,
			updated_at BIGINT NOT NULL,
			server_version BIGINT NOT NULL,
			is_deleted BOOLEAN DEFAULT FALSE
		);
		CREATE INDEX idx_folder_creator_server_version ON public.d_folder USING btree (creator_id, server_version);

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

// ------------------- v2.6.0 -------------------
func AddEntryPayloadIndexes(db *gorm.DB) error {
	return db.Exec(`
		CREATE INDEX idx_entry_payload_tags
		ON public.d_entry
		USING gin ((payload->'tags'));
	`).Error
}

func RemoveEntryPayloadIndexes(db *gorm.DB) error {
	return db.Exec(`
		DROP INDEX IF EXISTS idx_entry_payload_tags;
	`).Error
}

// ------------------- v2.5.0 -------------------
func AddGroupColumnToTag(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_tag
		ADD COLUMN t_group VARCHAR(63) DEFAULT 'dashboard' NOT NULL;
	`).Error
}

func RemoveGroupColumnFromTag(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_tag
		DROP COLUMN IF EXISTS t_group;
	`).Error
}

// ------------------- v2.4.0 -------------------
func AddReviewCountColumnToEntry(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_entry
		ADD COLUMN review_count INTEGER DEFAULT 0 NOT NULL;
	`).Error
}

func RemoveReviewCountColumnFromEntry(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_entry
		DROP COLUMN IF EXISTS review_count;
	`).Error
}

// ------------------- v2.3.0 -------------------
func AddBookmarkColumnToEntry(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_entry
		ADD COLUMN bookmark BOOLEAN DEFAULT FALSE NOT NULL;
	`).Error
}

func RemoveBookmarkColumnFromEntry(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_entry
		DROP COLUMN IF EXISTS bookmark;
	`).Error
}

// ------------------- v2.2.0 -------------------
func CreatePerformanceIndexes(db *gorm.DB) error {
	return db.Exec(`
		CREATE INDEX idx_blog_creator_created_at
    		ON public.d_blog (creator_id, created_at DESC);

		CREATE INDEX idx_bookmark_creator_created_at
    		ON public.d_bookmark (creator_id, created_at DESC);
		
		CREATE INDEX idx_todo_creator_schedule
    		ON public.d_todo (creator_id, schedule DESC);
		
		CREATE INDEX idx_todo_creator_collection
    		ON public.d_todo (creator_id, collection_id);

		CREATE INDEX idx_echo_creator_year
    		ON public.d_echo (creator_id, year);
		
		CREATE INDEX idx_echo_creator_sub
    		ON public.d_echo (creator_id, sub);
		
		CREATE INDEX idx_media_creator_link
    		ON public.d_media (creator_id, link);
		
		CREATE INDEX idx_quick_note_creator
    		ON public.d_quick_note (creator_id) WHERE deleted_at IS NULL;
	`).Error
}

func DropPerformanceIndexes(db *gorm.DB) error {
	return db.Exec(`
		DROP INDEX IF EXISTS idx_blog_creator_created_at;
		DROP INDEX IF EXISTS idx_bookmark_creator_created_at;
		DROP INDEX IF EXISTS idx_todo_creator_schedule;
		DROP INDEX IF EXISTS idx_todo_creator_collection;
		DROP INDEX IF EXISTS idx_echo_creator_year;
		DROP INDEX IF EXISTS idx_echo_creator_sub;
		DROP INDEX IF EXISTS idx_media_creator_link;
		DROP INDEX IF EXISTS idx_quick_note_creator;
	`).Error
}

// ------------------- v2.1.0 -------------------
func AddRawTextToEntryTable(db *gorm.DB) error {
	return db.Exec(`
	    CREATE EXTENSION IF NOT EXISTS pg_trgm;

		ALTER TABLE public.d_entry
		ADD COLUMN raw_text TEXT DEFAULT '' NOT NULL;

		CREATE INDEX idx_entry_raw_text_trgm
		ON public.d_entry
		USING gin (raw_text gin_trgm_ops);
	`).Error
}

func RemoveRawTextFromEntryTable(db *gorm.DB) error {
	return db.Exec(`
		DROP INDEX IF EXISTS idx_entry_raw_text_trgm;

		ALTER TABLE public.d_entry
		DROP COLUMN IF EXISTS raw_text;
	`).Error
}

// ------------------- v2.0.0 -------------------
func AddEntryTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_entry (
			id serial4 NOT NULL,
			creator_id int4 NOT NULL,
			draft INTEGER DEFAULT 0,
			visibility varchar(10) DEFAULT 'PUBLIC'::character varying(10) NOT NULL,
			payload jsonb DEFAULT '{}'::jsonb NOT NULL,
			created_at timestamptz DEFAULT now() NULL,
			updated_at timestamptz DEFAULT now() NULL,
			deleted_at timestamptz NULL,
			word_count int4 DEFAULT 0 NOT NULL,
			CONSTRAINT entry_pkey PRIMARY KEY (id)
		);

		CREATE INDEX idx_entry_creator_created_at
    		ON public.d_entry (creator_id, created_at DESC);
	`).Error
}

func RemoveEntryTable(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_entry CASCADE;
	`).Error
}

// -------------------- v1.2.0 -------------------
func AddMarkColumnToEcho(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_echo
		ADD COLUMN mark BOOLEAN DEFAULT FALSE;
	`).Error
}

func RemoveMarkColumnFromEcho(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_echo
		DROP COLUMN IF EXISTS mark;
	`).Error
}

// -------------------- v1.1.0 -------------------
func AddHistoryColumnToTiptap(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_tiptap
		ADD COLUMN history JSONB DEFAULT '[]'::jsonb NOT NULL;
	`).Error
}

func RemoveHistoryColumnFromTiptap(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_tiptap
		DROP COLUMN IF EXISTS history;
	`).Error
}

// -------------------- v1.0.0 -------------------
func AddTimestampColumnToTiptap(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_tiptap
		ADD COLUMN ts BIGINT DEFAULT 1756629730634;
	`).Error
}

func RemoveTimestampColumnFromTiptap(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_tiptap
		DROP COLUMN IF EXISTS ts;
	`).Error
}

// -------------------- v0.19.0 -------------------
func AddLanguageColumnToUser(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_user
		ADD COLUMN language VARCHAR(10) DEFAULT 'zh-CN' NOT NULL;
	`).Error
}

func RemoveLanguageColumnFromUser(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_user
		DROP COLUMN IF EXISTS language;
	`).Error
}

// -------------------- v0.18.0 -------------------
func AddBlogTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_blog (
			id SERIAL PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			title VARCHAR(1024) NOT NULL,
			visibility VARCHAR(10) DEFAULT 'Private'::VARCHAR(10) NOT NULL,
			draft INTEGER DEFAULT 0,
			payload JSONB DEFAULT '{}'::jsonb NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);
	`).Error
}

func RemoveBlogTable(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_blog CASCADE;
	`).Error
}

// -------------------- v0.17.0 -------------------
func AddEchoTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_echo (
			id SERIAL PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			e_type VARCHAR(64) NOT NULL,
			year INTEGER NOT NULL,
			sub INTEGER NOT NULL,
			draft INTEGER DEFAULT 0,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);
	`).Error
}

func RemoveEchoTable(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_echo CASCADE;
	`).Error
}

// -------------------- v0.16.0 -------------------
func AddOrderFieldToQuickNote(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_quick_note
		ADD COLUMN d_order INTEGER DEFAULT -1;
	`).Error
}

func RemoveOrderFieldFromQuickNote(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_quick_note
		DROP COLUMN IF EXISTS d_order;
	`).Error
}

// -------------------- v0.15.0 -------------------
func AddRssEmailTokens(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_user
		ADD COLUMN rss_token VARCHAR(255) DEFAULT '' NOT NULL,
		ADD COLUMN email_token VARCHAR(255) DEFAULT '' NOT NULL,
		ADD COLUMN email_feed VARCHAR(255) DEFAULT '' NOT NULL;
	`).Error
}

func RemoveRssEmailTokens(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_user
		DROP COLUMN IF EXISTS rss_token,
		DROP COLUMN IF EXISTS email_token,
		DROP COLUMN IF EXISTS email_feed;
	`).Error
}

// -------------------- v0.14.0 -------------------
func AddUsernameAvatar(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_user
		ADD COLUMN avatar VARCHAR(1024) DEFAULT '' NOT NULL,
		ADD COLUMN username VARCHAR(255) DEFAULT '' NOT NULL;
	`).Error
}

func RemoveUsernameAvatar(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_user
		DROP COLUMN IF EXISTS avatar,
		DROP COLUMN IF EXISTS username;
	`).Error
}

// -------------------- v0.13.0 -------------------
func AddQuickNoteTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_quick_note (
			id SERIAL PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			title VARCHAR(1024) NOT NULL,
			draft INTEGER DEFAULT 0,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);
	`).Error
}

func RemoveQuickNoteTable(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_quick_note CASCADE;
	`).Error
}

// -------------------- v0.12.0 -------------------
func AddAuthorColumn(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_watch
		ADD COLUMN author VARCHAR(256) DEFAULT '' NOT NULL;
	`).Error
}

func RemoveAuthorColumn(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_watch
		DROP COLUMN IF EXISTS author;
	`).Error
}

// -------------------- v0.11.0 -------------------
func AddBookmarkTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_bookmark (
			id SERIAL PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			url VARCHAR(1024) NOT NULL,
			title VARCHAR(1024) NOT NULL,
			click INTEGER DEFAULT 0 NOT NULL,
			domain VARCHAR(64) NOT NULL,
			payload JSONB DEFAULT '{}'::jsonb NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);
	`).Error
}

func RemoveBookmarkTable(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_bookmark CASCADE;
	`).Error
}

// -------------------- v0.10.0 -------------------
func AddPayloadColumn(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_watch
		ADD COLUMN payload JSONB DEFAULT '{}'::jsonb NOT NULL;
	`).Error
}

func RemovePayloadColumn(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_watch
		DROP COLUMN IF EXISTS payload;
	`).Error
}

// -------------------- v0.9.0 -------------------
func AddWatchTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_watch (
			id SERIAL PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			w_type VARCHAR(64) NOT NULL,
			title VARCHAR(1024) NOT NULL,
			status VARCHAR(64) NOT NULL DEFAULT 'To Watch',
			year INTEGER DEFAULT 2099,
			rate INTEGER DEFAULT 0,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);
	`).Error
}

func RemoveWatchTable(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_watch CASCADE;
	`).Error
}

// --------------------- v0.8.0 -------------------
func AddKanbanColumn(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		ADD COLUMN kanban INTEGER DEFAULT 0 NOT NULL;
	`).Error
}

func RemoveKanbanColumn(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		DROP COLUMN IF EXISTS kanban;
	`).Error
}

// ------------------- v0.7.0 -------------------
func AddDoneCountColumns(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		ADD COLUMN done BOOLEAN DEFAULT FALSE,
		ADD COLUMN d_count INTEGER DEFAULT 0;
	`).Error
}

func RemoveDoneCountColumns(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		DROP COLUMN IF EXISTS done,
		DROP COLUMN IF EXISTS d_count;
	`).Error
}

// ------------------- v0.6.0 -------------------
func AlterDifficultyDefault(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		ALTER COLUMN difficulty SET DEFAULT -1;
	`).Error
}

func DropDifficultyDefault(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		ALTER COLUMN difficulty SET DEFAULT 1;
	`).Error
}

// ------------------- v0.5.0 -------------------
func AddTiptapTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_tiptap (
			id SERIAL PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			content jsonb DEFAULT '{}'::jsonb NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);
	`).Error
}

func RemoveTiptapTable(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_tiptap CASCADE;
	`).Error
}

// ------------------- v0.4.0 -------------------
func AddScheduleColumn(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		ADD COLUMN schedule TIMESTAMP WITH TIME ZONE DEFAULT NULL;
	`).Error
}

func RemoveScheduleColumn(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		DROP COLUMN IF EXISTS schedule;
	`).Error
}

// ------------------- v0.3.0 -------------------
func AddLinkDraftColumns(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		ADD COLUMN link VARCHAR(1024) DEFAULT NULL,
		ADD COLUMN draft INTEGER DEFAULT 0;
	`).Error
}

func RemoveLinkDraftColumns(db *gorm.DB) error {
	return db.Exec(`
		ALTER TABLE public.d_todo
		DROP COLUMN IF EXISTS link,
		DROP COLUMN IF EXISTS draft;
	`).Error
}

// ------------------- v0.2.0 -------------------
func CreateTodoTagCollectionTable(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_todo (
			id SERIAL PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			title VARCHAR(1024) NOT NULL,
			completed BOOLEAN DEFAULT FALSE,
			collection_id INTEGER NOT NULL DEFAULT 0,
			difficulty INTEGER DEFAULT 1,
			d_order INTEGER DEFAULT 1,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);

		CREATE TABLE public.d_tag (
			id SERIAL PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			name VARCHAR(255) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);

		CREATE TABLE public.d_collection (
			id SERIAL PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			name VARCHAR(255) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);
	`).Error
}

func DropTodoTagCollectionTable(db *gorm.DB) error {
	return db.Exec(`
		DROP TABLE IF EXISTS public.d_todo CASCADE;
		DROP TABLE IF EXISTS public.d_tag CASCADE;
		DROP TABLE IF EXISTS public.d_collection CASCADE;
	`).Error
}

// ------------------- v0.1.0 -------------------
func InitTables(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE public.d_user (
			id SERIAL PRIMARY KEY,
			email VARCHAR(100) NOT NULL UNIQUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
		);

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
		DROP TABLE IF EXISTS public.d_user CASCADE;
		DROP TABLE IF EXISTS public.d_media CASCADE;
	`).Error
}
