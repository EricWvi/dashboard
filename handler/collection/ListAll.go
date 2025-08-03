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

	todos, err := model.ListPlanTodos(config.DB, m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListAllResponse{
		Todos: todos,
	}
}

type ListAllTodoView struct {
	Id    uint   `json:"id"`
	Title string `json:"title"`
}

type ListAllRequest struct {
	CollectionId uint `json:"collectionId"`
}

type ListAllResponse struct {
	Todos []model.Todo `json:"todos"`
}
