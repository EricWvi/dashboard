package model

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type WatchV2 struct {
	MetaFieldV2
	WatchV2Field
}

type WatchV2Field struct {
	Type    string         `gorm:"column:w_type;type:varchar(64);not null" json:"type"`
	Title   string         `gorm:"type:varchar(1024);not null" json:"title"`
	Status  string         `gorm:"type:varchar(64);default:'To Watch';not null" json:"status"`
	Year    int            `gorm:"default:2099" json:"year"`
	Rate    int            `gorm:"default:0" json:"rate"`
	Payload datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	Author  string         `gorm:"type:varchar(256);default:'';not null" json:"author"`
}

const (
	WatchV2_Table = "d_watch_v2"
)

func (w *WatchV2) TableName() string {
	return WatchV2_Table
}

func (w *WatchV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&w)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find watch_v2")
	}
	return nil
}

func ListWatchV2Since(db *gorm.DB, since int64, creatorId uint) ([]WatchV2, error) {
	var objs []WatchV2
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

func FullWatchV2(db *gorm.DB, creatorId uint) ([]WatchV2, error) {
	var objs []WatchV2
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

func (w *WatchV2) Create(db *gorm.DB) error {
	return db.Create(w).Error
}

func (w *WatchV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).UpdateColumns(w).Error
}

func (w *WatchV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(w).Where(where).Update(IsDeleted, true).Error
}
