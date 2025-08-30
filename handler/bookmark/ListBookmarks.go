package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListBookmarks(c *gin.Context, req *ListBookmarksRequest) *ListBookmarksResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	bookmarks, err := model.ListBookmarks(config.DB.WithContext(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListBookmarksResponse{
		Bookmarks: bookmarks,
	}
}

type ListBookmarksRequest struct {
}

type ListBookmarksResponse struct {
	Bookmarks []model.BookmarkView `json:"bookmarks"`
}
