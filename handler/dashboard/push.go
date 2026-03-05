package dashboard

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
	errChan := make(chan error, 9)

	if len(req.Tag) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Tag {
				req.Tag[i].CreatorId = userId
				req.Tag[i].Group = "dashboard"

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

	if len(req.Blog) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Blog {
				req.Blog[i].CreatorId = userId

				existing := &model.BlogV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Blog[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.Blog[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Blog[i].UpdatedAt {
						continue
					}
					if err := req.Blog[i].SyncFromClient(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	if len(req.Bookmark) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Bookmark {
				req.Bookmark[i].CreatorId = userId

				existing := &model.BookmarkV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Bookmark[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.Bookmark[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Bookmark[i].UpdatedAt {
						continue
					}
					if err := req.Bookmark[i].SyncFromClient(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	if len(req.Collection) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Collection {
				req.Collection[i].CreatorId = userId

				existing := &model.CollectionV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Collection[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.Collection[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Collection[i].UpdatedAt {
						continue
					}
					if err := req.Collection[i].SyncFromClient(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	if len(req.Echo) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Echo {
				req.Echo[i].CreatorId = userId

				existing := &model.EchoV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Echo[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.Echo[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Echo[i].UpdatedAt {
						continue
					}
					if err := req.Echo[i].SyncFromClient(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	if len(req.QuickNote) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.QuickNote {
				req.QuickNote[i].CreatorId = userId

				existing := &model.QuickNoteV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.QuickNote[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.QuickNote[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.QuickNote[i].UpdatedAt {
						continue
					}
					if err := req.QuickNote[i].SyncFromClient(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	if len(req.Todo) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Todo {
				req.Todo[i].CreatorId = userId

				existing := &model.TodoV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Todo[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.Todo[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Todo[i].UpdatedAt {
						continue
					}
					if err := req.Todo[i].SyncFromClient(db, where); err != nil {
						errChan <- err
						return
					}
				}
			}
		}()
	}

	if len(req.Watch) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range req.Watch {
				req.Watch[i].CreatorId = userId

				existing := &model.WatchV2{}
				where := model.WhereMap{}
				where.Eq(model.Id, req.Watch[i].Id)
				where.Eq(model.CreatorId, userId)
				err := existing.Get(db, where)

				if err != nil {
					if err := req.Watch[i].Create(db); err != nil {
						errChan <- err
						return
					}
				} else {
					if existing.UpdatedAt >= req.Watch[i].UpdatedAt {
						continue
					}
					if err := req.Watch[i].SyncFromClient(db, where); err != nil {
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
				req.Tiptap[i].Site = model.SiteDashboard

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

	return &PushResponse{
		Success: true,
	}
}

type PushRequest struct {
	Tag        []model.TagV2        `json:"tags"`
	Blog       []model.BlogV2       `json:"blogs"`
	Bookmark   []model.BookmarkV2   `json:"bookmarks"`
	Collection []model.CollectionV2 `json:"collections"`
	Echo       []model.EchoV2       `json:"echoes"`
	QuickNote  []model.QuickNoteV2  `json:"quickNotes"`
	Todo       []model.TodoV2       `json:"todos"`
	Watch      []model.WatchV2      `json:"watches"`
	Tiptap     []model.TiptapV2     `json:"tiptaps"`
}

type PushResponse struct {
	Success bool `json:"success"`
}
