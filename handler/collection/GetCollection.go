package collection

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetCollection(c *gin.Context, req *GetCollectionRequest) *GetCollectionResponse {
	collection := &model.Collection{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := collection.Get(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetCollectionResponse{
		*collection,
	}
}

type GetCollectionRequest struct {
	Id uint `json:"id"`
}

type GetCollectionResponse struct {
	model.Collection
}
