package model

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type QuickNoteV2 struct {
	MetaFieldV2
	QuickNoteV2Field
}

type QuickNoteV2Field struct {
	Title string    `gorm:"type:varchar(1024);not null" json:"title"`
	Draft uuid.UUID `gorm:"type:uuid;not null" json:"draft"`
	Order int       `gorm:"column:d_order;type:int;default:-1" json:"order"`
}

const (
	QuickNoteV2_Table = "d_quick_note_v2"
)

func (q *QuickNoteV2) TableName() string {
	return QuickNoteV2_Table
}

func (q *QuickNoteV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&q)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find quick_note_v2")
	}
	return nil
}

func ListQuickNoteV2Since(db *gorm.DB, since int64, creatorId uint) ([]QuickNoteV2, error) {
	var objs []QuickNoteV2
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

func FullQuickNoteV2(db *gorm.DB, creatorId uint) ([]QuickNoteV2, error) {
	var objs []QuickNoteV2
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

func (q *QuickNoteV2) Create(db *gorm.DB) error {
	return db.Create(q).Error
}

func (q *QuickNoteV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).UpdateColumns(q).Error
}

func (q *QuickNoteV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(q).Where(where).Update(IsDeleted, true).Error
}
