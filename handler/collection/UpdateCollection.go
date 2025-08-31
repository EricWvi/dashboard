package collection

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateCollection(c *gin.Context, req *UpdateCollectionRequest) *UpdateCollectionResponse {
	collection := &model.Collection{
		CollectionField: req.CollectionField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := collection.Update(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateCollectionResponse{}
}

type UpdateCollectionRequest struct {
	Id uint `json:"id"`
	model.CollectionField
}

type UpdateCollectionResponse struct {
}
