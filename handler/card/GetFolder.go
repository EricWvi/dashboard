package card

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (b Base) GetFolder(c *gin.Context, req *GetFolderRequest) *GetFolderResponse {
	folder := &model.Folder{}
	m := model.WhereMap{}
	m.Eq(model.CreatorId, middleware.GetUserId(c))
	m.Eq(model.Id, req.Id)

	if err := folder.Get(config.ContextDB(c), m); err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}

	return &GetFolderResponse{
		Folder: *folder,
	}
}

type GetFolderRequest struct {
	Id uuid.UUID `form:"id"`
}

type GetFolderResponse struct {
	model.Folder
}
