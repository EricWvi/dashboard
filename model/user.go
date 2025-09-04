package model

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	UserField
	Email      string `gorm:"size:100;uniqueIndex;not null"`
	RssToken   string `gorm:"column:rss_token;size:255" json:"rssToken"`
	EmailToken string `gorm:"column:email_token;size:255" json:"emailToken"`
	EmailFeed  string `gorm:"column:email_feed;size:255" json:"emailFeed"`
}

type UserField struct {
	Avatar   string `gorm:"size:1024" json:"avatar"`
	Language string `gorm:"column:language;size:10;default:'zh-CN';not null" json:"language"`
	Username string `gorm:"size:1024" json:"username"`
}

const (
	User_Table      = "d_user"
	User_Email      = "email"
	User_Avatar     = "avatar"
	User_Username   = "username"
	User_RssToken   = "rss_token"
	User_EmailToken = "email_token"
	User_EmailFeed  = "email_feed"
)

func (u *User) TableName() string {
	return User_Table
}

func CreateEmailToIDMap(db *gorm.DB) (map[string]uint, error) {
	var users []User

	if err := db.Select(Id, User_Email).Find(&users).Error; err != nil {
		return nil, errors.New("failed to fetch users: " + err.Error())
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
		return fmt.Errorf("can not find user")
	}
	return nil
}

func GetRssToken(db *gorm.DB, where map[string]any) (string, error) {
	token := make([]string, 0)
	if err := db.Model(&User{}).Where(where).Pluck(User_RssToken, &token).Error; err != nil {
		return "", errors.New("failed to get rss token: " + err.Error())
	}
	if len(token) == 0 {
		return "", nil
	}
	return token[0], nil
}

func CreateUser(db *gorm.DB, email string) (uint, error) {
	user := User{Email: email}
	if err := db.Create(&user).Error; err != nil {
		return 0, errors.New("failed to create user: " + err.Error())
	}
	return user.ID, nil
}

func (u *User) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(u).Error
}
