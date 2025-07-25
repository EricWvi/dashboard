package collection

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateCollection(c *gin.Context, req *CreateCollectionRequest) *CreateCollectionResponse {
	collection := &model.Collection{}
	collection.CreatorId = middleware.GetUserId(c)
	collection.CollectionField = req.CollectionField

	err := collection.Create(config.DB)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateCollectionResponse{}
}

type CreateCollectionRequest struct {
	model.CollectionField
}

type CreateCollectionResponse struct {
}
