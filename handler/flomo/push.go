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
	for i := range req.Card {
		req.Card[i].CreatorId = userId

		// Check if card exists
		existing := &model.Card{}
		where := model.WhereMap{}
		where.Eq(model.Id, req.Card[i].Id)
		where.Eq(model.CreatorId, userId)
		err := existing.Get(db, where)

		if err != nil {
			// Card doesn't exist, create it
			if err := req.Card[i].Create(db); err != nil {
				handler.Errorf(c, "failed to create card: %s", err.Error())
				return nil
			}
		} else {
			// Card exists, update it
			if err := req.Card[i].Update(db, where); err != nil {
				handler.Errorf(c, "failed to update card: %s", err.Error())
				return nil
			}
		}
	}

	// Process folders
	for i := range req.Folder {
		req.Folder[i].CreatorId = userId

		// Check if folder exists
		existing := &model.Folder{}
		where := model.WhereMap{}
		where.Eq(model.Id, req.Folder[i].Id)
		where.Eq(model.CreatorId, userId)
		err := existing.Get(db, where)

		if err != nil {
			// Folder doesn't exist, create it
			if err := req.Folder[i].Create(db); err != nil {
				handler.Errorf(c, "failed to create folder: %s", err.Error())
				return nil
			}
		} else {
			// Folder exists, update it
			if err := req.Folder[i].Update(db, where); err != nil {
				handler.Errorf(c, "failed to update folder: %s", err.Error())
				return nil
			}
		}
	}

	// Process tiptaps
	for i := range req.Tiptap {
		req.Tiptap[i].CreatorId = userId
		req.Tiptap[i].Site = model.SiteFlomo

		// Check if tiptap exists
		existing := &model.TiptapV2{}
		where := model.WhereMap{}
		where.Eq(model.Id, req.Tiptap[i].Id)
		where.Eq(model.CreatorId, userId)
		err := existing.Get(db, where)

		if err != nil {
			// Tiptap doesn't exist, create it
			if err := req.Tiptap[i].Create(db); err != nil {
				handler.Errorf(c, "failed to create tiptap: %s", err.Error())
				return nil
			}
		} else {
			// Tiptap exists, update it
			if err := req.Tiptap[i].Update(db, where); err != nil {
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
