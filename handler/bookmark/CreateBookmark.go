package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateBookmark(c *gin.Context, req *CreateBookmarkRequest) *CreateBookmarkResponse {
	bookmark := &model.Bookmark{}
	bookmark.CreatorId = middleware.GetUserId(c)
	bookmark.BookmarkField = req.BookmarkField

	if err := bookmark.Create(config.ContextDB(c)); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateBookmarkResponse{}
}

type CreateBookmarkRequest struct {
	model.BookmarkField
}

type CreateBookmarkResponse struct {
}
