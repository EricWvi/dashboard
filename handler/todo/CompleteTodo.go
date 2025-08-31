package todo

import (
	"time"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CompleteTodo(c *gin.Context, req *CompleteTodoRequest) *CompleteTodoResponse {
	todo := &model.Todo{}
	todo.Completed = true
	todo.CreatedAt = time.Now()
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := todo.Update(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CompleteTodoResponse{}
}

type CompleteTodoRequest struct {
	Id uint `json:"id"`
}

type CompleteTodoResponse struct {
}
