package model

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TodoV2 struct {
	MetaFieldV2
	TodoV2Field
}

type TodoV2Field struct {
	Title        string    `gorm:"type:varchar(1024);not null" json:"title"`
	Completed    bool      `gorm:"default:false" json:"completed"`
	CollectionId uuid.UUID `gorm:"column:collection_id;type:uuid;not null" json:"collectionId"`
	Difficulty   int       `gorm:"default:-1" json:"difficulty"`
	Order        int       `gorm:"column:d_order;default:1" json:"order"`
	Link         string    `gorm:"type:varchar(1024)" json:"link"`
	Draft        uuid.UUID `gorm:"type:uuid;not null" json:"draft"`
	Schedule     int64     `gorm:"type:bigint" json:"schedule"`
	Done         bool      `gorm:"default:false" json:"done"`
	Count        int       `gorm:"column:d_count;default:0" json:"count"`
	Kanban       uuid.UUID `gorm:"type:uuid;not null" json:"kanban"`
}

const (
	TodoV2_Table = "d_todo_v2"
)

func (t *TodoV2) TableName() string {
	return TodoV2_Table
}

func (t *TodoV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&t)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find todo_v2")
	}
	return nil
}

func ListTodoV2Since(db *gorm.DB, since int64, creatorId uint) ([]TodoV2, error) {
	var objs []TodoV2
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

func FullTodoV2(db *gorm.DB, creatorId uint) ([]TodoV2, error) {
	var objs []TodoV2
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

func (t *TodoV2) Create(db *gorm.DB) error {
	return db.Create(t).Error
}

func (t *TodoV2) SyncFromClient(db *gorm.DB, where map[string]any) error {
	syncDb := OmitMetaFields(db)
	return syncDb.Where(where).UpdateColumns(t).Error
}

func (t *TodoV2) MarkDeleted(db *gorm.DB, where map[string]any) error {
	return db.Model(t).Where(where).Update(IsDeleted, true).Error
}
