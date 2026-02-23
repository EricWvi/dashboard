package model

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type UserV2 struct {
	Id         uint   `gorm:"primarykey"`
	RssToken   string `gorm:"column:rss_token;size:255" json:"rssToken"`
	EmailToken string `gorm:"column:email_token;size:255" json:"emailToken"`
	EmailFeed  string `gorm:"column:email_feed;size:255" json:"emailFeed"`
	UserV2View
}

type UserV2View struct {
	UpdatedAt     int64  `json:"updatedAt"`
	ServerVersion int64  `json:"serverVersion"`
	Avatar        string `gorm:"size:1024" json:"avatar"`
	Email         string `gorm:"size:100;uniqueIndex;not null" json:"email"`
	Username      string `gorm:"size:255" json:"username"`
	Language      string `gorm:"column:language;size:10;default:'zh-CN';not null" json:"language"`
}

const (
	UserV2_Table      = "d_user_v2"
	UserV2_Email      = "email"
	UserV2_Avatar     = "avatar"
	UserV2_Username   = "username"
	UserV2_RssToken   = "rss_token"
	UserV2_EmailToken = "email_token"
	UserV2_EmailFeed  = "email_feed"
)

func (u *UserV2) TableName() string {
	return UserV2_Table
}

func FullUsers(db *gorm.DB, creatorId uint) ([]UserV2View, error) {
	var users []UserV2View
	if err := db.Table(UserV2_Table).Where(Id, creatorId).Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func ListUserSince(db *gorm.DB, since int64, creatorId uint) ([]UserV2View, error) {
	var users []UserV2View

	whereExpr := WhereExpr{}
	whereExpr.GT(ServerVersion, since)
	whereExpr.Eq(Id, creatorId)
	for i := range whereExpr {
		db = db.Where(whereExpr[i])
	}

	if err := db.Table(UserV2_Table).Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func CreateEmailToIDMapV2(db *gorm.DB) (map[string]uint, error) {
	var users []UserV2

	if err := db.Select(Id, User_Email).Find(&users).Error; err != nil {
		return nil, errors.New("failed to fetch users: " + err.Error())
	}

	emailToID := make(map[string]uint, len(users))
	for _, user := range users {
		emailToID[user.Email] = user.Id
	}

	return emailToID, nil
}

func (u *UserV2) Get(db *gorm.DB, where map[string]any) error {
	rst := db.Where(where).Find(&u)
	if rst.Error != nil {
		return rst.Error
	}
	if rst.RowsAffected == 0 {
		return fmt.Errorf("can not find user")
	}
	return nil
}

func GetRssTokenV2(db *gorm.DB, where map[string]any) (string, error) {
	token := make([]string, 0)
	if err := db.Model(&UserV2{}).Where(where).Pluck(User_RssToken, &token).Error; err != nil {
		return "", errors.New("failed to get rss token: " + err.Error())
	}
	if len(token) == 0 {
		return "", nil
	}
	return token[0], nil
}

func CreateUserV2(db *gorm.DB, email string) (uint, error) {
	user := UserV2{}
	user.Email = email
	if err := db.Create(&user).Error; err != nil {
		return 0, errors.New("failed to create user: " + err.Error())
	}
	return user.Id, nil
}

func (u *UserV2) Update(db *gorm.DB, where WhereExpr) error {
	return db.Where(where).Updates(u).Error
}
