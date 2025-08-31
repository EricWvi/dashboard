package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListTodos(c *gin.Context, req *ListTodosRequest) *ListTodosResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Todo_CollectionId, req.CollectionId) // Filter by collection ID
	m.Eq(model.Todo_Completed, false)               // Only list incomplete todos

	todos, err := model.ListTodos(config.DB.WithContext(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListTodosResponse{
		Todos: todos,
	}
}

type ListTodosRequest struct {
	CollectionId uint `form:"collectionId"`
}

type ListTodosResponse struct {
	Todos []model.Todo `json:"todos"`
}
