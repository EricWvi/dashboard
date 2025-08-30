package model

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Bookmark struct {
	MetaField
	BookmarkField
}

type BookmarkView struct {
	ID uint `gorm:"primarykey" json:"id"`
	BookmarkField
}

type BookmarkField struct {
	URL     string         `gorm:"type:varchar(1024);not null" json:"url"`
	Title   string         `gorm:"type:varchar(1024);not null" json:"title"`
	Click   int            `gorm:"type:int;default:0;not null" json:"click"`
	Domain  string         `gorm:"type:varchar(64);not null" json:"domain"`
	Payload datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	// CreatorId is inherited from MetaField
}

const (
	Bookmark_Table   = "d_bookmark"
	Bookmark_URL     = "url"
	Bookmark_Title   = "title"
	Bookmark_Click   = "click"
	Bookmark_Domain  = "domain"
	Bookmark_Payload = "payload"
)

func (b *Bookmark) TableName() string {
	return Bookmark_Table
}

func (b *BookmarkView) TableName() string {
	return Bookmark_Table
}

func (b *BookmarkView) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&b)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find bookmark")
	}
	return nil
}

func ListBookmarks(db *gorm.DB, where map[string]any) ([]BookmarkView, error) {
	bookmarks := make([]BookmarkView, 0)
	if err := db.Where(where).Where("deleted_at IS NULL").
		Order("created_at DESC").
		Find(&bookmarks).Error; err != nil {
		return nil, err
	}
	return bookmarks, nil
}

func (b *Bookmark) Create(db *gorm.DB) error {
	return db.Create(b).Error
}

func (b *Bookmark) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Omit(Bookmark_Click).Updates(b).Error
}

func ClickBookmark(db *gorm.DB, where map[string]any) error {
	return db.Model(&Bookmark{}).Where(where).Update(Bookmark_Click, gorm.Expr(Bookmark_Click+" + ?", 1)).Error
}

func (b *Bookmark) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(b).Error
}
