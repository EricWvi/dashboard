package watch

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetWatch(c *gin.Context, req *GetWatchRequest) *GetWatchResponse {
	watch := &model.Watch{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := watch.Get(config.DB.WithContext(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetWatchResponse{
		Watch: *watch,
	}
}

type GetWatchRequest struct {
	Id uint `form:"id"`
}

type GetWatchResponse struct {
	model.Watch
}
