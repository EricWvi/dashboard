package pomodoro

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreatePomodoro(c *gin.Context, req *CreatePomodoroRequest) *CreatePomodoroResponse {
	pomodoro := &model.Pomodoro{}
	pomodoro.CreatorId = middleware.GetUserId(c)
	pomodoro.PomodoroField = req.PomodoroField

	if err := pomodoro.Create(config.ContextDB(c)); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreatePomodoroResponse{
		Id: pomodoro.ID,
	}
}

type CreatePomodoroRequest struct {
	model.PomodoroField
}

type CreatePomodoroResponse struct {
	Id uint `json:"id"`
}