package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListQuickNotes(c *gin.Context, req *ListQuickNotesRequest) *ListQuickNotesResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	quicknotes, err := model.ListQuickNotes(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListQuickNotesResponse{
		QuickNotes: quicknotes,
	}
}

type ListQuickNotesRequest struct {
}

type ListQuickNotesResponse struct {
	QuickNotes []model.QuickNote `json:"quickNotes"`
}
