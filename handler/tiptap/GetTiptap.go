package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetTiptap(c *gin.Context, req *GetTiptapRequest) *GetTiptapResponse {
	tiptap := &model.Tiptap{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := tiptap.Get(config.DB.WithContext(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetTiptapResponse{
		*tiptap,
	}
}

type GetTiptapRequest struct {
	Id uint `form:"id"`
}

type GetTiptapResponse struct {
	model.Tiptap
}
