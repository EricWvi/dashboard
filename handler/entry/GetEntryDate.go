package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetEntryDate(c *gin.Context, req *GetEntryDateRequest) *GetEntryDateResponse {
	dates, err := model.FindDates(config.ContextDB(c), gin.H{
		model.Entry_CreatorId: middleware.GetUserId(c),
	})
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
