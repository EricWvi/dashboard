package model

import (
	"fmt"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Email string `gorm:"size:100;uniqueIndex;not null"`
}

func (u *User) TableName() string {
	return "d_user"
}

func CreateEmailToIDMap(db *gorm.DB) (map[string]uint, error) {
	var users []User

	if err := db.Find(&users).Error; err != nil {
		log.Errorf("failed to fetch users: %s", err)
		return nil, err
	}

	emailToID := make(map[string]uint, len(users))
	for _, user := range users {
		emailToID[user.Email] = user.ID
	}

	return emailToID, nil
}

func (u *User) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&u)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find user with id %d", u.ID)
	}
	return nil
}
