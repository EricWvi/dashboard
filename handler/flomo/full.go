package flomo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) FullSync(c *gin.Context, req *FullSyncRequest) *FullSyncResponse {
	userId := middleware.GetUserId(c)
	db := config.ContextDB(c)

	// Get full cards (not deleted)
	cards, err := model.FullCards(db, userId)
	if err != nil {
		handler.Errorf(c, "failed to get cards: %s", err.Error())
		return nil
	}

	// Get full folders (not deleted)
	folders, err := model.FullFolders(db, userId)
	if err != nil {
		handler.Errorf(c, "failed to get folders: %s", err.Error())
		return nil
	}

	// Get full tiptap v2 for SiteFlomo (not deleted)
	tiptaps, err := model.FullTiptapV2(db, userId, model.SiteFlomo)
	if err != nil {
		handler.Errorf(c, "failed to get tiptaps: %s", err.Error())
		return nil
	}

	return &FullSyncResponse{
		Card:   cards,
		Folder: folders,
		Tiptap: tiptaps,
	}
}

type FullSyncRequest struct {
}

type FullSyncResponse struct {
	Card   []model.Card     `json:"card"`
	Folder []model.Folder   `json:"folder"`
	Tiptap []model.TiptapV2 `json:"tiptap"`
}
