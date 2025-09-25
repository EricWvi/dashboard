package model

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Pomodoro struct {
	MetaField
	PomodoroField
}

type PomodoroField struct {
	TodoId  uint           `gorm:"not null" json:"todoId"`
	Task    string         `gorm:"size:1024;not null" json:"task"`
	Detail  string         `gorm:"size:1024" json:"detail"`
	Payload datatypes.JSON `gorm:"type:jsonb;default:'[]';not null" json:"payload"`
	// CreatorId is inherited from MetaField
}

const (
	Pomodoro_Table = "d_pomodoro"
)

func (p *Pomodoro) TableName() string {
	return Pomodoro_Table
}

func (p *Pomodoro) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&p)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find pomodoro")
	}
	return nil
}

func ListPomodoros(db *gorm.DB, where map[string]any) ([]Pomodoro, error) {
	pomodoros := make([]Pomodoro, 0)
	if err := db.Where(where).
		Order("created_at DESC").
		Find(&pomodoros).Error; err != nil {
		return nil, err
	}
	return pomodoros, nil
}

func ListTodayPomodoros(db *gorm.DB, where map[string]any) ([]Pomodoro, error) {
	pomodoros := make([]Pomodoro, 0)
	if err := db.Where(where).Where("created_at::date = CURRENT_DATE").
		Find(&pomodoros).Error; err != nil {
		return nil, err
	}
	return pomodoros, nil
}

func (p *Pomodoro) Create(db *gorm.DB) error {
	return db.Create(p).Error
}

func (p *Pomodoro) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(p).Error
}

func (p *Pomodoro) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(p).Error
}
