package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (b Base) CreateCard(c *gin.Context, req *CreateCardRequest) *CreateCardResponse {
	card := &model.Card{}
	card.CreatorId = middleware.GetUserId(c)
	card.CardField = req.CardField

	if err := card.Create(config.ContextDB(c)); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateCardResponse{
		Id: card.Id,
	}
}

type CreateCardRequest struct {
	model.CardField
}

type CreateCardResponse struct {
	Id uuid.UUID `json:"id"`
}
