package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetTodo(c *gin.Context, req *GetTodoRequest) *GetTodoResponse {
	todo := &model.Todo{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := todo.Get(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetTodoResponse{
		*todo,
	}
}

type GetTodoRequest struct {
	Id uint `json:"id"`
}

type GetTodoResponse struct {
	model.Todo
}
