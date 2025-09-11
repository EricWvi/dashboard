package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetEntries(c *gin.Context, req *GetEntriesRequest) *GetEntriesResponse {
	entries, hasMore, err := model.FindEntries(config.ContextDB(c), gin.H{
		model.Entry_CreatorId: middleware.GetUserId(c),
	}, req.Page)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetEntriesResponse{
		entries,
		hasMore,
	}
}

type GetEntriesRequest struct {
	Page uint `form:"page"`
}

type GetEntriesResponse struct {
	Entries []*model.Entry `json:"entries"`
	HasMore bool           `json:"hasMore"`
}
