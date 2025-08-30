package blog

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListBlogs(c *gin.Context, req *ListBlogsRequest) *ListBlogsResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))

	blogs, err := model.ListBlogs(config.DB.WithContext(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListBlogsResponse{
		Blogs: blogs,
	}
}

type ListBlogsRequest struct {
}

type ListBlogsResponse struct {
	Blogs []model.Blog `json:"blogs"`
}
