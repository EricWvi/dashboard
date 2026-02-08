package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (b Base) UpdateFolder(c *gin.Context, req *UpdateFolderRequest) *UpdateFolderResponse {
	folder := &model.Folder{
		FolderField: req.FolderField,
	}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := folder.Update(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &UpdateFolderResponse{}
}

type UpdateFolderRequest struct {
	Id uuid.UUID `json:"id"`
	model.FolderField
}

type UpdateFolderResponse struct {
}
