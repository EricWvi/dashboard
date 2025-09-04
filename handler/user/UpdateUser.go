package user

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateUser(c *gin.Context, req *UpdateUserRequest) *UpdateUserResponse {
	user := &model.User{}
	user.UserField = req.UserField
	m := model.WhereMap{}
	m.Eq(model.Id, middleware.GetUserId(c))

	if err := user.Update(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateUserResponse{}
}

type UpdateUserRequest struct {
	model.UserField
}

type UpdateUserResponse struct {
}
