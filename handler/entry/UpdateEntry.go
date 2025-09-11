package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateEntry(c *gin.Context, req *UpdateEntryRequest) *UpdateEntryResponse {
	entry := &model.Entry{
		EntryField: req.EntryField,
	}
	err := entry.Update(config.ContextDB(c), gin.H{
		model.Entry_CreatorId: middleware.GetUserId(c),
		model.Entry_Id:        req.Id,
	})
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateEntryResponse{}
}

type UpdateEntryRequest struct {
	Id uint `json:"id"`
	model.EntryField
}

type UpdateEntryResponse struct {
}
