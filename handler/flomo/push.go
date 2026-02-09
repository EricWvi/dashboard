package flomo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) Push(c *gin.Context, req *PushRequest) *PushResponse {
	userId := middleware.GetUserId(c)
	db := config.ContextDB(c)

	// Process cards
	for _, card := range req.Card {
		card.CreatorId = userId
		
		// Check if card exists
		existing := &model.Card{}
		where := model.WhereMap{}
		where.Eq(model.Id, card.Id)
		err := existing.Get(db, where)
		
		if err != nil {
			// Card doesn't exist, create it
			if err := card.Create(db); err != nil {
				handler.Errorf(c, "failed to create card: %s", err.Error())
				return nil
			}
		} else {
			// Card exists, update it
			if err := card.Update(db, where); err != nil {
				handler.Errorf(c, "failed to update card: %s", err.Error())
				return nil
			}
		}
	}

	// Process folders
	for _, folder := range req.Folder {
		folder.CreatorId = userId
		
		// Check if folder exists
		existing := &model.Folder{}
		where := model.WhereMap{}
		where.Eq(model.Id, folder.Id)
		err := existing.Get(db, where)
		
		if err != nil {
			// Folder doesn't exist, create it
			if err := folder.Create(db); err != nil {
				handler.Errorf(c, "failed to create folder: %s", err.Error())
				return nil
			}
		} else {
			// Folder exists, update it
			if err := folder.Update(db, where); err != nil {
				handler.Errorf(c, "failed to update folder: %s", err.Error())
				return nil
			}
		}
	}

	// Process tiptaps
	for _, tiptap := range req.Tiptap {
		tiptap.CreatorId = userId
		tiptap.Site = model.SiteFlomo
		
		// Check if tiptap exists
		existing := &model.TiptapV2{}
		where := model.WhereMap{}
		where.Eq(model.Id, tiptap.Id)
		err := existing.Get(db, where)
		
		if err != nil {
			// Tiptap doesn't exist, create it
			if err := tiptap.Create(db); err != nil {
				handler.Errorf(c, "failed to create tiptap: %s", err.Error())
				return nil
			}
		} else {
			// Tiptap exists, update it
			if err := tiptap.Update(db, where); err != nil {
				handler.Errorf(c, "failed to update tiptap: %s", err.Error())
				return nil
			}
		}
	}

	return &PushResponse{
		Success: true,
	}
}

type PushRequest struct {
	Card   []model.Card     `json:"card"`
	Folder []model.Folder   `json:"folder"`
	Tiptap []model.TiptapV2 `json:"tiptap"`
}

type PushResponse struct {
	Success bool `json:"success"`
}
