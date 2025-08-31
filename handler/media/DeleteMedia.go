package media

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (b Base) DeleteMedia(c *gin.Context, req *DeleteMediaRequest) *DeleteMediaResponse {
	deleted := []uuid.UUID{}
	client, err := service.InitMinIOService()
	if err != nil {
		handler.Errorf(c, "%s", err.Error())
		return nil
	}
	for _, id := range req.Ids {
		m := &model.Media{}
		err := m.Get(config.ContextDB(c), gin.H{
			model.Media_CreatorId: middleware.GetUserId(c),
			model.Media_Link:      id,
		})
		if err != nil {
			continue
		}
		err = m.Delete(config.ContextDB(c), nil)
		if err != nil {
			log.Errorf(c, "DeleteMedia %s failed: %s", id, err)
			continue
		}
		err = client.DeleteObject(c, m.Key)
		if err != nil {
			log.Errorf(c, "DeleteObject %s failed: %s", m.Key, err)
			continue
		}
		log.Infof(c, "Object %s deleted successfully", m.Key)
		deleted = append(deleted, id)
	}

	return &DeleteMediaResponse{
		Ids: deleted,
	}
}

type DeleteMediaRequest struct {
	Ids []uuid.UUID `json:"ids"`
}

type DeleteMediaResponse struct {
	Ids []uuid.UUID `json:"ids"`
}
