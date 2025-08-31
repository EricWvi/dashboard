package watch

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListWatches(c *gin.Context, req *ListWatchesRequest) *ListWatchesResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Watch_Status, req.Status)

	watches, err := model.ListWatches(config.DB.WithContext(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListWatchesResponse{
		Watches: watches,
	}
}

type ListWatchesRequest struct {
	Status string `form:"status"`
}

type ListWatchesResponse struct {
	Watches []model.Watch `json:"watches"`
}
