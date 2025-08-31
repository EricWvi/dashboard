package user

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) SignUp(c *gin.Context, req *SignUpRequest) *SignUpResponse {
	user := &model.User{}
	user.Avatar = req.Avatar
	user.Username = req.Username
	m := model.WhereMap{}
	m.Eq(model.Id, middleware.GetUserId(c))

	if err := user.Update(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &SignUpResponse{}
}

type SignUpRequest struct {
	Avatar   string `json:"avatar"`
	Username string `json:"username"`
}

type SignUpResponse struct {
}
