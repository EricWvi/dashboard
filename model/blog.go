package model

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Blog struct {
	MetaField
	BlogField
}

type BlogField struct {
	Title      string         `gorm:"size:1024;not null" json:"title"`
	Visibility string         `gorm:"size:10;default:'Private';not null" json:"visibility"`
	Draft      int            `gorm:"type:int;default:0;not null" json:"draft"`
	Payload    datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	// CreatorId is inherited from MetaField
}

const (
	Blog_Table = "d_blog"
)

func (b *Blog) TableName() string {
	return Blog_Table
}

func (b *Blog) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&b)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find blog")
	}
	return nil
}

func ListBlogs(db *gorm.DB, where map[string]any) ([]Blog, error) {
	blogs := make([]Blog, 0)
	if err := db.Where(where).
		Order("created_at DESC").
		Find(&blogs).Error; err != nil {
		return nil, err
	}
	return blogs, nil
}

func (b *Blog) Create(db *gorm.DB) error {
	return db.Create(b).Error
}

func (b *Blog) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(b).Error
}

func (b *Blog) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(b).Error
}
