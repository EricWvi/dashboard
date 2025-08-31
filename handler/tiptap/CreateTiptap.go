package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateTiptap(c *gin.Context, req *CreateTiptapRequest) *CreateTiptapResponse {
	tiptap := &model.Tiptap{}
	tiptap.CreatorId = middleware.GetUserId(c)
	tiptap.TiptapField = req.TiptapField

	if err := tiptap.Create(config.ContextDB(c)); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateTiptapResponse{
		Id: tiptap.ID,
	}
}

type CreateTiptapRequest struct {
	model.TiptapField
}

type CreateTiptapResponse struct {
	Id uint `json:"id"`
}
