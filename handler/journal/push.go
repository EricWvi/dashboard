package journal

import (
	"sync"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) Push(c *gin.Context, req *PushRequest) *PushResponse {
	userId := middleware.GetUserId(c)
	db := config.ContextDB(c)

	var wg sync.WaitGroup
	var pushErr error
	errChan := make(chan error, 3)

	if len(req.Entry) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Entry {
				req.Entry[i].CreatorId = userId

				existing := &model.EntryV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Entry[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.Entry[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Entry[i].UpdatedAt {
						continue
					}
					if err := req.Entry[i].SyncFromClient(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	if len(req.Tag) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Tag {
				req.Tag[i].CreatorId = userId
				req.Tag[i].Group = "journal"

				existing := &model.TagV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Tag[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.Tag[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Tag[i].UpdatedAt {
						continue
					}
					if err := req.Tag[i].SyncFromClient(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	if len(req.Tiptap) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Tiptap {
				req.Tiptap[i].CreatorId = userId
				req.Tiptap[i].Site = model.SiteJournal

				existing := &model.TiptapV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Tiptap[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.Tiptap[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Tiptap[i].UpdatedAt {
						continue
					}
					if err := req.Tiptap[i].SyncFromClient(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	wg.Wait()
	close(errChan)

	for err := range errChan {
		if err != nil {
			pushErr = err
			break
		}
	}

	if pushErr != nil {
		handler.Errorf(c, "failed to push data: %s", pushErr.Error())
		return nil
	}

	// Recalculate statistics after successful sync
	if err := model.CalculateStatistics(db, userId); err != nil {
		handler.Errorf(c, "failed to calculate statistics: %s", err.Error())
		return nil
	}

	return &PushResponse{
		Success: true,
	}
}

type PushRequest struct {
	Entry  []model.EntryV2  `json:"entries"`
	Tag    []model.TagV2    `json:"tags"`
	Tiptap []model.TiptapV2 `json:"tiptaps"`
}

type PushResponse struct {
	Success bool `json:"success"`
}
