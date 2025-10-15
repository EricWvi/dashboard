package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UnbookmarkEntry(c *gin.Context, req *UnbookmarkEntryRequest) *UnbookmarkEntryResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := model.UnbookmarkEntry(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UnbookmarkEntryResponse{}
}

type UnbookmarkEntryRequest struct {
	Id uint `json:"id"`
}

type UnbookmarkEntryResponse struct {
}
