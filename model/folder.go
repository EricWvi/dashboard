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
	ParentId     uuid.UUID      `gorm:"type:uuid" json:"parentId"`
	Title        string         `gorm:"type:varchar(1024);not null" json:"title"`
	Payload      datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	IsBookmarked int            `gorm:"column:is_bookmarked;default:0" json:"isBookmarked"`
	IsArchived   int            `gorm:"column:is_archived;default:0" json:"isArchived"`
	// CreatorId is inherited from MetaFieldV2
}

const (
	Folder_Table        = "d_folder"
	Folder_ParentId     = "parent_id"
	Folder_Title        = "title"
	Folder_Payload      = "payload"
	Folder_IsBookmarked = "is_bookmarked"
	Folder_IsArchived   = "is_archived"
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
	whereExpr := WhereExpr{}
	whereExpr.Eq(CreatorId, creatorId)
	whereExpr.GT(ServerVersion, since)
	for i := range whereExpr {
		db = db.Where(whereExpr[i])
	}

	if err := db.Find(&folders).Error; err != nil {
		return nil, err
	}
	return folders, nil
}

func FullFolders(db *gorm.DB, creatorId uint) ([]Folder, error) {
	var folders []Folder
	whereExpr := WhereExpr{}
	whereExpr.Eq(CreatorId, creatorId)
	whereExpr.Eq(IsDeleted, false)
	for i := range whereExpr {
		db = db.Where(whereExpr[i])
	}

	if err := db.Find(&folders).Error; err != nil {
		return nil, err
	}
	return folders, nil
}

func (f *Folder) Create(db *gorm.DB) error {
	return db.Create(f).Error
}

func (f *Folder) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).UpdateColumns(f).Error
}

func (f *Folder) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(f).Error
}

func (f *Folder) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(f).Where(where).Update(IsDeleted, true).Error
}

func SearchFolderIds(db *gorm.DB, creatorId uint, query string) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	whereExpr := WhereExpr{}
	whereExpr.Eq(CreatorId, creatorId)
	whereExpr.Eq(IsDeleted, false)
	whereExpr.ILIKE(Folder_Title, "%"+query+"%")
	for i := range whereExpr {
		db = db.Where(whereExpr[i])
	}

	if err := db.Model(&Folder{}).Pluck(Id, &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}
