package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UndoneTodo(c *gin.Context, req *UndoneTodoRequest) *UndoneTodoResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := model.UndoneTodo(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UndoneTodoResponse{}
}

type UndoneTodoRequest struct {
	Id uint `json:"id"`
}

type UndoneTodoResponse struct {
}
