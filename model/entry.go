package model

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Entry struct {
	MetaField
	EntryField
}

type EntryField struct {
	Draft       int            `gorm:"default:0;not null" json:"draft"`
	Visibility  string         `gorm:"size:10;default:'PUBLIC';not null" json:"visibility"`
	Payload     datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	WordCount   int            `gorm:"column:word_count;not null" json:"wordCount"`
	RawText     string         `gorm:"column:raw_text;type:text;default:'';not null" json:"rawText"`
	Bookmark    bool           `gorm:"default:false;not null" json:"bookmark"`
	ReviewCount int            `gorm:"column:review_count;default:0;not null" json:"reviewCount"`
}

const entryPageSize = 8

const (
	Entry_Table       = "d_entry"
	Entry_Visibility  = "visibility"
	Entry_RawText     = "raw_text"
	Entry_Bookmark    = "bookmark"
	Entry_ReviewCount = "review_count"
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

type DateParts struct {
	Year  int
	Month int
	Day   int
}

func FindDates(db *gorm.DB, where map[string]any) ([]DateParts, error) {
	var rows []DateParts
	if err := db.Model(&Entry{}).
		Select(`
        EXTRACT(YEAR FROM created_at)::int  AS year,
        EXTRACT(MONTH FROM created_at)::int AS month,
        EXTRACT(DAY FROM created_at)::int   AS day
    `).
		Where(where).
		Group("year, month, day").
		Order("year DESC, month DESC, day DESC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
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

type CurrentYearCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
	Level int    `json:"level"`
}

func CountCurrentYear(db *gorm.DB, where map[string]any) ([]CurrentYearCount, error) {
	var results []struct {
		Date  string
		Count int
	}

	currentYear := time.Now().Year()
	startDate := fmt.Sprintf("%d-01-01", currentYear)

	query := db.Model(&Entry{}).
		Select("TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date, COUNT(*) AS count").
		Where("created_at >= ?", startDate)

	if where[CreatorId] != nil {
		query = query.Where(CreatorId+" = ?", where[CreatorId])
	}

	if err := query.Group("DATE(created_at)").Order("date").Scan(&results).Error; err != nil {
		return nil, err
	}

	// Convert to CurrentYearCount with level calculation
	var counts []CurrentYearCount
	for _, result := range results {
		level := min(result.Count, 4)
		counts = append(counts, CurrentYearCount{
			Date:  result.Date,
			Count: result.Count,
			Level: level,
		})
	}

	return counts, nil
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

func GetRandomEntries(db *gorm.DB, userId uint, randomSize int) ([]*Entry, bool, error) {
	// Get all dates
	where := WhereMap{}
	where.Eq(CreatorId, userId)

	// Find minimum review_count
	var minReviewCount int
	if err := db.Model(&Entry{}).
		Select("MIN(" + Entry_ReviewCount + ")").
		Where(map[string]any(where)).
		Scan(&minReviewCount).Error; err != nil {
		return nil, false, err
	}

	// Get dates where entries have minimum review_count
	where.Eq(Entry_ReviewCount, minReviewCount)
	dates, err := FindDates(db, where)
	if err != nil {
		return nil, false, err
	}

	if len(dates) == 0 {
		return []*Entry{}, false, nil
	}

	numDates := min(len(dates), randomSize)

	// Shuffle and pick first numDates
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(dates), func(i, j int) {
		dates[i], dates[j] = dates[j], dates[i]
	})

	selectedDates := dates[:numDates]

	// Build SQL WHERE clause with OR conditions
	var conditions []string
	for _, date := range selectedDates {
		startDate := fmt.Sprintf("%04d-%02d-%02d", date.Year, date.Month, date.Day)
		endDate := time.Date(date.Year, time.Month(date.Month), date.Day, 0, 0, 0, 0, time.UTC).
			AddDate(0, 0, 1).Format("2006-01-02")

		condition := fmt.Sprintf("(created_at >= TIMESTAMP '%s' AND created_at < TIMESTAMP '%s')",
			startDate, endDate)
		conditions = append(conditions, condition)
	}

	whereClause := strings.Join(conditions, " OR ")

	// Get entries matching the random dates
	var entries []*Entry
	query := fmt.Sprintf(CreatorId+" = ? AND (%s)", whereClause)

	if err := db.
		Omit(Entry_RawText).
		Where(query, userId).
		Where(Entry_ReviewCount, minReviewCount).
		Order("created_at DESC").
		Find(&entries).Error; err != nil {
		return nil, false, err
	}

	// Increment review count in goroutine
	go func() {
		entryIds := make([]uint, len(entries))
		for i, entry := range entries {
			entryIds[i] = entry.ID
		}

		if len(entryIds) > 0 {
			db.Model(&Entry{}).
				Where("id IN ?", entryIds).
				UpdateColumn(Entry_ReviewCount, gorm.Expr(Entry_ReviewCount+" + 1"))
		}
	}()

	// No pagination for random entries
	hasMore := false

	return entries, hasMore, nil
}

func BookmarkEntry(db *gorm.DB, where map[string]any) error {
	return db.Model(&Entry{}).
		Where(where).
		Update(Entry_Bookmark, true).Error
}

func UnbookmarkEntry(db *gorm.DB, where map[string]any) error {
	return db.Model(&Entry{}).
		Where(where).
		Update(Entry_Bookmark, false).Error
}
