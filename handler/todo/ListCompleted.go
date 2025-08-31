package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListCompleted(c *gin.Context, req *ListCompletedRequest) *ListCompletedResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Todo_CollectionId, req.CollectionId) // Filter by collection ID

	todos, err := model.ListCompleted(config.DB.WithContext(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListCompletedResponse{
		Todos: todos,
	}
}

type ListCompletedRequest struct {
	CollectionId uint `form:"collectionId"`
}

type ListCompletedResponse struct {
	Todos []model.Todo `json:"todos"`
}
