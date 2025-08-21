package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) BottomQuickNote(c *gin.Context, req *BottomQuickNoteRequest) *BottomQuickNoteResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	minOrder, err := model.MinNoteOrder(config.DB, m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	quickNote := &model.QuickNote{}
	quickNote.Order = min(minOrder-1, -1)

	u := model.WhereMap{}
	u.Eq(model.CreatorId, middleware.GetUserId(c))
	u.Eq(model.Id, req.Id)
	if err = quickNote.Update(config.DB, u); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &BottomQuickNoteResponse{}
}

type BottomQuickNoteRequest struct {
	Id uint `json:"id"`
}

type BottomQuickNoteResponse struct {
}
