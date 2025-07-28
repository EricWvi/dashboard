package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateTiptap(c *gin.Context, req *UpdateTiptapRequest) *UpdateTiptapResponse {
	tiptap := &model.Tiptap{
		TiptapField: req.TiptapField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := tiptap.Update(config.DB, m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateTiptapResponse{}
}

type UpdateTiptapRequest struct {
	Id uint `json:"id"`
	model.TiptapField
}

type UpdateTiptapResponse struct {
}
