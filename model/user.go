package model

import (
	"fmt"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Email      string `gorm:"size:100;uniqueIndex;not null"`
	Avatar     string `gorm:"size:1024" json:"avatar"`
	Username   string `gorm:"size:1024" json:"username"`
	RssToken   string `gorm:"column:rss_token;size:255" json:"rssToken"`
	EmailToken string `gorm:"column:email_token;size:255" json:"emailToken"`
	EmailFeed  string `gorm:"column:email_feed;size:255" json:"emailFeed"`
	Language   string `gorm:"column:language;size:10;default:'zh-CN';not null" json:"language"`
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

func GetRssToken(db *gorm.DB, where map[string]any) string {
	token := make([]string, 0)
	if err := db.Model(&User{}).Where(where).Pluck(User_RssToken, &token).Error; err != nil {
		log.Errorf("failed to get rss token: %s", err)
		return ""
	}
	if len(token) == 0 {
		return ""
	}
	return token[0]
}

func CreateUser(db *gorm.DB, email string) uint {
	user := User{Email: email}
	if err := db.Create(&user).Error; err != nil {
		log.Errorf("failed to create user: %s", err)
		return 0
	}
	return user.ID
}

func (u *User) Update(db *gorm.DB, where map[string]any) error {
	return db.Where(where).Updates(u).Error
}
