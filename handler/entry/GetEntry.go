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
	err := e.Get(config.ContextDB(c), gin.H{
		model.Entry_CreatorId: middleware.GetUserId(c),
		model.Entry_Id:        req.Id,
	})
	if err != nil {
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
