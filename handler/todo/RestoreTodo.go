package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) RestoreTodo(c *gin.Context, req *RestoreTodoRequest) *RestoreTodoResponse {
	todo := &model.Todo{}
	todo.Completed = false
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)
	maxOrder, err := model.MaxOrder(config.DB.WithContext(c), model.WhereMap{
		model.CreatorId:         middleware.GetUserId(c),
		model.Todo_CollectionId: req.CollectionId,
	})
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	todo.Order = maxOrder + 1

	if err = todo.Restore(config.DB.WithContext(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &RestoreTodoResponse{}
}

type RestoreTodoRequest struct {
	Id           uint `json:"id"`
	CollectionId uint `json:"collectionId"`
}

type RestoreTodoResponse struct {
}
