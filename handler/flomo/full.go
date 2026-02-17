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
	serverVersion := int64(1) // prevent request binding error when client sends 0 as serverVersion

	// Get full cards (not deleted)
	cards, err := model.FullCards(db, userId)
	if err != nil {
		handler.Errorf(c, "failed to get cards: %s", err.Error())
		return nil
	}
	for i := range cards {
		if cards[i].ServerVersion > serverVersion {
			serverVersion = cards[i].ServerVersion
		}
	}

	// Get full folders (not deleted)
	folders, err := model.FullFolders(db, userId)
	if err != nil {
		handler.Errorf(c, "failed to get folders: %s", err.Error())
		return nil
	}
	for i := range folders {
		if folders[i].ServerVersion > serverVersion {
			serverVersion = folders[i].ServerVersion
		}
	}

	// Get full tiptap v2 for SiteFlomo (not deleted)
	tiptaps, err := model.FullTiptapV2(db, userId, model.SiteFlomo)
	if err != nil {
		handler.Errorf(c, "failed to get tiptaps: %s", err.Error())
		return nil
	}
	for i := range tiptaps {
		if tiptaps[i].ServerVersion > serverVersion {
			serverVersion = tiptaps[i].ServerVersion
		}
	}

	return &FullSyncResponse{
		ServerVersion: serverVersion,
		Card:          cards,
		Folder:        folders,
		Tiptap:        tiptaps,
	}
}

type FullSyncRequest struct {
}

type FullSyncResponse struct {
	ServerVersion int64            `json:"serverVersion"`
	Card          []model.Card     `json:"card"`
	Folder        []model.Folder   `json:"folder"`
	Tiptap        []model.TiptapV2 `json:"tiptap"`
}
