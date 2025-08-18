package user

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateEmailToken(c *gin.Context, req *UpdateEmailTokenRequest) *UpdateEmailTokenResponse {
	encryptedToken, err := service.Encrypt(service.Key(), req.EmailToken)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	user := &model.User{
		EmailToken: encryptedToken,
		EmailFeed:  req.EmailFeed,
	}
	m := model.WhereMap{}
	m.Eq(model.Id, middleware.GetUserId(c))

	if err := user.Update(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateEmailTokenResponse{}
}

type UpdateEmailTokenRequest struct {
	EmailToken string `json:"emailToken"`
	EmailFeed  string `json:"emailFeed"`
}

type UpdateEmailTokenResponse struct {
}
