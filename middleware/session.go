package middleware

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	userSessionMap = make(map[uint]*userSession)
	globalLock     sync.RWMutex
)

func readUserSession(key uint) (*userSession, bool) {
	globalLock.RLock()
	defer globalLock.RUnlock()
	session, ok := userSessionMap[key]
	return session, ok
}

func writeUserSession(key uint) *userSession {
	globalLock.Lock()
	defer globalLock.Unlock()
	if session, ok := userSessionMap[key]; ok {
		return session
	} else {
		entry := &userSession{}
		userSessionMap[key] = entry
		return entry
	}
}

type userSession struct {
	Version   int64
	nextWrite int
	Clients   [5]clientSession
	lock      sync.RWMutex
}

func (u *userSession) findSessionSlot(token string) int {
	u.lock.RLock()
	defer u.lock.RUnlock()
	idx := -1
	for i := range u.Clients {
		if u.Clients[i].Token == token {
			idx = i
			break
		}
	}
	return idx
}

func (u *userSession) newSessionSlot(token string) int {
	u.lock.Lock()
	defer u.lock.Unlock()
	idx := u.nextWrite
	u.Clients[idx] = clientSession{
		Version: u.Version,
		Token:   token,
	}
	u.nextWrite = (u.nextWrite + 1) % 5
	return idx
}

func (u *userSession) BumpVersion(index int) {
	u.lock.Lock()
	u.Version++
	u.lock.Unlock()

	u.Clients[index].lock.Lock()
	defer u.Clients[index].lock.Unlock()
	u.Clients[index].Version++
}

type clientSession struct {
	Version int64
	Token   string
	lock    sync.RWMutex
}

func Session() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Request.Header.Get("Only-Session-Token")
		c.Set("UserSession", token)
		if c.Request.Method == "POST" {
			if len(token) == 0 {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"message": "Only-Session-Token header is required"})
				return
			}
		}

		c.Next()
		if !c.IsAborted() && c.Writer.Status() == http.StatusOK && c.Request.Method == "POST" {
			userId := GetUserId(c)
			userSession, ok := readUserSession(userId)
			if !ok {
				userSession = writeUserSession(userId)
			}

			idx := userSession.findSessionSlot(token)
			if idx == -1 {
				idx = userSession.newSessionSlot(token)
			}

			userSession.BumpVersion(idx)
		}
	}
}

func GetUserSession(c *gin.Context) string {
	return c.GetString("UserSession")
}

func IsStale(c *gin.Context) bool {
	userSession, ok := readUserSession(GetUserId(c))
	if !ok {
		return true
	}

	idx := userSession.findSessionSlot(GetUserSession(c))
	if idx == -1 {
		return true
	}

	userSession.lock.RLock()
	defer userSession.lock.RUnlock()
	userSession.Clients[idx].lock.RLock()
	defer userSession.Clients[idx].lock.RUnlock()
	return userSession.Clients[idx].Version != userSession.Version
}
