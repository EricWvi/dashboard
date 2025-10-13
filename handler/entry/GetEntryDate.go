package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetEntryDate(c *gin.Context, req *GetEntryDateRequest) *GetEntryDateResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	dates, err := model.FindDates(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetEntryDateResponse{
		EntryDates: dates,
	}
}

type GetEntryDateRequest struct {
}

type GetEntryDateResponse struct {
	EntryDates []string `json:"entryDates"`
}
