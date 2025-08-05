package collection

import (
	"time"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) PlanToday(c *gin.Context, req *PlanTodayRequest) *PlanTodayResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Todo_Completed, false)
	// Convert []uint to []any
	ids := make([]any, len(req.Ids))
	for i, id := range req.Ids {
		ids[i] = id
	}
	m.In(model.Id, ids)

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	err := model.UpdateSchedule(config.DB, model.NewNullTime(startOfDay), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &PlanTodayResponse{}
}

type PlanTodayRequest struct {
	Ids []uint `json:"ids"`
}

type PlanTodayResponse struct {
}
