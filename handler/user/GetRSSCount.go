package user

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
)

func (b Base) GetRSSCount(c *gin.Context, req *GetRSSCountRequest) *GetRSSCountResponse {
	m := model.WhereMap{}
	m.Eq(model.Id, middleware.GetUserId(c))
	count := 0

	tokenField, err := model.GetRssToken(config.ContextDB(c), m)
	if err != nil {
		log.Error(c, err.Error())
	}
	if tokenField != "" {
		token, err := service.Decrypt(service.Key(), tokenField)
		if err == nil {
			count, err = service.MinifluxUnreadCount(token)
			if err != nil {
				log.Error(c, err.Error())
			}
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
