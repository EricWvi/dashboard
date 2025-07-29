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
	}
}

// ------------------- v0.7.0 -------------------

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
