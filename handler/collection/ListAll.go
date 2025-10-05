package collection

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListAll(c *gin.Context, req *ListAllRequest) *ListAllResponse {
	m := model.WhereExpr{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Todo_Completed, false) // Only list incomplete todos
	m.Ne(model.Todo_CollectionId, 0)  // Exclude todos in Inbox
	m.Raw(model.Todo_Schedule+" IS NULL OR "+
		model.Todo_Schedule+" < ?", "2096-10-02") // Exclude no plan todos

	todos, err := model.ListPlanTodos(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListAllResponse{
		Todos: todos,
	}
}

type ListAllRequest struct {
	CollectionId uint `form:"collectionId"`
}

type ListAllResponse struct {
	Todos []model.Todo `json:"todos"`
}
