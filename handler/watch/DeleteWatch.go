package watch

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) DeleteWatch(c *gin.Context, req *DeleteWatchRequest) *DeleteWatchResponse {
	watch := &model.Watch{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := watch.Delete(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeleteWatchResponse{}
}

type DeleteWatchRequest struct {
	Id uint `json:"id"`
}

type DeleteWatchResponse struct {
}
