package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetBookmark(c *gin.Context, req *GetBookmarkRequest) *GetBookmarkResponse {
	bookmark := &model.BookmarkView{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := bookmark.Get(config.DB.WithContext(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetBookmarkResponse{
		BookmarkView: *bookmark,
	}
}

type GetBookmarkRequest struct {
	Id uint `json:"id"`
}

type GetBookmarkResponse struct {
	model.BookmarkView
}
