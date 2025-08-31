package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) DeleteQuickNote(c *gin.Context, req *DeleteQuickNoteRequest) *DeleteQuickNoteResponse {
	quickNote := &model.QuickNote{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := quickNote.Delete(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeleteQuickNoteResponse{}
}

type DeleteQuickNoteRequest struct {
	Id uint `json:"id"`
}

type DeleteQuickNoteResponse struct {
}
