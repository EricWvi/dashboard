package model

import (
	"database/sql"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

type MetaField struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"deletedAt"`
	CreatorId uint           `gorm:"column:creator_id;not null" json:"creatorId"`
}

type NullTime struct {
	sql.NullTime
}

func (nt NullTime) MarshalJSON() ([]byte, error) {
	if !nt.Valid {
		return json.Marshal(nil)
	}
	return json.Marshal(nt.Time)
}

func (nt *NullTime) UnmarshalJSON(b []byte) error {
	if string(b) == "null" {
		nt.Valid = false
		return nil
	}
	err := json.Unmarshal(b, &nt.Time)
	if err == nil {
		nt.Valid = true
	}
	return err
}

const (
	CreatorId = "creator_id"
	Id        = "id"
)

type WhereMap map[string]any

func (m WhereMap) Gt(key string, value any) {
	m[key+" >"] = value
}

func (m WhereMap) Gte(key string, value any) {
	m[key+" >="] = value
}

func (m WhereMap) Lt(key string, value any) {
	m[key+" <"] = value
}

func (m WhereMap) Lte(key string, value any) {
	m[key+" <="] = value
}

func (m WhereMap) Eq(key string, value any) {
	m[key] = value
}

func (m WhereMap) Ne(key string, value any) {
	m[key+" !="] = value
}

func (m WhereMap) Like(key string, value any) {
	m[key+" LIKE"] = value
}

func (m WhereMap) In(key string, values []any) {
	if len(values) == 0 {
		return
	}
	m[key+" IN"] = values
}

func (m WhereMap) NotIn(key string, values []any) {
	if len(values) == 0 {
		return
	}
	m[key+" NOT IN"] = values
}

func (m WhereMap) IsNull(key string) {
	m[key] = nil
}
