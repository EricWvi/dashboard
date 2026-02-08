package flomo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) Pull(c *gin.Context, req *PullRequest) *PullResponse {
	userId := middleware.GetUserId(c)
	db := config.ContextDB(c)

	// Get cards with server_version > since
	cards, err := model.ListCardsSince(db, req.Since, userId)
	if err != nil {
		handler.Errorf(c, "failed to get cards: %s", err.Error())
		return nil
	}

	// Get folders with server_version > since
	folders, err := model.ListFoldersSince(db, req.Since, userId)
	if err != nil {
		handler.Errorf(c, "failed to get folders: %s", err.Error())
		return nil
	}

	// Get tiptap v2 for SiteFlomo with server_version > since
	tiptaps, err := model.ListTiptapV2Since(db, req.Since, userId, model.SiteFlomo)
	if err != nil {
		handler.Errorf(c, "failed to get tiptaps: %s", err.Error())
		return nil
	}

	return &PullResponse{
		Card:   cards,
		Folder: folders,
		Tiptap: tiptaps,
	}
}

type PullRequest struct {
	Since int64 `form:"since" binding:"required"`
}

type PullResponse struct {
	Card   []model.Card     `json:"card"`
	Folder []model.Folder   `json:"folder"`
	Tiptap []model.TiptapV2 `json:"tiptap"`
}
