package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateBookmark(c *gin.Context, req *UpdateBookmarkRequest) *UpdateBookmarkResponse {
	bookmark := &model.Bookmark{
		BookmarkField: req.BookmarkField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := bookmark.Update(config.DB.WithContext(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateBookmarkResponse{}
}

type UpdateBookmarkRequest struct {
	Id uint `json:"id"`
	model.BookmarkField
}

type UpdateBookmarkResponse struct {
}
