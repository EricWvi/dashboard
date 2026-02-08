package model

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Card struct {
	MetaField
	CardField
}

type CardField struct {
	FolderId    uint           `gorm:"type:int;default:0" json:"folderId"`
	Title       string         `gorm:"type:varchar(1024);not null" json:"title"`
	Draft       int            `gorm:"type:int;default:0" json:"draft"`
	Payload     datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	RawText     string         `gorm:"type:text;default:'';not null" json:"rawText"`
	ReviewCount int            `gorm:"type:int;default:0;not null" json:"reviewCount"`
	// CreatorId is inherited from MetaField
}

const (
	Card_Table       = "d_card"
	Card_FolderId    = "folder_id"
	Card_Title       = "title"
	Card_Draft       = "draft"
	Card_Payload     = "payload"
	Card_RawText     = "raw_text"
	Card_ReviewCount = "review_count"
)

func (c *Card) TableName() string {
	return Card_Table
}

func (c *Card) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&c)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find card")
	}
	return nil
}

func ListCards(db *gorm.DB, where map[string]any) ([]Card, error) {
	cards := make([]Card, 0)
	if err := db.Where(where).Find(&cards).Error; err != nil {
		return nil, err
	}
	return cards, nil
}

func (c *Card) Create(db *gorm.DB) error {
	return db.Create(c).Error
}

func (c *Card) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Omit(Card_ReviewCount).Updates(c).Error
}

func (c *Card) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(c).Error
}
