package middleware

import (
	"os"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

var EmailToID map[string]uint

func InitJWTMap() {
	m, err := model.CreateEmailToIDMap(config.DB)
	if err != nil {
		log.Error()
		os.Exit(1)
	}
	EmailToID = m
}

func JWT(c *gin.Context) {
	email := c.Request.Header.Get("Remote-Email")
	if len(email) == 0 {
		c.Set("UserId", 0)
	} else {
		c.Set("UserId", EmailToID[email])
	}
}

func GetUserId(c *gin.Context) uint {
	return c.GetUint("UserId")
}
