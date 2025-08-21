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
	}
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
