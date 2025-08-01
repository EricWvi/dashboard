package collection

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) DeleteCollection(c *gin.Context, req *DeleteCollectionRequest) *DeleteCollectionResponse {
	collection := &model.Collection{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := collection.Delete(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeleteCollectionResponse{}
}

type DeleteCollectionRequest struct {
	Id uint `json:"id"`
}

type DeleteCollectionResponse struct {
}
