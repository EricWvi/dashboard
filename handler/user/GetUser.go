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

	if err := user.Get(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetUserResponse{
		Avatar:   user.Avatar,
		Username: user.Username,
	}
}

type GetUserRequest struct {
	Id uint `json:"id"`
}

type GetUserResponse struct {
	Avatar   string `json:"avatar"`
	Username string `json:"username"`
}
