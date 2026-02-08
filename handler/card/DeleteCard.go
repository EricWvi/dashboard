package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (b Base) DeleteCard(c *gin.Context, req *DeleteCardRequest) *DeleteCardResponse {
	card := &model.Card{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := card.Delete(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeleteCardResponse{}
}

type DeleteCardRequest struct {
	Id uuid.UUID `json:"id"`
}

type DeleteCardResponse struct {
}
