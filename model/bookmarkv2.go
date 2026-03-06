package model

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type BookmarkV2 struct {
	MetaFieldV2
	BookmarkV2Field
}

type BookmarkV2Field struct {
	URL     string         `gorm:"column:url;type:varchar(1024);not null" json:"url"`
	Title   string         `gorm:"type:varchar(1024);not null" json:"title"`
	Click   int            `gorm:"type:int;default:0;not null" json:"click"`
	Domain  string         `gorm:"type:varchar(64);not null" json:"domain"`
	Payload datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
}

const (
	BookmarkV2_Table = "d_bookmark_v2"
)

func (b *BookmarkV2) TableName() string {
	return BookmarkV2_Table
}

func (b *BookmarkV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&b)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find bookmark_v2")
	}
	return nil
}

func ListBookmarkV2Since(db *gorm.DB, since int64, creatorId uint) ([]BookmarkV2, error) {
	var objs []BookmarkV2
	whereExpr := WhereExpr{}
	whereExpr.GT(ServerVersion, since)
	whereExpr.Eq(CreatorId, creatorId)
	for i := range whereExpr {
		db = db.Where(whereExpr[i])
	}
	if err := db.Find(&objs).Error; err != nil {
		return nil, err
	}
	return objs, nil
}

func FullBookmarkV2(db *gorm.DB, creatorId uint) ([]BookmarkV2, error) {
	var objs []BookmarkV2
	whereExpr := WhereExpr{}
	whereExpr.Eq(CreatorId, creatorId)
	whereExpr.Eq(IsDeleted, false)
	for i := range whereExpr {
		db = db.Where(whereExpr[i])
	}
	if err := db.Find(&objs).Error; err != nil {
		return nil, err
	}
	return objs, nil
}

func (b *BookmarkV2) Create(db *gorm.DB) error {
	return db.Create(b).Error
}

func (b *BookmarkV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).UpdateColumns(b).Error
}

func (b *BookmarkV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(b).Where(where).Update(IsDeleted, true).Error
}
