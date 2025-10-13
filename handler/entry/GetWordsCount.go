package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetWordsCount(c *gin.Context, req *GetWordsCountRequest) *GetWordsCountResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	count := model.CountAllWords(config.ContextDB(c), m)

	return &GetWordsCountResponse{
		Count: count,
	}
}

type GetWordsCountRequest struct {
}

type GetWordsCountResponse struct {
	Count int `json:"count"`
}
