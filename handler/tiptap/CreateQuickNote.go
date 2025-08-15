package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateQuickNote(c *gin.Context, req *CreateQuickNoteRequest) *CreateQuickNoteResponse {
	QuickNote := &model.QuickNote{}
	QuickNote.CreatorId = middleware.GetUserId(c)
	QuickNote.QuickNoteField = req.QuickNoteField

	if err := QuickNote.Create(config.DB); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateQuickNoteResponse{
		Id: QuickNote.ID,
	}
}

type CreateQuickNoteRequest struct {
	model.QuickNoteField
}

type CreateQuickNoteResponse struct {
	Id uint `json:"id"`
}
