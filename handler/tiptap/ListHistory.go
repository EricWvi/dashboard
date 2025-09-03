package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) ListHistory(c *gin.Context, req *ListHistoryRequest) *ListHistoryResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	history, err := model.ListTiptapHistory(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListHistoryResponse{
		History: history,
	}
}

type ListHistoryRequest struct {
	Id uint `form:"id"`
}

type ListHistoryResponse struct {
	History []int64 `json:"history"`
}
