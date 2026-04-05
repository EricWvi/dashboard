package journal

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
	var entries []model.EntryV2
	var tags []model.TagV2
	var tiptaps []model.TiptapV2
	var statistics []model.StatisticV2
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
		result, err := model.ListEntryV2Since(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		entries = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListTagV2Since(db, req.Since, userId, "journal")
		if err != nil {
			fetchErr = err
			return
		}
		tags = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListTiptapV2Since(db, req.Since, userId, model.SiteJournal)
		if err != nil {
			fetchErr = err
			return
		}
		tiptaps = result
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := model.ListStatisticV2Since(db, req.Since, userId)
		if err != nil {
			fetchErr = err
			return
		}
		statistics = result
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
	for i := range entries {
		if entries[i].ServerVersion > serverVersion {
			serverVersion = entries[i].ServerVersion
		}
	}
	for i := range tags {
		if tags[i].ServerVersion > serverVersion {
			serverVersion = tags[i].ServerVersion
		}
	}
	for i := range tiptaps {
		if tiptaps[i].ServerVersion > serverVersion {
			serverVersion = tiptaps[i].ServerVersion
		}
	}
	for i := range statistics {
		if statistics[i].ServerVersion > serverVersion {
			serverVersion = statistics[i].ServerVersion
		}
	}

	return &PullResponse{
		ServerVersion: serverVersion,
		User:          users,
		Entry:         entries,
		Tag:           tags,
		Tiptap:        tiptaps,
		Statistic:     statistics,
	}
}

type PullRequest struct {
	Since int64 `form:"since" binding:"required"`
}

type PullResponse struct {
	ServerVersion int64                 `json:"serverVersion"`
	User          []model.UserV2View    `json:"users"`
	Entry         []model.EntryV2       `json:"entries"`
	Tag           []model.TagV2         `json:"tags"`
	Tiptap        []model.TiptapV2      `json:"tiptaps"`
	Statistic     []model.StatisticV2   `json:"statistics"`
}
