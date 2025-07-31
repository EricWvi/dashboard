package todo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UnsetLink(c *gin.Context, req *UnsetLinkRequest) *UnsetLinkResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := model.UnsetLink(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UnsetLinkResponse{}
}

type UnsetLinkRequest struct {
	Id uint `json:"id"`
}

type UnsetLinkResponse struct {
}
