package middleware

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/EricWvi/dashboard/log"
	"github.com/gin-gonic/gin"
)

// Simple in-memory cache (like Redis)
type cacheEntry struct {
	data      []byte
	status    int
	createdAt time.Time
}

var (
	idemCache = make(map[string]*cacheEntry)
	mu        sync.RWMutex
	// TODO
	middlewareLogId = "4d78d6b8-b34b-4cc1-a740-38d00cd90779"
	middlewareCtx   = context.WithValue(context.Background(), "RequestId", middlewareLogId)
)

func init() {
	// start cleanup worker
	startCacheCleaner(1 * time.Minute)
}

func readCache(key string) (*cacheEntry, bool) {
	mu.RLock()
	defer mu.RUnlock()
	entry, ok := idemCache[key]
	return entry, ok
}

// firstWriteCache returns isFirstWrite
func firstWriteCache(key string, value *cacheEntry) bool {
	mu.Lock()
	defer mu.Unlock()
	if _, ok := idemCache[key]; ok {
		return false
	} else {
		idemCache[key] = value
		return true
	}
}

func checkCache(c *gin.Context, key string) {
	start := time.Now()
	for {
		if entry, ok := readCache(key); ok {
			if entry.status != -1 {
				log.Info(c, "idem cache hit")
				c.Data(entry.status, "application/json", entry.data)
				c.Abort()
				return
			}
			if time.Since(start) > 500*time.Millisecond {
				log.Error(c, "idem cache hit failed")
				c.Data(http.StatusInternalServerError, "text/plain", []byte("read idem cache failed"))
				c.Abort()
				return
			}
			time.Sleep(50 * time.Millisecond)
		} else {
			break
		}
	}
}

// Background job to evict expired keys
func startCacheCleaner(interval time.Duration) {
	go func() {
		for {
			time.Sleep(interval)
			count := 0
			mu.Lock()
			for k, v := range idemCache {
				if time.Since(v.createdAt) > 5*time.Minute {
					delete(idemCache, k)
					count++
				}
			}
			mu.Unlock()
			if count > 0 {
				log.Infof(middlewareCtx, "idemCache clean %d keys", count)
			}
		}
	}()
}

func Idempotency() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("Idempotency-Key")
		if key == "" {
			c.Next()
			return
		}

		c.Set("RequestId", key)

		// Check cache
		checkCache(c, key)
		if c.IsAborted() {
			return
		}

		isFirstWrite := firstWriteCache(key, &cacheEntry{
			status:    -1,
			createdAt: time.Now(),
		}) // placeholder
		if !isFirstWrite {
			checkCache(c, key)
			return
		}

		c.Next()
		if c.IsAborted() {
			return
		}

		writer, _ := c.Get("bodyWriter")
		rspBody := writer.(*bodyWriter).body.Bytes()
		mu.Lock()
		idemCache[key] = &cacheEntry{
			data:      rspBody,
			status:    c.Writer.Status(),
			createdAt: time.Now(),
		}
		mu.Unlock()
	}
}
