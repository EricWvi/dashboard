package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) MoveTodo(c *gin.Context, req *MoveTodoRequest) *MoveTodoResponse {
	todo := &model.Todo{}
	todo.CollectionId = req.Dst

	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)
	maxOrder, err := model.MaxOrder(config.ContextDB(c), model.WhereMap{
		model.CreatorId:         middleware.GetUserId(c),
		model.Todo_CollectionId: req.Dst,
	})
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	todo.Order = maxOrder + 1

	if err = todo.Update(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &MoveTodoResponse{}
}

type MoveTodoRequest struct {
	Id  uint `json:"id"`
	Dst uint `json:"dst"`
}

type MoveTodoResponse struct {
}
