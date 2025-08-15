package model

import (
	"fmt"

	"gorm.io/gorm"
)

type QuickNote struct {
	MetaField
	QuickNoteField
}

type QuickNoteField struct {
	Title string `gorm:"size:1024;not null" json:"title"`
	Draft int    `gorm:"type:int;default:0;not null" json:"draft"`
	// CreatorId is inherited from MetaField
}

const (
	QuickNote_Table = "d_quick_note"
)

func (q *QuickNote) TableName() string {
	return QuickNote_Table
}

func (q *QuickNote) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&q)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find QuickNote with id %d", q.ID)
	}
	return nil
}

func ListQuickNotes(db *gorm.DB, where map[string]any) ([]QuickNote, error) {
	quicknotes := make([]QuickNote, 0)
	if err := db.Where(where).
		Order("created_at DESC").
		Find(&quicknotes).Error; err != nil {
		return nil, err
	}
	return quicknotes, nil
}

func (q *QuickNote) Create(db *gorm.DB) error {
	return db.Create(q).Error
}

func (q *QuickNote) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(q).Error
}

func (q *QuickNote) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(q).Error
}
