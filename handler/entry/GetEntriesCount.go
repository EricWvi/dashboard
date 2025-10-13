package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetEntriesCount(c *gin.Context, req *GetEntriesCountRequest) *GetEntriesCountResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq("year", req.Year)

	count, err := model.CountEntries(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetEntriesCountResponse{
		Count: count,
	}
}

type GetEntriesCountRequest struct {
	Year int `form:"year"`
}

type GetEntriesCountResponse struct {
	Count int64 `json:"count"`
}
