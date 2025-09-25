package pomodoro

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdatePomodoro(c *gin.Context, req *UpdatePomodoroRequest) *UpdatePomodoroResponse {
	pomodoro := &model.Pomodoro{
		PomodoroField: req.PomodoroField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := pomodoro.Update(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdatePomodoroResponse{}
}

type UpdatePomodoroRequest struct {
	Id uint `json:"id"`
	model.PomodoroField
}

type UpdatePomodoroResponse struct {
}