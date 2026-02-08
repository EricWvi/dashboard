package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) DeleteFolder(c *gin.Context, req *DeleteFolderRequest) *DeleteFolderResponse {
	folder := &model.Folder{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := folder.Delete(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &DeleteFolderResponse{}
}

type DeleteFolderRequest struct {
	Id uint `json:"id"`
}

type DeleteFolderResponse struct {
}
