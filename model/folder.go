package model

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Folder struct {
	MetaFieldV2
	FolderField
}

type FolderField struct {
	ParentId *uuid.UUID     `gorm:"type:uuid" json:"parentId"`
	Title    string         `gorm:"type:varchar(1024);not null" json:"title"`
	Payload  datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	// CreatorId is inherited from MetaFieldV2
}

const (
	Folder_Table    = "d_folder"
	Folder_ParentId = "parent_id"
	Folder_Title    = "title"
	Folder_Payload  = "payload"
)

func (f *Folder) TableName() string {
	return Folder_Table
}

func (f *Folder) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&f)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find folder")
	}
	return nil
}

func ListFolders(db *gorm.DB, where map[string]any) ([]Folder, error) {
	folders := make([]Folder, 0)
	if err := db.Where(where).
		Find(&folders).Error; err != nil {
		return nil, err
	}
	return folders, nil
}

func ListFoldersSince(db *gorm.DB, since int64, creatorId uint) ([]Folder, error) {
	var folders []Folder
	where := WhereMap{}
	where.Eq(CreatorId, creatorId)

	whereExpr := WhereExpr{}
	whereExpr.GT("server_version", since)

	if err := db.Where(where).Where(whereExpr).Find(&folders).Error; err != nil {
		return nil, err
	}
	return folders, nil
}

func FullFolders(db *gorm.DB, creatorId uint) ([]Folder, error) {
	var folders []Folder
	where := WhereMap{}
	where.Eq(CreatorId, creatorId)
	where.Eq("is_deleted", false)

	if err := db.Where(where).Find(&folders).Error; err != nil {
		return nil, err
	}
	return folders, nil
}

func (f *Folder) Create(db *gorm.DB) error {
	return db.Create(f).Error
}

func (f *Folder) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(f).Error
}

func (f *Folder) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(f).Error
}

func (f *Folder) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(f).Where(where).Update("is_deleted", true).Error
}
