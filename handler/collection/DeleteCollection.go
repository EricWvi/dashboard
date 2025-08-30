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

	if err := collection.Delete(config.DB.WithContext(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	d := model.WhereMap{}
	d.Eq(model.CreatorId, middleware.GetUserId(c))
	d.Eq(model.Todo_CollectionId, req.Id)
	todo := &model.Todo{}
	if err := todo.Delete(config.DB.WithContext(c), d); err != nil {
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
