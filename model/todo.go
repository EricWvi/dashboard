package model

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Todo struct {
	MetaField
	TodoField
}

type TodoField struct {
	Title        string    `gorm:"size:1024;not null" json:"title"`
	Completed    bool      `gorm:"not null" json:"completed"`
	CollectionId uint      `gorm:"column:collection_id;not null" json:"collectionId"`
	Difficulty   int       `gorm:"default:1;not null" json:"difficulty"`
	Order        int       `gorm:"column:d_order;default:1;not null" json:"order"`
	Link         string    `gorm:"size:1024" json:"link"`
	Draft        int       `gorm:"default:0;not null" json:"draft"`
	Schedule     time.Time `gorm:"default:NULL" json:"schedule"`
	// CreatorId is inherited from MetaField
}

const (
	Todo_Table        = "d_todo"
	Todo_Completed    = "completed"
	Todo_CollectionId = "collection_id"
	Todo_Link         = "link"
)

const PageSize = 6

func (e *Todo) TableName() string {
	return Todo_Table
}

func (e *Todo) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&e)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find todo with id %d", e.ID)
	}
	return nil
}

func ListTodos(db *gorm.DB, where map[string]any) ([]Todo, error) {
	todos := make([]Todo, 0)
	if err := db.Where(where).
		Order("d_order DESC").
		Find(&todos).Error; err != nil {
		return nil, err
	}
	return todos, nil
}

func (e *Todo) Create(db *gorm.DB) error {
	return db.Create(e).Error
}

func (e *Todo) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(e).Error
}

func (e *Todo) Delete(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Delete(e).Error
}

func UnsetLink(db *gorm.DB, where map[string]any) error {
	if err := db.Model(&Todo{}).Where(where).Update(Todo_Link, "").Error; err != nil {
		return err
	}
	return nil
}

func MaxOrder(db *gorm.DB, where map[string]any) (int64, error) {
	var maxOrder int64
	if err := db.Model(&Todo{}).Where(where).Select("MAX(d_order)").Scan(&maxOrder).Error; err != nil {
		return 0, err
	}
	return maxOrder, nil
}

func CountTodos(db *gorm.DB, where map[string]any) (int64, error) {
	var count int64
	if err := db.Model(&Todo{}).Where(where).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func FindTodos(db *gorm.DB, where map[string]any, page uint) ([]*Todo, bool, error) {
	if page < 1 {
		return nil, false, errors.New("page number must be greater than 0")
	}
	todos := make([]*Todo, 0, PageSize+1)
	offset := (page - 1) * PageSize

	// Retrieve one extra to check if there are more todos
	if err := db.Where(where).
		Order("created_at DESC").
		Offset(int(offset)).
		Limit(PageSize + 1).
		Find(&todos).Error; err != nil {
		return nil, false, err
	}

	hasMore := false
	if len(todos) > PageSize {
		hasMore = true
		todos = todos[:PageSize]
	}

	return todos, hasMore, nil
}
