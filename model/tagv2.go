package model

import (
	"fmt"

	"gorm.io/gorm"
)

type TagV2 struct {
	MetaFieldV2
	TagV2Field
}

type TagV2Field struct {
	Name  string `gorm:"type:varchar(255);not null" json:"name"`
	Group string `gorm:"column:t_group;type:varchar(63);default:'dashboard';not null" json:"group"`
}

const (
	TagV2_Table = "d_tag_v2"
	TagV2_Name  = "name"
	TagV2_Group = "t_group"
)

func (t *TagV2) TableName() string {
	return TagV2_Table
}

func (t *TagV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&t)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find tag_v2")
	}
	return nil
}

func ListTagV2Since(db *gorm.DB, since int64, creatorId uint, group string) ([]TagV2, error) {
	var objs []TagV2
	whereExpr := WhereExpr{}
	whereExpr.GT(ServerVersion, since)
	whereExpr.Eq(CreatorId, creatorId)
	whereExpr.Eq(TagV2_Group, group)
	for i := range whereExpr {
		db = db.Where(whereExpr[i])
	}
	if err := db.Find(&objs).Error; err != nil {
		return nil, err
	}
	return objs, nil
}

func FullTagV2(db *gorm.DB, creatorId uint, group string) ([]TagV2, error) {
	var objs []TagV2
	whereExpr := WhereExpr{}
	whereExpr.Eq(CreatorId, creatorId)
	whereExpr.Eq(TagV2_Group, group)
	whereExpr.Eq(IsDeleted, false)
	for i := range whereExpr {
		db = db.Where(whereExpr[i])
	}
	if err := db.Find(&objs).Error; err != nil {
		return nil, err
	}
	return objs, nil
}

func (t *TagV2) Create(db *gorm.DB) error {
	return db.Create(t).Error
}

func (t *TagV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).UpdateColumns(t).Error
}

func (t *TagV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(t).Where(where).Update(IsDeleted, true).Error
}
