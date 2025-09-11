package entry

import (
	"time"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateEntryFromDraft(c *gin.Context, req *CreateEntryFromDraftRequest) *CreateEntryFromDraftResponse {
	entry := &model.Entry{}
	err := entry.Get(config.ContextDB(c), gin.H{
		model.Entry_Visibility: model.Visibility_Draft,
		model.Entry_CreatorId:  middleware.GetUserId(c),
	})
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	entry.EntryField = req.EntryField
	entry.CreatedAt = time.Now()
	entry.UpdatedAt = time.Now()
	err = entry.Update(config.ContextDB(c), nil)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateEntryFromDraftResponse{
		entry,
	}
}

type CreateEntryFromDraftRequest struct {
	model.EntryField
}

type CreateEntryFromDraftResponse struct {
	*model.Entry
}
