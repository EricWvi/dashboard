package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateTags(c *gin.Context, req *CreateTagsRequest) *CreateTagsResponse {
	for i := range req.Tags {
		tag := &model.Tag{}
		tag.CreatorId = middleware.GetUserId(c)
		tag.Name = req.Tags[i]

		if err := tag.Create(config.ContextDB(c)); err != nil {
			handler.Errorf(c, "%s", err.Error())
			return nil
		}
	}

	return &CreateTagsResponse{}
}

type CreateTagsRequest struct {
	Tags []string `json:"tags"`
}

type CreateTagsResponse struct {
}
