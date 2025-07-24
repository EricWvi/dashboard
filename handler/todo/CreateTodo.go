package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateTodo(c *gin.Context, req *CreateTodoRequest) *CreateTodoResponse {
	todo := &model.Todo{}
	todo.CreatorId = middleware.GetUserId(c)
	todo.TodoField = req.TodoField
	count, err := model.CountTodos(config.DB, model.WhereMap{
		model.CreatorId:         middleware.GetUserId(c),
		model.Todo_CollectionId: req.CollectionId,
	})
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	todo.Order = int(count) + 1

	err = todo.Create(config.DB)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateTodoResponse{}
}

type CreateTodoRequest struct {
	model.TodoField
}

type CreateTodoResponse struct {
}
