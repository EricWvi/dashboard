package model

import (
	"fmt"

	"gorm.io/gorm"
)

type CollectionV2 struct {
	MetaFieldV2
	CollectionV2Field
}

type CollectionV2Field struct {
	Name string `gorm:"type:varchar(255);not null" json:"name"`
}

const (
	CollectionV2_Table = "d_collection_v2"
)

func (c *CollectionV2) TableName() string {
	return CollectionV2_Table
}

func (c *CollectionV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&c)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find collection_v2")
	}
	return nil
}

func ListCollectionV2Since(db *gorm.DB, since int64, creatorId uint) ([]CollectionV2, error) {
	var objs []CollectionV2
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

func FullCollectionV2(db *gorm.DB, creatorId uint) ([]CollectionV2, error) {
	var objs []CollectionV2
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

func (c *CollectionV2) Create(db *gorm.DB) error {
	return db.Create(c).Error
}

func (c *CollectionV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).UpdateColumns(c).Error
}

func (c *CollectionV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(c).Where(where).Update(IsDeleted, true).Error
}
