package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateCard(c *gin.Context, req *UpdateCardRequest) *UpdateCardResponse {
	card := &model.Card{
		CardField: req.CardField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := card.Update(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateCardResponse{}
}

type UpdateCardRequest struct {
	Id uint `json:"id"`
	model.CardField
}

type UpdateCardResponse struct {
}
