package collection

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListToday(c *gin.Context, req *ListTodayRequest) *ListTodayResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	todos, err := model.ListToday(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListTodayResponse{
		Todos: todos,
	}
}

type ListTodayRequest struct {
}

type ListTodayResponse struct {
	Todos []model.Todo `json:"todos"`
}
