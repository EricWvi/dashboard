package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ClickBookmark(c *gin.Context, req *ClickBookmarkRequest) *ClickBookmarkResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := model.ClickBookmark(config.DB.WithContext(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ClickBookmarkResponse{}
}

type ClickBookmarkRequest struct {
	Id uint `json:"id"`
}

type ClickBookmarkResponse struct {
}
