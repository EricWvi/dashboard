package pomodoro

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

	pomodoros, err := model.ListTodayPomodoros(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListTodayResponse{
		Pomodoros: pomodoros,
	}
}

type ListTodayRequest struct {
}

type ListTodayResponse struct {
	Pomodoros []model.Pomodoro `json:"pomodoros"`
}
