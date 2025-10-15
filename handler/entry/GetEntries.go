package entry

import (
	"encoding/json"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) GetEntries(c *gin.Context, req *GetEntriesRequest) *GetEntriesResponse {
	m := model.WhereExpr{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	var cond []QueryCondition
	if err := json.Unmarshal([]byte(req.Condition), &cond); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	for _, cond := range cond {
		switch cond.Operator {
		case "contains":
			m.ILIKE(model.Entry_RawText, "%"+cond.Value.(string)+"%")
		case "bookmarked":
			m.Eq(model.Entry_Bookmark, true)
		case "on":
			dateStr := cond.Value.(string)
			m.GTE(model.CreatedAt, dateStr)
			t, err := handler.ParseDate(dateStr)
			if err == nil {
				nextDay := t.AddDate(0, 0, 1).Format("2006-01-02")
				m.LT(model.CreatedAt, nextDay)
			}
		}
	}

	entries, hasMore, err := model.FindEntries(config.ContextDB(c), m, req.Page)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	ids := []any{}
	for _, entry := range entries {
		if entry.Draft != 0 {
			ids = append(ids, entry.Draft)
		}
	}
	where := model.WhereMap{}
	where.Eq(model.CreatorId, middleware.GetUserId(c))
	where.In(model.Id, ids)
	drafts, err := model.ListTiptaps(config.ContextDB(c), where)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetEntriesResponse{
		drafts,
		entries,
		hasMore,
	}
}

type GetEntriesRequest struct {
	Page      uint   `form:"page"`
	Condition string `form:"condition"`
}

type QueryCondition struct {
	Operator string `json:"operator"`
	Value    any    `json:"value"`
}

type GetEntriesResponse struct {
	Drafts  []model.Tiptap `json:"drafts"`
	Entries []*model.Entry `json:"entries"`
	HasMore bool           `json:"hasMore"`
}
