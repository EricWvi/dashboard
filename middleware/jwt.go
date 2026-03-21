package middleware

import (
	"net/http"
	"os"
	"sync"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/model"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
)

var emailToID map[string]uint

var lock sync.RWMutex

func InitJWTMap() {
	m, err := model.CreateEmailToIDMap(config.ContextDB(log.WorkerCtx))
	if err != nil {
		log.Error(log.WorkerCtx, err.Error())
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
		id, err := model.CreateUser(config.ContextDB(log.WorkerCtx), email)
		if err != nil {
			log.Error(log.WorkerCtx, err.Error())
		}
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

func JWT() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Request.Header.Get("Onlyquant-Token")
		if token == "" {
			if c.Request.URL.Query().Get("Action") != "Auth" {
				handler.ReplyError(c, http.StatusBadRequest, "request is not authenticated")
				c.Abort()
				return
			} else {
				c.Set("UserId", uint(0))
				return
			}
		}
		email, err := service.Decrypt(service.Key(), token)
		if err != nil {
			handler.ReplyError(c, http.StatusBadRequest, "token is invalid")
			c.Abort()
			return
		}
		if len(email) == 0 {
			handler.ReplyError(c, http.StatusBadRequest, "email is empty")
			c.Abort()
			return
		} else {
			c.Set("UserId", getId(email))
		}
	}
}

func GetUserId(c *gin.Context) uint {
	return c.GetUint("UserId")
}
