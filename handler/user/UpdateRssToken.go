package user

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateRssToken(c *gin.Context, req *UpdateRssTokenRequest) *UpdateRssTokenResponse {
	encryptedToken, err := service.Encrypt(service.Key(), req.RssToken)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	user := &model.User{
		RssToken: encryptedToken,
	}
	m := model.WhereMap{}
	m.Eq(model.Id, middleware.GetUserId(c))

	if err := user.Update(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateRssTokenResponse{}
}

type UpdateRssTokenRequest struct {
	RssToken string `json:"rssToken"`
}

type UpdateRssTokenResponse struct {
}
