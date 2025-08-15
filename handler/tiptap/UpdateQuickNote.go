package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateQuickNote(c *gin.Context, req *UpdateQuickNoteRequest) *UpdateQuickNoteResponse {
	QuickNote := &model.QuickNote{
		QuickNoteField: req.QuickNoteField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := QuickNote.Update(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateQuickNoteResponse{}
}

type UpdateQuickNoteRequest struct {
	Id uint `json:"id"`
	model.QuickNoteField
}

type UpdateQuickNoteResponse struct {
}
