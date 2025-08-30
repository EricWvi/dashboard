package model

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Media struct {
	gorm.Model
	CreatorId         uint      `gorm:"column:creator_id;not null"`
	Link              uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();not null"`
	Key               string    `gorm:"type:varchar(1024);not null;unique"`
	PresignedURL      string    `gorm:"type:varchar(2048);default:null"`
	LastPresignedTime time.Time `gorm:"column:last_presigned_time;type:timestamp with time zone;default:now()"`
}

const (
	Media_Table             = "d_media"
	Media_Id                = "id"
	Media_CreatorId         = "creator_id"
	Media_Link              = "link"
	Media_PresignedURL      = "presigned_url"
	Media_LastPresignedTime = "last_presigned_time"
)

func (m *Media) TableName() string {
	return Media_Table
}

func (m *Media) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&m)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find media")
	}
	return nil
}

func (m *Media) Create(db *gorm.DB) error {
	return db.Create(m).Error
}

func (m *Media) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(m).Error
}

func (m *Media) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(m).Error
}
