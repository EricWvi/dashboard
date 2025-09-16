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

	err := entry.Create(config.ContextDB(c))
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateEntryResponse{
		Id: entry.ID,
	}
}

type CreateEntryRequest struct {
	model.EntryField
}

type CreateEntryResponse struct {
	Id uint `json:"id"`
}
