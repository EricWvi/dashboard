package tiptap

import (
	"time"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) RestoreHistory(c *gin.Context, req *RestoreHistoryRequest) *RestoreHistoryResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	content, err := model.GetTiptapHistory(config.ContextDB(c), req.Ts, m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	tiptap := &model.Tiptap{}
	tiptap.Content = content
	tiptap.Ts = time.Now().UnixMilli()
	if err := tiptap.Update(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &RestoreHistoryResponse{}
}

type RestoreHistoryRequest struct {
	Id uint  `json:"id"`
	Ts int64 `json:"ts"`
}

type RestoreHistoryResponse struct {
}
