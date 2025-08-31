package blog

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateBlog(c *gin.Context, req *CreateBlogRequest) *CreateBlogResponse {
	blog := &model.Blog{}
	blog.CreatorId = middleware.GetUserId(c)
	blog.BlogField = req.BlogField

	if err := blog.Create(config.ContextDB(c)); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateBlogResponse{
		Id: blog.ID,
	}
}

type CreateBlogRequest struct {
	model.BlogField
}

type CreateBlogResponse struct {
	Id uint `json:"id"`
}
