package model

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Tiptap struct {
	MetaField
	TiptapField
}

type TiptapField struct {
	Content datatypes.JSON `gorm:"type:jsonb;default:'{}'::jsonb;not null" json:"content"`
	// CreatorId is inherited from MetaField
}

const (
	Tiptap_Table   = "d_tiptap"
	Tiptap_Content = "content"
)

func (t *Tiptap) TableName() string {
	return Tiptap_Table
}

func (t *Tiptap) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&t)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find tiptap with id %d", t.ID)
	}
	return nil
}

func (t *Tiptap) Create(db *gorm.DB) error {
	return db.Create(t).Error
}

func UpdateTiptap(db *gorm.DB, where WhereExpr, updates map[string]any) error {
	for i := range where {
		db = db.Where(where[i])
	}
	return db.Table(Tiptap_Table).UpdateColumns(updates).Error
}

func (t *Tiptap) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(t).Error
}
