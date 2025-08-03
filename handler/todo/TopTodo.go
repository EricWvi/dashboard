package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) TopTodo(c *gin.Context, req *TopTodoRequest) *TopTodoResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Todo_CollectionId, req.CollectionId)
	maxOrder, err := model.MaxOrder(config.DB, m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	todo := &model.Todo{}
	todo.Order = maxOrder + 1

	u := model.WhereMap{}
	u.Eq(model.CreatorId, middleware.GetUserId(c))
	u.Eq(model.Id, req.Id)
	if err = todo.Update(config.DB, u); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &TopTodoResponse{}
}

type TopTodoRequest struct {
	Id           uint `json:"id"`
	CollectionId uint `json:"collectionId"`
}

type TopTodoResponse struct {
}
