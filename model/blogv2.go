package model

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type BlogV2 struct {
	MetaFieldV2
	BlogV2Field
}

type BlogV2Field struct {
	Title      string         `gorm:"type:varchar(1024);not null" json:"title"`
	Visibility string         `gorm:"type:varchar(10);default:'Private';not null" json:"visibility"`
	Draft      uuid.UUID      `gorm:"type:uuid;not null" json:"draft"`
	Payload    datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
}

const (
	BlogV2_Table = "d_blog_v2"
)

func (b *BlogV2) TableName() string {
	return BlogV2_Table
}

func (b *BlogV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&b)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find blog_v2")
	}
	return nil
}

func ListBlogV2Since(db *gorm.DB, since int64, creatorId uint) ([]BlogV2, error) {
	var objs []BlogV2
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

func FullBlogV2(db *gorm.DB, creatorId uint) ([]BlogV2, error) {
	var objs []BlogV2
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

func (b *BlogV2) Create(db *gorm.DB) error {
	return db.Create(b).Error
}

func (b *BlogV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).UpdateColumns(b).Error
}

func (b *BlogV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(b).Where(where).Update(IsDeleted, true).Error
}
