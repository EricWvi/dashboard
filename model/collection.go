package model

import (
	"fmt"

	"gorm.io/gorm"
)

type Collection struct {
	MetaField
	CollectionField
}

type CollectionField struct {
	Name string `gorm:"size:255;not null" json:"name"`
}

const (
	Collection_Table = "d_collection"
)

func (c *Collection) TableName() string {
	return Collection_Table
}

func (c *Collection) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&c)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find collection with id %d", c.ID)
	}
	return nil
}

func ListCollections(db *gorm.DB, where map[string]any) ([]Collection, error) {
	collections := make([]Collection, 0)
	if err := db.Where(where).Order("created_at ASC").Find(&collections).Error; err != nil {
		return nil, err
	}
	return collections, nil
}

func (c *Collection) Create(db *gorm.DB) error {
	return db.Create(c).Error
}

func (c *Collection) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(c).Error
}

func (c *Collection) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(c).Error
}
