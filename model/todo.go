package model

import (
	"database/sql"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type Todo struct {
	MetaField
	TodoField
}

type TodoField struct {
	Title        string   `gorm:"size:1024;not null" json:"title"`
	Completed    bool     `gorm:"not null" json:"completed"`
	CollectionId uint     `gorm:"column:collection_id;not null" json:"collectionId"`
	Difficulty   int      `gorm:"default:-1;not null" json:"difficulty"`
	Order        int      `gorm:"column:d_order;default:1;not null" json:"order"`
	Link         string   `gorm:"size:1024" json:"link"`
	Draft        int      `gorm:"default:0;not null" json:"draft"`
	Kanban       int      `gorm:"default:0;not null" json:"kanban"`
	Schedule     NullTime `gorm:"default:NULL;<-:update" json:"schedule"`
	Done         bool     `gorm:"default:false;not null" json:"done"`
	Count        int      `gorm:"column:d_count;default:0;not null" json:"count"`
	// CreatorId is inherited from MetaField
}

const (
	Todo_Table        = "d_todo"
	Todo_Completed    = "completed"
	Todo_CollectionId = "collection_id"
	Todo_Link         = "link"
	Todo_Order        = "d_order"
	Todo_Schedule     = "schedule"
	Todo_Done         = "done"
	Todo_Count        = "d_count"
)

const todoPageSize = 6

func (e *Todo) TableName() string {
	return Todo_Table
}

func (e *Todo) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&e)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find todo")
	}
	return nil
}

func ListPlanTodos(db *gorm.DB, where WhereExpr) ([]Todo, error) {
	todos := make([]Todo, 0)
	for i := range where {
		db = db.Where(where[i])
	}
	if err := db.Find(&todos).Error; err != nil {
		return nil, err
	}
	return todos, nil
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

func ListTodayTodos(db *gorm.DB, where map[string]any) ([]Todo, error) {
	todos := make([]Todo, 0)
	if err := db.Where(where).Where(Todo_Completed, false).
		Where("schedule >= CURRENT_DATE").
		Where("schedule < CURRENT_DATE + INTERVAL '1 day'").
		Find(&todos).Error; err != nil {
		return nil, err
	}
	return todos, nil
}

func ListCompleted(db *gorm.DB, where map[string]any) ([]Todo, error) {
	todos := make([]Todo, 0)
	if err := db.Where(where).Where(Todo_Completed, true).
		Order("created_at DESC").
		Find(&todos).Error; err != nil {
		return nil, err
	}
	return todos, nil
}

func DeleteCompleted(db *gorm.DB, where map[string]any) error {
	if err := db.Where(where).Where(Todo_Completed, true).
		Delete(&Todo{}).Error; err != nil {
		return err
	}
	return nil
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

func (e *Todo) Restore(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Select(Todo_Order, Todo_Completed).Updates(e).Error
}

func DoneTodo(db *gorm.DB, where map[string]any) error {
	return db.Model(&Todo{}).Where(where).UpdateColumns(map[string]any{
		Todo_Done:  true,
		Todo_Count: gorm.Expr(Todo_Count+" + ?", 1),
	}).Error
}

func UndoneTodo(db *gorm.DB, where map[string]any) error {
	return db.Model(&Todo{}).Where(where).UpdateColumns(map[string]any{
		Todo_Done:  false,
		Todo_Count: gorm.Expr(Todo_Count+" - ?", 1),
	}).Error
}

func UpdateSchedule(db *gorm.DB, schedule NullTime, where map[string]any) error {
	return db.Model(&Todo{}).Where(where).UpdateColumns(map[string]any{
		Todo_Done:     false,
		Todo_Schedule: schedule,
	}).Error
}

func UnsetLink(db *gorm.DB, where map[string]any) error {
	if err := db.Model(&Todo{}).Where(where).Update(Todo_Link, "").Error; err != nil {
		return err
	}
	return nil
}

func MaxOrder(db *gorm.DB, where map[string]any) (int, error) {
	var maxOrder sql.NullInt32
	if err := db.Model(&Todo{}).Where(where).Where(Todo_Completed, false).Select("MAX(d_order)").Scan(&maxOrder).Error; err != nil {
		return 0, err
	}
	return int(maxOrder.Int32), nil
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
	todos := make([]*Todo, 0, todoPageSize+1)
	offset := (page - 1) * todoPageSize

	// Retrieve one extra to check if there are more todos
	if err := db.Where(where).
		Order("created_at DESC").
		Offset(int(offset)).
		Limit(todoPageSize + 1).
		Find(&todos).Error; err != nil {
		return nil, false, err
	}

	hasMore := false
	if len(todos) > todoPageSize {
		hasMore = true
		todos = todos[:todoPageSize]
	}

	return todos, hasMore, nil
}
