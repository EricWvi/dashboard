package tiptap

import (
	"time"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) UpdateTiptap(c *gin.Context, req *UpdateTiptapRequest) *UpdateTiptapResponse {
	updatedTime := time.Unix(req.Ts/1000, (req.Ts%1000)*int64(time.Millisecond))
	m := model.WhereExpr{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)
	m.LT(model.UpdatedAt, updatedTime)

	if err := model.UpdateTiptap(config.DB.WithContext(c), m, map[string]any{
		model.UpdatedAt:      updatedTime,
		model.Tiptap_Content: req.TiptapField.Content,
	}); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateTiptapResponse{}
}

type UpdateTiptapRequest struct {
	Id uint  `json:"id"`
	Ts int64 `json:"ts"`
	model.TiptapField
}

type UpdateTiptapResponse struct {
}
