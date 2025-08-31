package user

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
)

func (b Base) GetQQMailCount(c *gin.Context, req *GetQQMailCountRequest) *GetQQMailCountResponse {
	user := &model.User{}
	m := model.WhereMap{}
	m.Eq(model.Id, middleware.GetUserId(c))
	count := 0

	if err := user.Get(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	if user.EmailToken != "" && user.EmailFeed != "" {
		token, err := service.Decrypt(service.Key(), user.EmailToken)
		if err == nil {
			count, err = service.QQMailUnreadCount(user.EmailFeed, token)
			if err != nil {
				log.Error(c, err.Error())
			}
		}
	}

	return &GetQQMailCountResponse{
		Count: count,
	}
}

type GetQQMailCountRequest struct {
}

type GetQQMailCountResponse struct {
	Count int `json:"count"`
}
