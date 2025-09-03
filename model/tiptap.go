package model

import (
	"encoding/json"
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Tiptap struct {
	MetaField
	TiptapField
}

type TiptapField struct {
	Content datatypes.JSON `gorm:"type:jsonb;default:'{}'::jsonb;not null" json:"content"`
	Ts      int64          `gorm:"type:bigint;default:1756629730634;not null" json:"ts"`
	History datatypes.JSON `gorm:"type:jsonb;default:'[]'::jsonb;not null" json:"history"`
	// CreatorId is inherited from MetaField
}

const (
	Tiptap_Table   = "d_tiptap"
	Tiptap_Content = "content"
	Tiptap_Ts      = "ts"
	Tiptap_History = "history"
)

func (t *Tiptap) TableName() string {
	return Tiptap_Table
}

func (t *Tiptap) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Omit(Tiptap_History).Find(&t)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find tiptap")
	}
	return nil
}

func GetTiptapHistory(db *gorm.DB, ts int64, where map[string]any) (datatypes.JSON, error) {
	// Use PostgreSQL's JSONB capabilities to extract history content directly
	var content datatypes.JSON

	path := `$[*] ? (@.time == $ts).content`

	rst := db.Table(Tiptap_Table).
		Where(where).
		Select("jsonb_path_query(history, ?, jsonb_build_object('ts', ?::bigint))::jsonb", path, ts).
		Row()

	if err := rst.Scan(&content); err != nil {
		return nil, fmt.Errorf("failed to scan history content: %w", err)
	}

	return content, nil
}

func ListTiptapHistory(db *gorm.DB, where map[string]any) ([]int64, error) {
	// Use PostgreSQL's JSONB capabilities to extract timestamps directly
	var timestamps []int64
	rst := db.Table(Tiptap_Table).
		Where(where).
		Select("jsonb_path_query_array(history, '$[*].time')::jsonb").
		Row()

	var timestampsJSON datatypes.JSON
	if err := rst.Scan(&timestampsJSON); err != nil {
		return nil, fmt.Errorf("failed to scan timestamps: %w", err)
	}

	if err := json.Unmarshal(timestampsJSON, &timestamps); err != nil {
		return nil, fmt.Errorf("failed to unmarshal timestamps: %w", err)
	}

	return timestamps, nil
}

func PruneTiptapHistory(db *gorm.DB, expireTs int64) (int64, error) {
	// Update rows where history has length > 0, filtering out entries older than expireTs
	// Uses PostgreSQL's JSONB path query to filter array elements
	path := `$[*] ? (@.time >= $expireTs)`
	rst := db.Table(Tiptap_Table).
		Where("jsonb_array_length(history) > 0").
		UpdateColumn(
			Tiptap_History,
			gorm.Expr("jsonb_path_query_array(history, ?, jsonb_build_object('expireTs', ?::bigint))", path, expireTs),
		)

	if rst.Error != nil {
		return 0, fmt.Errorf("failed to prune tiptap history: %w", rst.Error)
	}

	return rst.RowsAffected, nil
}

func (t *Tiptap) Create(db *gorm.DB) error {
	return db.Create(t).Error
}

func (t *Tiptap) Update(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Updates(t)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not update tiptap")
	}
	return nil
}

func (t *Tiptap) SaveHistory(db *gorm.DB, where map[string]any) error {
	// Use PostgreSQL's JSONB array prepend operator to add current content to history
	// This builds a new entry with current timestamp and content, then prepends it to the history array
	rst := db.Table(Tiptap_Table).Where(where).UpdateColumn(
		Tiptap_History,
		gorm.Expr("jsonb_build_object('time', ts, 'content', content) || history"),
	)
	if rst.Error != nil {
		return rst.Error
	}

	return nil
}

func (t *Tiptap) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(t).Error
}
