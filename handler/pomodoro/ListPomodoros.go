package pomodoro

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListPomodoros(c *gin.Context, req *ListPomodorosRequest) *ListPomodorosResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	pomodoros, err := model.ListPomodoros(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListPomodorosResponse{
		Pomodoros: pomodoros,
	}
}

type ListPomodorosRequest struct {
}

type ListPomodorosResponse struct {
	Pomodoros []model.Pomodoro `json:"pomodoros"`
}