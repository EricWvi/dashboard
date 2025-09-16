package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetEntry(c *gin.Context, req *GetEntryRequest) *GetEntryResponse {
	e := &model.Entry{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := e.Get(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetEntryResponse{
		e,
	}
}

type GetEntryRequest struct {
	Id uint `form:"id"`
}

type GetEntryResponse struct {
	*model.Entry
}
