package echo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ToggleEchoMark(c *gin.Context, req *ToggleEchoMarkRequest) *ToggleEchoMarkResponse {
	echo := &model.Echo{}
	echo.Mark = req.Mark
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := echo.ToggleMark(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ToggleEchoMarkResponse{}
}

type ToggleEchoMarkRequest struct {
	Id   uint `json:"id"`
	Mark bool `json:"mark"`
}

type ToggleEchoMarkResponse struct {
}
