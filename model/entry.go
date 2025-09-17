package model

import (
	"errors"
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Entry struct {
	MetaField
	EntryField
}

type EntryField struct {
	Draft      int            `gorm:"default:0;not null" json:"draft"`
	Visibility string         `gorm:"size:10;default:'PUBLIC';not null" json:"visibility"`
	Payload    datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	WordCount  int            `gorm:"column:word_count;not null" json:"wordCount"`
}

const entryPageSize = 8

const (
	Entry_Table      = "d_entry"
	Entry_Visibility = "visibility"
	Entry_RawText    = "raw_text"
)

const (
	Visibility_Public  = "PUBLIC"
	Visibility_Private = "PRIVATE"
)

func (e *Entry) TableName() string {
	return Entry_Table
}

func (e *Entry) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&e)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find entry")
	}
	return nil
}

func (e *Entry) Create(db *gorm.DB) error {
	return db.Create(e).Error
}

func (e *Entry) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(e).Error
}

func (e *Entry) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(e).Error
}

func CountAllWords(db *gorm.DB, where map[string]any) int {
	var count int64
	if err := db.Model(&Entry{}).
		Select("SUM(word_count)").
		Where(where).
		Scan(&count).Error; err != nil {
		return 0
	}
	return int(count)
}

func FindDates(db *gorm.DB, where map[string]any) ([]string, error) {
	var dates []string
	if err := db.Model(&Entry{}).
		Select("DISTINCT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day").
		Where(where).
		Pluck("day", &dates).Error; err != nil {
		return nil, err
	}
	return dates, nil
}

func CountEntries(db *gorm.DB, where map[string]any) (int64, error) {
	var count int64
	query := db.Model(&Entry{})
	if where["year"] != 0 {
		query = query.Where("EXTRACT(YEAR FROM created_at) = ?", where["year"])
	}
	if where[CreatorId] != nil {
		query = query.Where(CreatorId+" = ?", where[CreatorId])
	}
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func FindEntries(db *gorm.DB, where WhereExpr, page uint) ([]*Entry, bool, error) {
	if page < 1 {
		return nil, false, errors.New("page number must be greater than 0")
	}
	entries := make([]*Entry, 0, entryPageSize+1)
	offset := (page - 1) * entryPageSize

	for i := range where {
		db = db.Where(where[i])
	}
	// Retrieve one extra to check if there are more entries
	if err := db.
		Omit(Entry_RawText).
		Order("created_at DESC").
		Offset(int(offset)).
		Limit(entryPageSize + 1).
		Find(&entries).Error; err != nil {
		return nil, false, err
	}

	hasMore := false
	if len(entries) > entryPageSize {
		hasMore = true
		entries = entries[:entryPageSize]
	}

	return entries, hasMore, nil
}
