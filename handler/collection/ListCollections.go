package collection

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListCollections(c *gin.Context, req *ListCollectionsRequest) *ListCollectionsResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	collections, err := model.ListCollections(config.DB, m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListCollectionsResponse{
		Collections: collections,
	}
}

type ListCollectionsRequest struct {
}

type ListCollectionsResponse struct {
	Collections []model.Collection `json:"collections"`
}
