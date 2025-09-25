package pomodoro

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) DeletePomodoro(c *gin.Context, req *DeletePomodoroRequest) *DeletePomodoroResponse {
	pomodoro := &model.Pomodoro{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := pomodoro.Delete(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeletePomodoroResponse{}
}

type DeletePomodoroRequest struct {
	Id uint `json:"id"`
}

type DeletePomodoroResponse struct {
}