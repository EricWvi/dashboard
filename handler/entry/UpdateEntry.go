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
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := entry.Update(config.ContextDB(c), m); err != nil {
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
