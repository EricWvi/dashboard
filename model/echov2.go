package model

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EchoV2 struct {
	MetaFieldV2
	EchoV2Field
}

type EchoV2Field struct {
	Type  string    `gorm:"column:e_type;type:varchar(64);not null" json:"type"`
	Year  int       `gorm:"type:int;not null" json:"year"`
	Sub   int       `gorm:"type:int;not null" json:"sub"`
	Draft uuid.UUID `gorm:"type:uuid;not null" json:"draft"`
	Mark  bool      `gorm:"default:false;not null" json:"mark"`
}

const (
	EchoV2_Table = "d_echo_v2"
)

func (e *EchoV2) TableName() string {
	return EchoV2_Table
}

func (e *EchoV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&e)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find echo_v2")
	}
	return nil
}

func ListEchoV2Since(db *gorm.DB, since int64, creatorId uint) ([]EchoV2, error) {
	var objs []EchoV2
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

func FullEchoV2(db *gorm.DB, creatorId uint) ([]EchoV2, error) {
	var objs []EchoV2
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

func (e *EchoV2) Create(db *gorm.DB) error {
	return db.Create(e).Error
}

func (e *EchoV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).UpdateColumns(e).Error
}

func (e *EchoV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(e).Where(where).Update(IsDeleted, true).Error
}
