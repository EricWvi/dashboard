package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetCard(c *gin.Context, req *GetCardRequest) *GetCardResponse {
	card := &model.Card{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := card.Get(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetCardResponse{
		Card: *card,
	}
}

type GetCardRequest struct {
	Id uint `form:"id"`
}

type GetCardResponse struct {
	model.Card
}
