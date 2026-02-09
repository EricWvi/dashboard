package model

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type TiptapV2 struct {
	MetaFieldV2
	TiptapV2Field
}

type TiptapV2Field struct {
	Site    int16          `gorm:"type:smallint;not null" json:"site"`
	Content datatypes.JSON `gorm:"type:jsonb;default:'{}'::jsonb;not null" json:"content"`
	History datatypes.JSON `gorm:"type:jsonb;default:'[]'::jsonb;not null" json:"history"`
}

const (
	TiptapV2_Table   = "d_tiptap_v2"
	TiptapV2_Site    = "site"
	TiptapV2_Content = "content"
	TiptapV2_History = "history"
)

func (t *TiptapV2) TableName() string {
	return TiptapV2_Table
}

func (t *TiptapV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&t)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find tiptap_v2")
	}
	return nil
}

func ListTiptapV2(db *gorm.DB, where map[string]any) ([]TiptapV2, error) {
	var objs []TiptapV2
	rst := db.Where(where).Find(&objs)
	if rst.Error != nil {
		return nil, rst.Error
	}
	return objs, nil
}

func ListTiptapV2Since(db *gorm.DB, since int64, creatorId uint, site int16) ([]TiptapV2, error) {
	var objs []TiptapV2
	where := WhereMap{}
	where.Eq(CreatorId, creatorId)
	where.Eq(TiptapV2_Site, site)

	whereExpr := WhereExpr{}
	whereExpr.GT("server_version", since)

	rst := db.Where(where).Where(whereExpr).Find(&objs)
	if rst.Error != nil {
		return nil, rst.Error
	}
	return objs, nil
}

func FullTiptapV2(db *gorm.DB, creatorId uint, site int16) ([]TiptapV2, error) {
	var objs []TiptapV2
	where := WhereMap{}
	where.Eq(CreatorId, creatorId)
	where.Eq(TiptapV2_Site, site)
	where.Eq("is_deleted", false)

	rst := db.Where(where).Find(&objs)
	if rst.Error != nil {
		return nil, rst.Error
	}
	return objs, nil
}

func (t *TiptapV2) Create(db *gorm.DB) error {
	return db.Create(t).Error
}

func (t *TiptapV2) Update(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Updates(t)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not update tiptap_v2")
	}
	return nil
}

func (t *TiptapV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(t).Where(where).Update("is_deleted", true).Error
}
