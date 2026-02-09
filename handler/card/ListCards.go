package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (b Base) ListCards(c *gin.Context, req *ListCardsRequest) *ListCardsResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Card_FolderId, req.FolderId)

	cards, err := model.ListCards(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListCardsResponse{
		Cards: cards,
	}
}

type ListCardsRequest struct {
	FolderId uuid.UUID `form:"folderId"`
}

type ListCardsResponse struct {
	Cards []model.Card `json:"cards"`
}
