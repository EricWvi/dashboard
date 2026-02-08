package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func (b Base) CreateFolder(c *gin.Context, req *CreateFolderRequest) *CreateFolderResponse {
	folder := &model.Folder{}
	folder.CreatorId = middleware.GetUserId(c)
	folder.FolderField = req.FolderField

	if err := folder.Create(config.ContextDB(c)); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &CreateFolderResponse{
		Id: folder.ID,
	}
}

type CreateFolderRequest struct {
	model.FolderField
}

type CreateFolderResponse struct {
	Id uint `json:"id"`
}
