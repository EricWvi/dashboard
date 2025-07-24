package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) DeleteTodo(c *gin.Context, req *DeleteTodoRequest) *DeleteTodoResponse {
	todo := &model.Todo{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	err := todo.Delete(config.DB, m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeleteTodoResponse{}
}

type DeleteTodoRequest struct {
	Id uint `json:"id"`
}

type DeleteTodoResponse struct {
}
