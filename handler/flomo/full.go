package flomo

import (
	"sync"

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

	var wg sync.WaitGroup
	var users []model.UserV2View
	var cards []model.Card
	var folders []model.Folder
	var tiptaps []model.TiptapV2
	var fetchErr error

	// Fetch users in parallel
	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.FullUsers(db, userId)
		if err != nil {
			fetchErr = err
			return
		}
		users = result
	}()

	// Fetch cards in parallel
	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.FullCards(db, userId)
		if err != nil {
			fetchErr = err
			return
		}
		cards = result
	}()

	// Fetch folders in parallel
	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.FullFolders(db, userId)
		if err != nil {
			fetchErr = err
			return
		}
		folders = result
	}()

	// Fetch tiptaps in parallel
	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.FullTiptapV2(db, userId, model.SiteFlomo)
		if err != nil {
			fetchErr = err
			return
		}
		tiptaps = result
	}()

	wg.Wait()

	if fetchErr != nil {
		handler.Errorf(c, "failed to fetch data: %s", fetchErr.Error())
		return nil
	}

	// Calculate max server version
	for i := range users {
		if users[i].ServerVersion > serverVersion {
			serverVersion = users[i].ServerVersion
		}
	}
	for i := range cards {
		if cards[i].ServerVersion > serverVersion {
			serverVersion = cards[i].ServerVersion
		}
	}
	for i := range folders {
		if folders[i].ServerVersion > serverVersion {
			serverVersion = folders[i].ServerVersion
		}
	}
	for i := range tiptaps {
		if tiptaps[i].ServerVersion > serverVersion {
			serverVersion = tiptaps[i].ServerVersion
		}
	}

	return &FullSyncResponse{
		ServerVersion: serverVersion,
		User:          users,
		Card:          cards,
		Folder:        folders,
		Tiptap:        tiptaps,
	}
}

type FullSyncRequest struct {
}

type FullSyncResponse struct {
	ServerVersion int64              `json:"serverVersion"`
	User          []model.UserV2View `json:"user"`
	Card          []model.Card       `json:"card"`
	Folder        []model.Folder     `json:"folder"`
	Tiptap        []model.TiptapV2   `json:"tiptap"`
}
