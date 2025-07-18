package media

import (
	"net/http"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
)

func Serve(c *gin.Context) {
	link := c.Param("link")
	m := &model.Media{}
	err := m.Get(config.DB, gin.H{
		model.Media_Link: link,
	})
	if err != nil {
		c.JSON(404, gin.H{"message": "media not found"})
		return
	}
	// redirect
	presignedURL := m.PresignedURL
	if presignedURL == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "media not found"})
		return
	}
	c.Redirect(http.StatusFound, presignedURL)
}
