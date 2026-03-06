package dashboard

import (
	"sync"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) Pull(c *gin.Context, req *PullRequest) *PullResponse {
	userId := middleware.GetUserId(c)
	db := config.ContextDB(c)
	serverVersion := req.Since

	var wg sync.WaitGroup
	var users []model.UserV2View
	var tags []model.TagV2
	var blogs []model.BlogV2
	var bookmarks []model.BookmarkV2
	var collections []model.CollectionV2
	var echoes []model.EchoV2
	var quickNotes []model.QuickNoteV2
	var todos []model.TodoV2
	var watches []model.WatchV2
	var tiptaps []model.TiptapV2
	var fetchErr error

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListUserSince(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		users = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListTagV2Since(db, req.Since, userId, "dashboard")
		if err != nil {
			fetchErr = err
			return
		}
		tags = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListBlogV2Since(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		blogs = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListBookmarkV2Since(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		bookmarks = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListCollectionV2Since(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		collections = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListEchoV2Since(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		echoes = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListQuickNoteV2Since(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		quickNotes = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListTodoV2Since(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		todos = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListWatchV2Since(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		watches = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListTiptapV2Since(db, req.Since, userId, model.SiteDashboard)
		if err != nil {
			fetchErr = err
			return
		}
		tiptaps = result
	}()

	wg.Wait()

	if fetchErr != nil {
		handler.Errorf(c, "failed to fetch data: %s", fetchErr.Error())
		return nil
	}

	for i := range users {
		if users[i].ServerVersion > serverVersion {
			serverVersion = users[i].ServerVersion
		}
	}
	for i := range tags {
		if tags[i].ServerVersion > serverVersion {
			serverVersion = tags[i].ServerVersion
		}
	}
	for i := range blogs {
		if blogs[i].ServerVersion > serverVersion {
			serverVersion = blogs[i].ServerVersion
		}
	}
	for i := range bookmarks {
		if bookmarks[i].ServerVersion > serverVersion {
			serverVersion = bookmarks[i].ServerVersion
		}
	}
	for i := range collections {
		if collections[i].ServerVersion > serverVersion {
			serverVersion = collections[i].ServerVersion
		}
	}
	for i := range echoes {
		if echoes[i].ServerVersion > serverVersion {
			serverVersion = echoes[i].ServerVersion
		}
	}
	for i := range quickNotes {
		if quickNotes[i].ServerVersion > serverVersion {
			serverVersion = quickNotes[i].ServerVersion
		}
	}
	for i := range todos {
		if todos[i].ServerVersion > serverVersion {
			serverVersion = todos[i].ServerVersion
		}
	}
	for i := range watches {
		if watches[i].ServerVersion > serverVersion {
			serverVersion = watches[i].ServerVersion
		}
	}
	for i := range tiptaps {
		if tiptaps[i].ServerVersion > serverVersion {
			serverVersion = tiptaps[i].ServerVersion
		}
	}

	return &PullResponse{
		ServerVersion: serverVersion,
		User:          users,
		Tag:           tags,
		Blog:          blogs,
		Bookmark:      bookmarks,
		Collection:    collections,
		Echo:          echoes,
		QuickNote:     quickNotes,
		Todo:          todos,
		Watch:         watches,
		Tiptap:        tiptaps,
	}
}

type PullRequest struct {
	Since int64 `form:"since" binding:"required"`
}

type PullResponse struct {
	ServerVersion int64                `json:"serverVersion"`
	User          []model.UserV2View   `json:"users"`
	Tag           []model.TagV2        `json:"tags"`
	Blog          []model.BlogV2       `json:"blogs"`
	Bookmark      []model.BookmarkV2   `json:"bookmarks"`
	Collection    []model.CollectionV2 `json:"collections"`
	Echo          []model.EchoV2       `json:"echoes"`
	QuickNote     []model.QuickNoteV2  `json:"quickNotes"`
	Todo          []model.TodoV2       `json:"todos"`
	Watch         []model.WatchV2      `json:"watches"`
	Tiptap        []model.TiptapV2     `json:"tiptaps"`
}
