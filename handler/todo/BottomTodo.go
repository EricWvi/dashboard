package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) BottomTodo(c *gin.Context, req *BottomTodoRequest) *BottomTodoResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Todo_CollectionId, req.CollectionId)
	minOrder, err := model.MinOrder(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	todo := &model.Todo{}
	todo.Order = min(minOrder-1, -1)

	u := model.WhereMap{}
	u.Eq(model.CreatorId, middleware.GetUserId(c))
	u.Eq(model.Id, req.Id)
	if err = todo.Update(config.ContextDB(c), u); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &BottomTodoResponse{}
}

type BottomTodoRequest struct {
	Id           uint `json:"id"`
	CollectionId uint `json:"collectionId"`
}

type BottomTodoResponse struct {
}
