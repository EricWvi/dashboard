package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateEntry(c *gin.Context, req *CreateEntryRequest) *CreateEntryResponse {
	entry := &model.Entry{}
	entry.CreatorId = middleware.GetUserId(c)
	entry.EntryField = req.EntryField

	tiptap := &model.Tiptap{}
	tiptap.CreatorId = middleware.GetUserId(c)
	if err := tiptap.Create(config.ContextDB(c)); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	entry.Draft = int(tiptap.ID)

	err := entry.Create(config.ContextDB(c))
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateEntryResponse{
		Draft: entry.Draft,
	}
}

type CreateEntryRequest struct {
	model.EntryField
}

type CreateEntryResponse struct {
	Draft int `json:"draft"`
}
