package model

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type StatisticV2 struct {
	MetaFieldV2
	StatisticV2Field
}

type StatisticV2Field struct {
	StKey   string         `gorm:"column:st_key;size:20;not null" json:"stKey"`
	StValue datatypes.JSON `gorm:"type:jsonb;default:'{}';not null" json:"stValue"`
}

const (
	StatisticV2_Table = "d_statistic"
	StatisticV2_Key   = "st_key"
	StatisticV2_Value = "st_value"

	StatisticKeyWordsCount  = "wordsCount"
	StatisticKeyCurrentYear = "currentYear"
	StatisticKeyEntryDate   = "entryDate"
	StatisticKeyAllDates    = "allDates"
)

func (s *StatisticV2) TableName() string {
	return StatisticV2_Table
}

func (s *StatisticV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&s)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find statistic_v2")
	}
	return nil
}

func ListStatisticV2Since(db *gorm.DB, since int64, creatorId uint) ([]StatisticV2, error) {
	var objs []StatisticV2
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

func FullStatisticV2(db *gorm.DB, creatorId uint) ([]StatisticV2, error) {
	var objs []StatisticV2
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

func (s *StatisticV2) Create(db *gorm.DB) error {
	return db.Create(s).Error
}

// UpsertStatistic upserts a statistic record
func UpsertStatistic(db *gorm.DB, creatorId uint, key string, value any) error {
	var existing StatisticV2
	where := map[string]any{
		CreatorId:       creatorId,
		StatisticV2_Key: key,
		IsDeleted:       false,
	}

	jsonValue, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal statistic value: %w", err)
	}

	err = existing.Get(db, where)
	if err != nil {
		// Create new
		statistic := StatisticV2{
			MetaFieldV2: MetaFieldV2{
				Id:        uuid.New(),
				CreatedAt: time.Now().UnixMilli(),
				UpdatedAt: time.Now().UnixMilli(),
				IsDeleted: BoolPtr(false),
				CreatorId: creatorId,
			},
			StatisticV2Field: StatisticV2Field{
				StKey:   key,
				StValue: jsonValue,
			},
		}
		return statistic.Create(db)
	}

	// Update existing
	return db.Model(&existing).Updates(map[string]any{
		StatisticV2_Value: jsonValue,
		UpdatedAt:         time.Now().UnixMilli(),
	}).Error
}

// CalculateStatistics calculates all statistics for a user
func CalculateStatistics(db *gorm.DB, creatorId uint) error {
	// Get words count
	wordsCount := CountAllWords(db, map[string]any{CreatorId: creatorId})
	if err := UpsertStatistic(db, creatorId, StatisticKeyWordsCount, wordsCount); err != nil {
		return err
	}

	// Get current year activity
	currentYearCounts, err := CountCurrentYear(db, map[string]any{CreatorId: creatorId})
	if err != nil {
		return err
	}
	currentYearMap := make(map[string]int)
	for _, count := range currentYearCounts {
		currentYearMap[count.Date] = count.Count
	}
	if err := UpsertStatistic(db, creatorId, StatisticKeyCurrentYear, currentYearMap); err != nil {
		return err
	}

	// Get entry dates
	dates, err := FindDates(db, map[string]any{CreatorId: creatorId})
	if err != nil {
		return err
	}

	// Build nested structure: year -> month -> days
	entryDateMap := make(map[string]map[string][]int)
	for _, date := range dates {
		yearKey := fmt.Sprintf("%d", date.Year)
		monthKey := fmt.Sprintf("%d", date.Month)

		if entryDateMap[yearKey] == nil {
			entryDateMap[yearKey] = make(map[string][]int)
		}
		entryDateMap[yearKey][monthKey] = append(entryDateMap[yearKey][monthKey], date.Day)
	}

	if err := UpsertStatistic(db, creatorId, StatisticKeyEntryDate, entryDateMap); err != nil {
		return err
	}

	// Total dates count
	if err := UpsertStatistic(db, creatorId, StatisticKeyAllDates, len(dates)); err != nil {
		return err
	}

	return nil
}
