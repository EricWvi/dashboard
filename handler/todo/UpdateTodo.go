package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateTodo(c *gin.Context, req *UpdateTodoRequest) *UpdateTodoResponse {
	todo := &model.Todo{
		TodoField: req.TodoField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if req.Link == "unset" {
		if err := model.UnsetLink(config.DB, m); err != nil {
			handler.Errorf(c, "%s", err.Error())
			return nil
		}
	} else {
		if err := todo.Update(config.DB, m); err != nil {
			handler.Errorf(c, "%s", err.Error())
			return nil
		}
	}

	return &UpdateTodoResponse{}
}

type UpdateTodoRequest struct {
	Id uint `json:"id"`
	model.TodoField
}

type UpdateTodoResponse struct {
}
