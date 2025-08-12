package model

import (
	"gorm.io/gorm"
)

type Tag struct {
	MetaField
	TagField
}

type TagField struct {
	Name string `gorm:"type:varchar(255);not null" json:"name"`
	// CreatorId is inherited from MetaField
}

const (
	Tag_Table = "d_tag"
	Tag_Name  = "name"
)

func (t *Tag) TableName() string {
	return Tag_Table
}

func ListTags(db *gorm.DB, where map[string]any) ([]string, error) {
	tags := make([]string, 0)
	if err := db.Model(&Tag{}).Where(where).Pluck("name", &tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

func (t *Tag) Create(db *gorm.DB) error {
	return db.Create(t).Error
}

func (t *Tag) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(t).Error
}

func (t *Tag) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(t).Error
}
