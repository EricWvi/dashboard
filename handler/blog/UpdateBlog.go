package blog

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateBlog(c *gin.Context, req *UpdateBlogRequest) *UpdateBlogResponse {
	blog := &model.Blog{
		BlogField: req.BlogField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := blog.Update(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateBlogResponse{}
}

type UpdateBlogRequest struct {
	Id uint `json:"id"`
	model.BlogField
}

type UpdateBlogResponse struct {
}
