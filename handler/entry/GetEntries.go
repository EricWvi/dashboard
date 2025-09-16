package entry

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetEntries(c *gin.Context, req *GetEntriesRequest) *GetEntriesResponse {
	entries, hasMore, err := model.FindEntries(config.ContextDB(c), gin.H{
		model.CreatorId: middleware.GetUserId(c),
	}, req.Page)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	drafts := []*model.Tiptap{}
	for _, entry := range entries {
		if entry.Draft != 0 {
			tiptap := &model.Tiptap{}
			m := model.WhereMap{}
			m.Eq(model.CreatorId, middleware.GetUserId(c))
			m.Eq(model.Id, entry.Draft)

			if err := tiptap.Get(config.ContextDB(c), m); err == nil {
				drafts = append(drafts, tiptap)
			}
		}
	}

	return &GetEntriesResponse{
		drafts,
		entries,
		hasMore,
	}
}

type GetEntriesRequest struct {
	Page uint `form:"page"`
}

type GetEntriesResponse struct {
	Drafts  []*model.Tiptap `json:"drafts"`
	Entries []*model.Entry  `json:"entries"`
	HasMore bool            `json:"hasMore"`
}
