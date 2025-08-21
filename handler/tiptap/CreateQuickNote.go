package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateQuickNote(c *gin.Context, req *CreateQuickNoteRequest) *CreateQuickNoteResponse {
	quickNote := &model.QuickNote{}
	quickNote.CreatorId = middleware.GetUserId(c)
	quickNote.QuickNoteField = req.QuickNoteField
	maxOrder, err := model.MaxNoteOrder(config.DB, model.WhereMap{
		model.CreatorId: middleware.GetUserId(c),
	})
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	quickNote.Order = max(maxOrder+1, 1)

	if err := quickNote.Create(config.DB); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateQuickNoteResponse{
		Id: quickNote.ID,
	}
}

type CreateQuickNoteRequest struct {
	model.QuickNoteField
}

type CreateQuickNoteResponse struct {
	Id uint `json:"id"`
}
