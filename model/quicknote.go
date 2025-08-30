package model

import (
	"database/sql"
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
	Order int    `gorm:"column:d_order;type:int;default:-1;not null" json:"order"`
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
		return fmt.Errorf("can not find QuickNote")
	}
	return nil
}

func MaxNoteOrder(db *gorm.DB, where map[string]any) (int, error) {
	var maxOrder sql.NullInt32
	if err := db.Model(&QuickNote{}).Where(where).Select("MAX(d_order)").Scan(&maxOrder).Error; err != nil {
		return 0, err
	}
	return int(maxOrder.Int32), nil
}

func MinNoteOrder(db *gorm.DB, where map[string]any) (int, error) {
	var minOrder sql.NullInt32
	if err := db.Model(&QuickNote{}).Where(where).Select("MIN(d_order)").Scan(&minOrder).Error; err != nil {
		return 0, err
	}
	return int(minOrder.Int32), nil
}

func ListQuickNotes(db *gorm.DB, where map[string]any) ([]QuickNote, error) {
	quicknotes := make([]QuickNote, 0)
	if err := db.Where(where).
		Order("d_order DESC").
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
