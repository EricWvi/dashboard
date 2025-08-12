package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateTag(c *gin.Context, req *CreateTagRequest) *CreateTagResponse {
	tag := &model.Tag{}
	tag.CreatorId = middleware.GetUserId(c)
	tag.TagField = req.TagField

	if err := tag.Create(config.DB); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateTagResponse{}
}

type CreateTagRequest struct {
	model.TagField
}

type CreateTagResponse struct {
}
