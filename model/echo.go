package model

import (
	"fmt"

	"gorm.io/gorm"
)

type Echo struct {
	MetaField
	EchoField
}

type EchoField struct {
	Year  int    `gorm:"type:int;not null" json:"year"`
	Sub   int    `gorm:"type:int;not null" json:"sub"`
	Draft int    `gorm:"type:int;default:0;not null" json:"draft"`
	Type  string `gorm:"column:e_type;type:varchar(64);not null" json:"type"`
	// CreatorId is inherited from MetaField
}

const (
	Echo_Table = "d_echo"
	Echo_Year  = "year"
	Echo_Sub   = "sub"
	Echo_Draft = "draft"
	Echo_Type  = "e_type"
)

func (e *Echo) TableName() string {
	return Echo_Table
}

func (e *Echo) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&e)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find echo with id %d", e.ID)
	}
	return nil
}

func ListEchoes(db *gorm.DB, where map[string]any) ([]Echo, error) {
	echoes := make([]Echo, 0)
	if err := db.Where(where).
		Order("sub ASC").
		Find(&echoes).Error; err != nil {
		return nil, err
	}
	return echoes, nil
}

func ListYears(db *gorm.DB, where map[string]any) ([]int, error) {
	years := make([]int, 0)
	if err := db.Model(&Echo{}).Where(where).Distinct("year").Pluck("year", &years).Error; err != nil {
		return nil, err
	}
	return years, nil
}

func (e *Echo) Create(db *gorm.DB) error {
	return db.Create(e).Error
}

func (e *Echo) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(e).Error
}

func (e *Echo) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(e).Error
}
