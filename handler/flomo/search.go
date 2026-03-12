package flomo

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) SearchFolder(c *gin.Context, req *SearchRequest) *SearchFolderResponse {
	userId := middleware.GetUserId(c)
	db := config.ContextDB(c)

	ids, err := model.SearchFolderIds(db, userId, req.Query)
	if err != nil {
		handler.Errorf(c, "failed to search folders: %s", err.Error())
		return nil
	}

	idStrs := make([]string, len(ids))
	for i := range ids {
		idStrs[i] = ids[i].String()
	}

	return &SearchFolderResponse{
		Ids: idStrs,
	}
}

func (b Base) SearchCard(c *gin.Context, req *SearchRequest) *SearchCardResponse {
	userId := middleware.GetUserId(c)
	db := config.ContextDB(c)

	ids, err := model.SearchCardIdsByTitle(db, userId, req.Query)
	if err != nil {
		handler.Errorf(c, "failed to search cards: %s", err.Error())
		return nil
	}

	idStrs := make([]string, len(ids))
	for i := range ids {
		idStrs[i] = ids[i].String()
	}

	return &SearchCardResponse{
		Ids: idStrs,
	}
}

func (b Base) SearchContent(c *gin.Context, req *SearchRequest) *SearchContentResponse {
	userId := middleware.GetUserId(c)
	db := config.ContextDB(c)

	ids, err := model.SearchCardIdsByContent(db, userId, req.Query)
	if err != nil {
		handler.Errorf(c, "failed to search content: %s", err.Error())
		return nil
	}

	idStrs := make([]string, len(ids))
	for i := range ids {
		idStrs[i] = ids[i].String()
	}

	return &SearchContentResponse{
		Ids: idStrs,
	}
}

type SearchRequest struct {
	Query string `form:"q" binding:"required"`
}

type SearchFolderResponse struct {
	Ids []string `json:"ids"`
}

type SearchCardResponse struct {
	Ids []string `json:"ids"`
}

type SearchContentResponse struct {
	Ids []string `json:"ids"`
}
