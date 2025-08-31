package tiptap

import (
	"net/http"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

func (b Base) UpdateTiptap(c *gin.Context, req *UpdateTiptapRequest) *UpdateTiptapResponse {
	tiptap := &model.Tiptap{}
	tiptap.Content = req.Content
	tiptap.Ts = req.Curr
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)
	if req.Prev != -1 {
		m.Eq(model.Tiptap_Ts, req.Prev)
	}

	if err := tiptap.Update(config.DB, m); err != nil {
		c.JSON(http.StatusConflict, handler.Response{
			RequestId: c.GetString("RequestId"),
			Code:      http.StatusConflict,
			Message:   err.Error(),
		})
		c.Abort()
		return nil
	}

	return &UpdateTiptapResponse{}
}

type UpdateTiptapRequest struct {
	Id      uint           `json:"id"`
	Content datatypes.JSON `json:"content"`
	Prev    int64          `json:"prev"`
	Curr    int64          `json:"curr"`
}

type UpdateTiptapResponse struct {
}
