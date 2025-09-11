package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetWordsCount(c *gin.Context, req *GetWordsCountRequest) *GetWordsCountResponse {
	count := model.CountAllWords(config.ContextDB(c), gin.H{
		model.Entry_CreatorId: middleware.GetUserId(c),
	})

	return &GetWordsCountResponse{
		Count: count,
	}
}

type GetWordsCountRequest struct {
}

type GetWordsCountResponse struct {
	Count int `json:"count"`
}
