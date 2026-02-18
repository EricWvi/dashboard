package flomo

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
	errChan := make(chan error, 3) // Buffer for up to 4 entity types

	// Process cards in parallel
	if len(req.Card) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Card {
				req.Card[i].CreatorId = userId

				// Check if card exists
				existing := &model.Card{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Card[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					// Card doesn't exist, create it
					if err := req.Card[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Card[i].UpdatedAt {
						continue
					}
					if err := req.Card[i].Update(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	// Process folders in parallel
	if len(req.Folder) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Folder {
				req.Folder[i].CreatorId = userId

				// Check if folder exists
				existing := &model.Folder{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Folder[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					// Folder doesn't exist, create it
					if err := req.Folder[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Folder[i].UpdatedAt {
						continue
					}
					if err := req.Folder[i].Update(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	// Process tiptaps in parallel
	if len(req.Tiptap) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Tiptap {
				req.Tiptap[i].CreatorId = userId
				req.Tiptap[i].Site = model.SiteFlomo

				// Check if tiptap exists
				existing := &model.TiptapV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Tiptap[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					// Tiptap doesn't exist, create it
					if err := req.Tiptap[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Tiptap[i].UpdatedAt {
						continue
					}
					if err := req.Tiptap[i].Update(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	// Wait for all goroutines to complete
	wg.Wait()
	close(errChan)

	// Check for any errors
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

	return &PushResponse{
		Success: true,
	}
}

type PushRequest struct {
	Card   []model.Card     `json:"card"`
	Folder []model.Folder   `json:"folder"`
	Tiptap []model.TiptapV2 `json:"tiptap"`
}

type PushResponse struct {
	Success bool `json:"success"`
}
