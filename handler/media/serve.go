package media

import (
	"net/http"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
)

func Serve(c *gin.Context) {
	link := c.Param("link")
	m := &model.Media{}
	err := m.Get(config.ContextDB(service.MediaCtx), gin.H{
		model.Media_Link: link,
		model.CreatorId:  middleware.GetUserId(c),
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}
	// redirect
	presignedURL := m.PresignedURL
	if presignedURL == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "presigned url not found"})
		return
	}
	c.Redirect(http.StatusFound, presignedURL)
}
