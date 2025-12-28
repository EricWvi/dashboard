package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListTags(c *gin.Context, req *ListTagsRequest) *ListTagsResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Tag_Group, req.Group)

	tags, err := model.ListTags(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListTagsResponse{
		Tags: tags,
	}
}

type ListTagsRequest struct {
	Group string `form:"group"`
}

type ListTagsResponse struct {
	Tags []string `json:"tags"`
}
