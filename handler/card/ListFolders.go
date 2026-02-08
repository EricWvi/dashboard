package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (b Base) ListFolders(c *gin.Context, req *ListFoldersRequest) *ListFoldersResponse {
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Folder_ParentId, req.ParentId)

	folders, err := model.ListFolders(config.ContextDB(c), m)
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &ListFoldersResponse{
		Folders: folders,
	}
}

type ListFoldersRequest struct {
	ParentId *uuid.UUID `form:"parentId"`
}

type ListFoldersResponse struct {
	Folders []model.Folder `json:"folders"`
}
