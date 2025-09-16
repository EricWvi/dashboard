package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) DeleteEntry(c *gin.Context, req *DeleteEntryRequest) *DeleteEntryResponse {
	entry := &model.Entry{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := entry.Delete(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeleteEntryResponse{}
}

type DeleteEntryRequest struct {
	Id uint `json:"id"`
}

type DeleteEntryResponse struct {
}
