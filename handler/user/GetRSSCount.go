package user

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
)

func (b Base) GetRSSCount(c *gin.Context, req *GetRSSCountRequest) *GetRSSCountResponse {
	m := model.WhereMap{}
	m.Eq(model.Id, middleware.GetUserId(c))
	count := 0

	tokenField := model.GetRssToken(config.DB, m)
	if tokenField != "" {
		token, err := service.Decrypt(service.Key(), tokenField)
		if err == nil {
			count = service.MinifluxUnreadCount(token)
		}
	}

	return &GetRSSCountResponse{
		Count: count,
	}
}

type GetRSSCountRequest struct {
}

type GetRSSCountResponse struct {
	Count int `json:"count"`
}
