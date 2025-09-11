package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetDraft(c *gin.Context, req *GetDraftRequest) *GetDraftResponse {
	userId := middleware.GetUserId(c)
	e := &model.Entry{}
	err := e.Get(config.ContextDB(c), gin.H{
		model.Entry_Visibility: model.Visibility_Draft,
		model.Entry_CreatorId:  userId,
	})
	if err != nil {
		e.CreatorId = userId
		e.Visibility = model.Visibility_Draft

		tiptap := &model.Tiptap{}
		tiptap.CreatorId = middleware.GetUserId(c)
		if err := tiptap.Create(config.ContextDB(c)); err != nil {
			handler.Errorf(c, "%s", err.Error())
			return nil
		}
		e.Draft = int(tiptap.ID)

		err = e.Create(config.ContextDB(c))
		if err != nil {
			handler.Errorf(c, "%s", err.Error())
			return nil
		}
	}

	return &GetDraftResponse{
		e,
	}
}

type GetDraftRequest struct {
}

type GetDraftResponse struct {
	*model.Entry
}
