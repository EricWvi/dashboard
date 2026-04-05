package model

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type EntryV2 struct {
	MetaFieldV2
	EntryV2Field
}

type EntryV2Field struct {
	Draft       uuid.UUID      `gorm:"type:uuid;not null" json:"draft"`
	Payload     datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"payload"`
	WordCount   int            `gorm:"column:word_count;default:0;not null" json:"wordCount"`
	RawText     string         `gorm:"column:raw_text;type:text;default:'';not null" json:"rawText"`
	Bookmark    bool           `gorm:"default:false;not null" json:"bookmark"`
	ReviewCount int            `gorm:"column:review_count;default:0;not null" json:"reviewCount"`
}

const (
	EntryV2_Table       = "d_entry_v2"
	EntryV2_ReviewCount = "review_count"
	EntryV2_RawText     = "raw_text"
	EntryV2_Bookmark    = "bookmark"
	entryV2PageSize     = 8
)

type EntryMeta struct {
	Id        uuid.UUID `json:"id"`
	Draft     uuid.UUID `json:"draft"`
	CreatedAt int64     `json:"createdAt"`
}

func (e *EntryV2) TableName() string {
	return EntryV2_Table
}

func (e *EntryV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&e)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find entry_v2")
	}
	return nil
}

func ListEntryV2Since(db *gorm.DB, since int64, creatorId uint) ([]EntryV2, error) {
	var objs []EntryV2
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

func FullEntryV2(db *gorm.DB, creatorId uint) ([]EntryV2, error) {
	var objs []EntryV2
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

func (e *EntryV2) Create(db *gorm.DB) error {
	return db.Create(e).Error
}

func (e *EntryV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).Omit(EntryV2_ReviewCount).UpdateColumns(e).Error
}

func (e *EntryV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(e).Where(where).Update(IsDeleted, true).Error
}

type DatePartsV2 struct {
	Year  int
	Month int
	Day   int
}

func FindDatesV2(db *gorm.DB, where map[string]any) ([]DatePartsV2, error) {
	var rows []DatePartsV2
	if err := db.Model(&EntryV2{}).
		Select(`
        EXTRACT(YEAR FROM created_at)::int  AS year,
        EXTRACT(MONTH FROM created_at)::int AS month,
        EXTRACT(DAY FROM created_at)::int   AS day
    `).
		Where(where).
		Where(IsDeleted, false).
		Group("year, month, day").
		Order("year DESC, month DESC, day DESC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func FindEntriesV2(db *gorm.DB, where WhereExpr, page uint) ([]EntryMeta, bool, error) {
	if page < 1 {
		return nil, false, errors.New("page number must be greater than 0")
	}
	entries := make([]EntryMeta, 0, entryV2PageSize+1)
	offset := (page - 1) * entryV2PageSize

	for i := range where {
		db = db.Where(where[i])
	}
	// Retrieve one extra to check if there are more entries
	if err := db.Table(EntryV2_Table).
		Select("id, draft, created_at").
		Where(IsDeleted, false).
		Order("created_at DESC").
		Offset(int(offset)).
		Limit(entryV2PageSize + 1).
		Find(&entries).Error; err != nil {
		return nil, false, err
	}

	hasMore := false
	if len(entries) > entryV2PageSize {
		hasMore = true
		entries = entries[:entryV2PageSize]
	}

	return entries, hasMore, nil
}

func GetRandomEntriesV2(db *gorm.DB, userId uint, randomSize int) ([]EntryMeta, bool, error) {
	// Get all dates
	where := WhereMap{}
	where.Eq(CreatorId, userId)

	// Find minimum review_count
	var minReviewCount int
	if err := db.Model(&EntryV2{}).
		Select("MIN("+EntryV2_ReviewCount+")").
		Where(map[string]any(where)).
		Where(IsDeleted, false).
		Scan(&minReviewCount).Error; err != nil {
		return nil, false, err
	}

	// Get dates where entries have minimum review_count
	whereMap := map[string]any{}
	whereMap[CreatorId] = userId
	whereMap[EntryV2_ReviewCount] = minReviewCount
	dates, err := FindDatesV2(db, whereMap)
	if err != nil {
		return nil, false, err
	}

	if len(dates) == 0 {
		return []EntryMeta{}, false, nil
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
	var entries []EntryMeta
	query := fmt.Sprintf(CreatorId+" = ? AND (%s)", whereClause)

	if err := db.
		Table(EntryV2_Table).
		Select("id, draft, created_at").
		Where(query, userId).
		Where(IsDeleted, false).
		Where(EntryV2_ReviewCount, minReviewCount).
		Order("created_at DESC").
		Find(&entries).Error; err != nil {
		return nil, false, err
	}

	// Increment review count in goroutine
	go func() {
		entryIds := make([]uuid.UUID, len(entries))
		for i, entry := range entries {
			entryIds[i] = entry.Id
		}

		if len(entryIds) > 0 {
			db.Model(&EntryV2{}).
				Where("id IN ?", entryIds).
				UpdateColumn(EntryV2_ReviewCount, gorm.Expr(EntryV2_ReviewCount+" + 1"))
		}
	}()

	// No pagination for random entries
	hasMore := false

	return entries, hasMore, nil
}
