package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ClearTodos(c *gin.Context, req *ClearTodosRequest) *ClearTodosResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Todo_CollectionId, req.CollectionId) // Filter by collection ID

	if err := model.DeleteCompleted(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ClearTodosResponse{}
}

type ClearTodosRequest struct {
	CollectionId uint `form:"collectionId"`
}

type ClearTodosResponse struct {
}
