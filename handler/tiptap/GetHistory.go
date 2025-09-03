package tiptap

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

func (b Base) GetHistory(c *gin.Context, req *GetHistoryRequest) *GetHistoryResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	content, err := model.GetTiptapHistory(config.ContextDB(c), req.Ts, m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetHistoryResponse{
		Content: content,
	}
}

type GetHistoryRequest struct {
	Id uint  `form:"id"`
	Ts int64 `form:"ts"`
}

type GetHistoryResponse struct {
	Content datatypes.JSON `json:"content"`
}
