package bookmark

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) DeleteTag(c *gin.Context, req *DeleteTagRequest) *DeleteTagResponse {
	tag := &model.Tag{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Tag_Name, req.Name)
	m.Eq(model.Tag_Group, req.Group)

	if err := tag.Delete(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeleteTagResponse{}
}

type DeleteTagRequest struct {
	Name  string `json:"name"`
	Group string `json:"group"`
}

type DeleteTagResponse struct {
}
