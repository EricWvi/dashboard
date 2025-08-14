package model

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Watch struct {
	MetaField
	WatchField
}

type WatchField struct {
	Title   string         `gorm:"size:1024;not null" json:"title"`
	Type    string         `gorm:"column:w_type;size:64;not null" json:"type"`
	Status  string         `gorm:"column:status;size:64;not null" json:"status"`
	Year    int            `gorm:"default:2099;not null" json:"year"`
	Rate    int            `gorm:"default:0;not null" json:"rate"`
	Payload datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	Author  string         `gorm:"size:256;" json:"author"`
	// CreatorId is inherited from MetaField
}

const (
	Watch_Table  = "d_watch"
	Watch_Type   = "w_type"
	Watch_Status = "status"
)

type WatchType string

const (
	WatchTypeMovie       = "Movie"
	WatchTypeSeries      = "Series"
	WatchTypeDocumentary = "Documentary"
	WatchTypeBook        = "Book"
	WatchTypeGame        = "Game"
	WatchTypeManga       = "Manga"
)

type WatchStatus string

const (
	WatchStatusWatching    = "Watching"
	WatchStatusCompleted   = "Completed"
	WatchStatusDropped     = "Dropped"
	WatchStatusPlanToWatch = "Plan to Watch"
)

func (w *Watch) TableName() string {
	return Watch_Table
}

func (w *Watch) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&w)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find watch with id %d", w.ID)
	}
	return nil
}

func ListWatches(db *gorm.DB, where map[string]any) ([]Watch, error) {
	watches := make([]Watch, 0)
	if err := db.Where(where).
		Order("created_at DESC").
		Find(&watches).Error; err != nil {
		return nil, err
	}
	return watches, nil
}

func (w *Watch) Create(db *gorm.DB, createdAt NullTime) error {
	if createdAt.Valid {
		w.CreatedAt = createdAt.Time
	}
	return db.Create(w).Error
}

func (w *Watch) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(w).Error
}

func (w *Watch) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(w).Error
}
