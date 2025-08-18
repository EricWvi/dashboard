package middleware

import (
	"os"
	"sync"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/model"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

var emailToID map[string]uint

var lock sync.RWMutex

func InitJWTMap() {
	m, err := model.CreateEmailToIDMap(config.DB)
	if err != nil {
		log.Error()
		os.Exit(1)
	}
	emailToID = m
}

func readMap(email string) (uint, bool) {
	lock.RLock()
	defer lock.RUnlock()
	id, ok := emailToID[email]
	return id, ok
}

func writeMap(email string) uint {
	lock.Lock()
	defer lock.Unlock()
	if id, ok := emailToID[email]; ok {
		return id
	} else {
		id := model.CreateUser(config.DB, email)
		emailToID[email] = id
		return id
	}
}

func getId(email string) uint {
	if id, ok := readMap(email); ok {
		return id
	} else {
		return writeMap(email)
	}
}

func JWT(c *gin.Context) {
	email := c.Request.Header.Get("Remote-Email")
	if len(email) == 0 {
		c.Set("UserId", 0)
	} else {
		c.Set("UserId", getId(email))
	}
}

func GetUserId(c *gin.Context) uint {
	return c.GetUint("UserId")
}
