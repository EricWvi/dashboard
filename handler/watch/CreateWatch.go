package watch

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateWatch(c *gin.Context, req *CreateWatchRequest) *CreateWatchResponse {
	watch := &model.Watch{}
	watch.CreatorId = middleware.GetUserId(c)
	watch.WatchField = req.WatchField

	if err := watch.Create(config.ContextDB(c), req.CreatedAt); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateWatchResponse{
		Id: watch.ID,
	}
}

type CreateWatchRequest struct {
	CreatedAt model.NullTime `json:"createdAt"`
	model.WatchField
}

type CreateWatchResponse struct {
	Id uint `json:"id"`
}
