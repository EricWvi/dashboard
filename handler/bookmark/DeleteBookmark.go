package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) DeleteBookmark(c *gin.Context, req *DeleteBookmarkRequest) *DeleteBookmarkResponse {
	bookmark := &model.Bookmark{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := bookmark.Delete(config.DB.WithContext(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeleteBookmarkResponse{}
}

type DeleteBookmarkRequest struct {
	Id uint `json:"id"`
}

type DeleteBookmarkResponse struct {
}
