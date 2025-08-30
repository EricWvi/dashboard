package echo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateEcho(c *gin.Context, req *CreateEchoRequest) *CreateEchoResponse {
	echo := &model.Echo{}
	echo.CreatorId = middleware.GetUserId(c)
	echo.EchoField = req.EchoField

	if err := echo.Create(config.DB.WithContext(c)); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateEchoResponse{
		Id: echo.ID,
	}
}

type CreateEchoRequest struct {
	model.EchoField
}

type CreateEchoResponse struct {
	Id uint `json:"id"`
}
