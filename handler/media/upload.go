package media

import (
	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/EricWvi/dashboard/model"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
)

// Upload handles the media upload request from form data.
func Upload(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(400, gin.H{"message": "Failed to parse multipart form: " + err.Error()})
		return
	}

	files := form.File["photos"]
	if len(files) == 0 {
		c.JSON(400, gin.H{"message": "No files found in form data"})
		return
	}

	client, err := service.InitMinIOService()
	if err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}

	var fileIds []string
	for _, file := range files {
		fileKey, err := client.UploadMultipartFile(c, file)
		if err != nil {
			c.JSON(500, gin.H{"message": "Failed to save " + file.Filename + ": " + err.Error()})
			return
		}
		presignedUrl, err := client.PresignObject(c, fileKey)
		if err != nil {
			c.JSON(500, gin.H{"message": "Failed to presign url. " + err.Error()})
			return
		}
		m := &model.Media{
			CreatorId:    middleware.GetUserId(c),
			Key:          fileKey,
			PresignedURL: presignedUrl,
		}
		err = m.Create(config.ContextDB(log.MediaCtx))
		if err != nil {
			c.JSON(500, gin.H{"message": err.Error()})
			return
		}
		fileIds = append(fileIds, m.Link.String())
	}

	c.JSON(200, gin.H{
		"photos": fileIds,
	})
}
