package user

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetUser(c *gin.Context, req *GetUserRequest) *GetUserResponse {
	user := &model.User{}
	m := model.WhereMap{}
	m.Eq(model.Id, middleware.GetUserId(c))

	if err := user.Get(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetUserResponse{
		Avatar:        user.Avatar,
		Username:      user.Username,
		EmailFeed:     user.EmailFeed,
		HasRssToken:   string(user.RssToken) != "",
		HasEmailToken: string(user.EmailToken) != "",
		Language:      user.Language,
	}
}

type GetUserRequest struct {
}

type GetUserResponse struct {
	Avatar        string `json:"avatar"`
	Username      string `json:"username"`
	EmailFeed     string `json:"emailFeed"`
	HasRssToken   bool   `json:"hasRssToken"`
	HasEmailToken bool   `json:"hasEmailToken"`
	Language      string `json:"language"`
}
