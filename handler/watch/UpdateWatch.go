package watch

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateWatch(c *gin.Context, req *UpdateWatchRequest) *UpdateWatchResponse {
	watch := &model.Watch{
		WatchField: req.WatchField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := watch.Update(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateWatchResponse{}
}

type UpdateWatchRequest struct {
	Id uint `json:"id"`
	model.WatchField
}

type UpdateWatchResponse struct {
}
