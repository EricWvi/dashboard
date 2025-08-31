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
	Ts      int64          `gorm:"type:bigint;default:1756629730634;not null" json:"ts"`
	// CreatorId is inherited from MetaField
}

const (
	Tiptap_Table   = "d_tiptap"
	Tiptap_Content = "content"
	Tiptap_Ts      = "ts"
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
		return fmt.Errorf("can not find tiptap")
	}
	return nil
}

func (t *Tiptap) Create(db *gorm.DB) error {
	return db.Create(t).Error
}

func (t *Tiptap) Update(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Updates(t)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not update tiptap")
	}
	return nil
}

func (t *Tiptap) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(t).Error
}
