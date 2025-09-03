package middleware

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/EricWvi/dashboard/log"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupIdempotencyTests() {
	// Initialize logger for tests
	log.InitLogger(slog.LevelError) // Use error level to reduce test output

	// Clear the cache before each test
	mu.Lock()
	idemCache = make(map[string]*cacheEntry)
	mu.Unlock()
}

func TestIdempotency(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupIdempotencyTests()

	t.Run("Request without Idempotency-Key should pass through", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/test", nil)
		c.Request = req

		idempotencyHandler := Idempotency()
		idempotencyHandler(c)

		assert.False(t, c.IsAborted())
		assert.Equal(t, "", c.GetString(log.RequestIDCtxKey))
	})

	t.Run("Request with empty Idempotency-Key should pass through", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/test", nil)
		req.Header.Set("Idempotency-Key", "")
		c.Request = req

		idempotencyHandler := Idempotency()
		idempotencyHandler(c)

		assert.False(t, c.IsAborted())
		assert.Equal(t, "", c.GetString(log.RequestIDCtxKey))
	})

	t.Run("First request with Idempotency-Key should set RequestId and create cache entry", func(t *testing.T) {
		setupIdempotencyTests()

		router := gin.New()
		router.Use(BodyWriter())
		router.Use(Idempotency())

		executed := false
		router.POST("/test", func(c *gin.Context) {
			executed = true
			c.JSON(http.StatusOK, gin.H{"message": "success"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/test", nil)
		req.Header.Set("Idempotency-Key", "test-key-1")

		router.ServeHTTP(w, req)

		assert.True(t, executed)
		assert.Equal(t, http.StatusOK, w.Code)

		// Check cache entry was created
		entry, exists := readCache("test-key-1")
		require.True(t, exists)
		assert.Equal(t, http.StatusOK, entry.status)
		assert.Contains(t, string(entry.data), "success")
	})

	t.Run("Second request with same Idempotency-Key should return cached response", func(t *testing.T) {
		setupIdempotencyTests()

		router := gin.New()
		router.Use(BodyWriter())
		router.Use(Idempotency())

		executionCount := 0
		router.POST("/test", func(c *gin.Context) {
			executionCount++
			c.JSON(http.StatusCreated, gin.H{"id": 123, "message": "created"})
		})

		// First request
		w1 := httptest.NewRecorder()
		req1, _ := http.NewRequest("POST", "/test", nil)
		req1.Header.Set("Idempotency-Key", "test-key-2")

		router.ServeHTTP(w1, req1)
		assert.Equal(t, 1, executionCount)
		assert.Equal(t, http.StatusCreated, w1.Code)

		// Second request with same key
		w2 := httptest.NewRecorder()
		req2, _ := http.NewRequest("POST", "/test", nil)
		req2.Header.Set("Idempotency-Key", "test-key-2")

		router.ServeHTTP(w2, req2)

		// Handler should not execute again
		assert.Equal(t, 1, executionCount)
		assert.Equal(t, http.StatusCreated, w2.Code)
		assert.Equal(t, w1.Body.String(), w2.Body.String())
	})

	t.Run("Failed request should cache error response", func(t *testing.T) {
		setupIdempotencyTests()

		router := gin.New()
		router.Use(BodyWriter())
		router.Use(Idempotency())

		router.POST("/test", func(c *gin.Context) {
			c.AbortWithStatusJSON(http.StatusGatewayTimeout, gin.H{"message": "gateway time out"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/test", nil)
		req.Header.Set("Idempotency-Key", "test-key-failed")

		router.ServeHTTP(w, req)

		// Check cache entry for failed request
		entry, exists := readCache("test-key-failed")
		require.True(t, exists)
		assert.Equal(t, http.StatusInternalServerError, entry.status)
		assert.Contains(t, string(entry.data), "previous request failed")
	})
}

func TestCacheOperations(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupIdempotencyTests()

	t.Run("readCache should return correct entry", func(t *testing.T) {
		// Manually add entry to cache
		testEntry := &cacheEntry{
			data:      []byte(`{"test": "data"}`),
			status:    http.StatusOK,
			createdAt: time.Now(),
		}
		mu.Lock()
		idemCache["test-read-key"] = testEntry
		mu.Unlock()

		entry, exists := readCache("test-read-key")
		assert.True(t, exists)
		assert.Equal(t, testEntry, entry)

		// Test non-existent key
		_, exists = readCache("non-existent")
		assert.False(t, exists)
	})

	t.Run("firstWriteCache should return true for first write, false for subsequent", func(t *testing.T) {
		setupIdempotencyTests()

		testEntry := &cacheEntry{
			data:      []byte(`{"test": "data"}`),
			status:    http.StatusOK,
			createdAt: time.Now(),
		}

		// First write should return true
		isFirst := firstWriteCache("first-write-key", testEntry)
		assert.True(t, isFirst)

		// Check entry was added
		entry, exists := readCache("first-write-key")
		assert.True(t, exists)
		assert.Equal(t, testEntry, entry)

		// Second write should return false
		newEntry := &cacheEntry{
			data:      []byte(`{"new": "data"}`),
			status:    http.StatusCreated,
			createdAt: time.Now(),
		}

		isFirst = firstWriteCache("first-write-key", newEntry)
		assert.False(t, isFirst)

		// Original entry should remain unchanged
		entry, exists = readCache("first-write-key")
		assert.True(t, exists)
		assert.Equal(t, testEntry, entry) // Should still be the original entry
	})
}

func TestCheckCache(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupIdempotencyTests()

	t.Run("checkCache with completed entry should return cached response", func(t *testing.T) {
		// Setup cache with completed entry
		testData := []byte(`{"cached": "response"}`)
		testEntry := &cacheEntry{
			data:      testData,
			status:    http.StatusOK,
			createdAt: time.Now(),
		}
		mu.Lock()
		idemCache["completed-key"] = testEntry
		mu.Unlock()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		req, _ := http.NewRequest("POST", "/test", nil)
		c.Request = req

		checkCache(c, "completed-key")

		assert.True(t, c.IsAborted())
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, testData, w.Body.Bytes())
	})

	t.Run("checkCache with non-existent key should not abort", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		req, _ := http.NewRequest("POST", "/test", nil)
		c.Request = req

		checkCache(c, "non-existent-key")

		assert.False(t, c.IsAborted())
	})

	t.Run("checkCache with pending entry should wait and timeout", func(t *testing.T) {
		// Setup cache with pending entry (status = -1)
		testEntry := &cacheEntry{
			data:      []byte{},
			status:    -1, // Pending
			createdAt: time.Now(),
		}
		mu.Lock()
		idemCache["pending-key"] = testEntry
		mu.Unlock()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		req, _ := http.NewRequest("POST", "/test", nil)
		c.Request = req

		// This test verifies the timeout behavior
		// The checkCache function waits up to 5 seconds for a pending request
		start := time.Now()
		checkCache(c, "pending-key")
		duration := time.Since(start)

		// Should timeout and abort with error
		assert.True(t, c.IsAborted())
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "timeout")
		// Should have waited close to 5 seconds
		assert.True(t, duration >= 4*time.Second, "Should wait at least 4 seconds")
		assert.True(t, duration <= 6*time.Second, "Should not wait more than 6 seconds")
	})
}

func TestIdempotencyIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupIdempotencyTests()

	// Create a test router with both middlewares
	router := gin.New()
	router.Use(BodyWriter())
	router.Use(Idempotency())

	router.POST("/users", func(c *gin.Context) {
		c.JSON(http.StatusCreated, gin.H{
			"id":   123,
			"name": "John Doe",
		})
	})

	t.Run("End-to-end idempotency test", func(t *testing.T) {
		// First request
		w1 := httptest.NewRecorder()
		req1, _ := http.NewRequest("POST", "/users", bytes.NewBufferString(`{"name": "John Doe"}`))
		req1.Header.Set("Content-Type", "application/json")
		req1.Header.Set("Idempotency-Key", "create-user-123")

		router.ServeHTTP(w1, req1)

		assert.Equal(t, http.StatusCreated, w1.Code)
		var response1 map[string]any
		err := json.Unmarshal(w1.Body.Bytes(), &response1)
		require.NoError(t, err)
		assert.Equal(t, float64(123), response1["id"])

		// Second request with same idempotency key
		w2 := httptest.NewRecorder()
		req2, _ := http.NewRequest("POST", "/users", bytes.NewBufferString(`{"name": "Jane Doe"}`))
		req2.Header.Set("Content-Type", "application/json")
		req2.Header.Set("Idempotency-Key", "create-user-123")

		router.ServeHTTP(w2, req2)

		// Should return the same response as first request
		assert.Equal(t, http.StatusCreated, w2.Code)
		var response2 map[string]any
		err = json.Unmarshal(w2.Body.Bytes(), &response2)
		require.NoError(t, err)
		assert.Equal(t, response1, response2)

		// Third request with different idempotency key should work normally
		w3 := httptest.NewRecorder()
		req3, _ := http.NewRequest("POST", "/users", bytes.NewBufferString(`{"name": "Jane Doe"}`))
		req3.Header.Set("Content-Type", "application/json")
		req3.Header.Set("Idempotency-Key", "create-user-456")

		router.ServeHTTP(w3, req3)

		assert.Equal(t, http.StatusCreated, w3.Code)
		var response3 map[string]any
		err = json.Unmarshal(w3.Body.Bytes(), &response3)
		require.NoError(t, err)
		assert.Equal(t, float64(123), response3["id"]) // Same handler, same response
	})
}

func TestConcurrentIdempotency(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupIdempotencyTests()

	// Test concurrent requests with the same idempotency key
	// Expected behavior: first request processes normally,
	// others wait and get the same cached response
	const numRequests = 3
	done := make(chan *httptest.ResponseRecorder, numRequests)

	router := gin.New()
	router.Use(BodyWriter())
	router.Use(Idempotency())

	executionCount := 0
	router.POST("/test", func(c *gin.Context) {
		executionCount++
		// Short processing time
		time.Sleep(10 * time.Millisecond)
		c.JSON(http.StatusOK, gin.H{"processed": true, "execution": executionCount})
	})

	// Launch concurrent requests with the same idempotency key
	for range numRequests {
		go func() {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/test", nil)
			req.Header.Set("Idempotency-Key", "concurrent-test")

			router.ServeHTTP(w, req)
			done <- w
		}()
	}

	// Collect all responses
	responses := make([]*httptest.ResponseRecorder, numRequests)
	for i := range numRequests {
		responses[i] = <-done
	}

	// Count successful vs timeout responses
	successCount := 0
	timeoutCount := 0
	var successResponse string

	for i, resp := range responses {
		if resp.Code == http.StatusOK {
			successCount++
			if successResponse == "" {
				successResponse = resp.Body.String()
			}
		} else if resp.Code == http.StatusInternalServerError &&
			resp.Body.String() == "read idem cache timeout" {
			timeoutCount++
		}
		t.Logf("Response %d: Code=%d, Body=%s", i, resp.Code, resp.Body.String())
	}

	// The handler should only execute once
	assert.Equal(t, 1, executionCount, "Handler should only execute once")

	// All requests should succeed with the same cached response
	assert.Equal(t, numRequests, successCount, "All requests should succeed with cached response")
	assert.Equal(t, 0, timeoutCount, "No requests should timeout")

	// All successful responses should be identical
	for _, resp := range responses {
		if resp.Code == http.StatusOK {
			assert.Equal(t, successResponse, resp.Body.String(),
				"All responses should be identical due to idempotency")
		}
	}

	t.Logf("SUCCESS: %d, TIMEOUTS: %d, Handler executions: %d",
		successCount, timeoutCount, executionCount)
}

func TestCacheCleaner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupIdempotencyTests()

	t.Run("Cache cleaner should remove expired entries", func(t *testing.T) {
		// Add some test entries
		now := time.Now()

		// Fresh entry (should not be cleaned)
		mu.Lock()
		idemCache["fresh-key"] = &cacheEntry{
			data:      []byte(`{"fresh": "data"}`),
			status:    http.StatusOK,
			createdAt: now,
		}

		// Old entry (should be cleaned)
		idemCache["old-key"] = &cacheEntry{
			data:      []byte(`{"old": "data"}`),
			status:    http.StatusOK,
			createdAt: now.Add(-10 * time.Minute), // Older than 5 minutes
		}
		mu.Unlock()

		// Manually trigger cleanup logic
		mu.Lock()
		count := 0
		for k, v := range idemCache {
			if time.Since(v.createdAt) > 5*time.Minute {
				delete(idemCache, k)
				count++
			}
		}
		mu.Unlock()

		// Check that old entry was removed and fresh entry remains
		_, freshExists := readCache("fresh-key")
		_, oldExists := readCache("old-key")

		assert.True(t, freshExists, "Fresh entry should still exist")
		assert.False(t, oldExists, "Old entry should be cleaned up")
		assert.Equal(t, 1, count, "Should have cleaned 1 entry")
	})
}

// Benchmark tests
func BenchmarkIdempotency(b *testing.B) {
	gin.SetMode(gin.TestMode)
	setupIdempotencyTests()

	b.Run("WithoutIdempotencyKey", func(b *testing.B) {
		router := gin.New()
		router.Use(BodyWriter())
		router.Use(Idempotency())
		router.POST("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "test"})
		})

		for b.Loop() {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/test", nil)
			router.ServeHTTP(w, req)
		}
	})

	b.Run("WithIdempotencyKey", func(b *testing.B) {
		router := gin.New()
		router.Use(BodyWriter())
		router.Use(Idempotency())
		router.POST("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "test"})
		})

		for b.Loop() {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/test", nil)
			req.Header.Set("Idempotency-Key", "bench-key")
			router.ServeHTTP(w, req)
		}
	})
}
