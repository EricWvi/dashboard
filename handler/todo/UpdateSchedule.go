package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateSchedule(c *gin.Context, req *UpdateScheduleRequest) *UpdateScheduleResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := model.UpdateSchedule(config.DB.WithContext(c), req.Schedule, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateScheduleResponse{}
}

type UpdateScheduleRequest struct {
	Id       uint           `json:"id"`
	Schedule model.NullTime `json:"schedule"`
}

type UpdateScheduleResponse struct {
}
