package model

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type EntryV2 struct {
	MetaFieldV2
	EntryV2Field
}

type EntryV2Field struct {
	Draft       uuid.UUID      `gorm:"type:uuid;not null" json:"draft"`
	Payload     datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	WordCount   int            `gorm:"column:word_count;default:0;not null" json:"wordCount"`
	RawText     string         `gorm:"column:raw_text;type:text;default:'';not null" json:"rawText"`
	Bookmark    bool           `gorm:"default:false;not null" json:"bookmark"`
	ReviewCount int            `gorm:"column:review_count;default:0;not null" json:"reviewCount"`
}

const (
	EntryV2_Table       = "d_entry_v2"
	EntryV2_ReviewCount = "review_count"
)

func (e *EntryV2) TableName() string {
	return EntryV2_Table
}

func (e *EntryV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&e)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find entry_v2")
	}
	return nil
}

func ListEntryV2Since(db *gorm.DB, since int64, creatorId uint) ([]EntryV2, error) {
	var objs []EntryV2
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

func FullEntryV2(db *gorm.DB, creatorId uint) ([]EntryV2, error) {
	var objs []EntryV2
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

func (e *EntryV2) Create(db *gorm.DB) error {
	return db.Create(e).Error
}

func (e *EntryV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).Omit(EntryV2_ReviewCount).UpdateColumns(e).Error
}

func (e *EntryV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(e).Where(where).Update(IsDeleted, true).Error
}
