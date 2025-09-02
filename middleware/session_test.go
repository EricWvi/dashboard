package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSession(t *testing.T) {
	// Clear global state before tests
	userSessionMap = make(map[uint]*userSession)

	gin.SetMode(gin.TestMode)

	t.Run("GET request without session token should pass", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("GET", "/test", nil)
		c.Request = req
		c.Set("UserId", uint(1))

		sessionHandler := Session()
		sessionHandler(c)

		assert.False(t, c.IsAborted())
		assert.Equal(t, "", GetUserSessionToken(c))
	})

	t.Run("POST request without session token should abort", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/test", nil)
		c.Request = req

		sessionHandler := Session()
		sessionHandler(c)

		assert.True(t, c.IsAborted())
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("POST request with session token should pass", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/test", nil)
		req.Header.Set("Only-Session-Token", "test-token-123")
		c.Request = req
		c.Set("UserId", uint(1))

		sessionHandler := Session()
		sessionHandler(c)

		assert.False(t, c.IsAborted())
		assert.Equal(t, "test-token-123", GetUserSessionToken(c))
	})

	t.Run("Successful POST request should bump session version", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/test", nil)
		req.Header.Set("Only-Session-Token", "test-token-456")
		c.Request = req
		c.Set("UserId", uint(2))
		c.Status(http.StatusOK) // Simulate successful response

		sessionHandler := Session()

		// First call to create session
		sessionHandler(c)

		// Verify session was created and version bumped
		userSession, exists := readUserSession(uint(2))
		require.True(t, exists)
		assert.Equal(t, int64(1), userSession.Version)

		// Find the session slot
		idx := userSession.findSessionSlot("test-token-456")
		require.NotEqual(t, -1, idx)
		assert.Equal(t, "test-token-456", userSession.Clients[idx].Token)
		assert.Equal(t, int64(1), userSession.Clients[idx].Version)
	})

	t.Run("Failed POST request should not bump session version", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/test", nil)
		req.Header.Set("Only-Session-Token", "test-token-789")
		c.Request = req
		c.Set("UserId", uint(3))
		c.Status(http.StatusInternalServerError) // Simulate failed response

		sessionHandler := Session()
		sessionHandler(c)

		// Session should not be created for failed requests
		_, exists := readUserSession(uint(3))
		assert.False(t, exists)
	})

	t.Run("Multiple sessions for same user", func(t *testing.T) {
		userID := uint(4)
		tokens := []string{"token1", "token2", "token3", "token4", "token5", "token6"}

		for i, token := range tokens {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			req, _ := http.NewRequest("POST", "/test", nil)
			req.Header.Set("Only-Session-Token", token)
			c.Request = req
			c.Set("UserId", userID)
			c.Status(http.StatusOK)

			sessionHandler := Session()
			sessionHandler(c)

			userSession, exists := readUserSession(userID)
			require.True(t, exists)

			// After 5 sessions, older sessions should be overwritten
			expectedVersion := int64(i + 1)
			assert.Equal(t, expectedVersion, userSession.Version)
		}

		// Verify only the last 5 tokens are stored (token6 overwrote token1)
		userSession, _ := readUserSession(userID)
		assert.Equal(t, -1, userSession.findSessionSlot("token1")) // Should be overwritten
		assert.NotEqual(t, -1, userSession.findSessionSlot("token6"))
	})
}

func TestUserSession(t *testing.T) {
	t.Run("findSessionSlot", func(t *testing.T) {
		session := &userSession{}
		session.Clients[0] = clientSession{Token: "token1"}
		session.Clients[1] = clientSession{Token: "token2"}

		assert.Equal(t, 0, session.findSessionSlot("token1"))
		assert.Equal(t, 1, session.findSessionSlot("token2"))
		assert.Equal(t, -1, session.findSessionSlot("nonexistent"))
	})

	t.Run("newSessionSlot", func(t *testing.T) {
		session := &userSession{Version: 5}

		idx1 := session.newSessionSlot("token1")
		assert.Equal(t, 0, idx1)
		assert.Equal(t, "token1", session.Clients[0].Token)
		assert.Equal(t, int64(5), session.Clients[0].Version)
		assert.Equal(t, 1, session.nextWrite)

		idx2 := session.newSessionSlot("token2")
		assert.Equal(t, 1, idx2)
		assert.Equal(t, "token2", session.Clients[1].Token)
		assert.Equal(t, 2, session.nextWrite)
	})

	t.Run("newSessionSlot wraps around", func(t *testing.T) {
		session := &userSession{Version: 10, nextWrite: 4}

		// Fill the last slot
		idx := session.newSessionSlot("token5")
		assert.Equal(t, 4, idx)
		assert.Equal(t, 0, session.nextWrite) // Should wrap to 0

		// Next slot should overwrite first
		idx = session.newSessionSlot("token6")
		assert.Equal(t, 0, idx)
		assert.Equal(t, "token6", session.Clients[0].Token)
		assert.Equal(t, 1, session.nextWrite)
	})

	t.Run("BumpVersion", func(t *testing.T) {
		session := &userSession{Version: 5}
		session.Clients[0] = clientSession{Version: 5, Token: "token1"}

		session.BumpVersion(0)

		assert.Equal(t, int64(6), session.Version)
		assert.Equal(t, int64(6), session.Clients[0].Version)
	})
}

func TestIsStale(t *testing.T) {
	// Clear global state
	userSessionMap = make(map[uint]*userSession)

	gin.SetMode(gin.TestMode)

	t.Run("No session exists - should be stale", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("UserId", uint(1))
		c.Set("UserSession", "nonexistent-token")

		assert.True(t, IsStale(c))
	})

	t.Run("Session exists but token not found - should be stale", func(t *testing.T) {
		userID := uint(2)
		userSession := writeUserSession(userID)
		userSession.newSessionSlot("existing-token")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("UserId", userID)
		c.Set("UserSession", "different-token")

		assert.True(t, IsStale(c))
	})

	t.Run("Session and token exist but versions mismatch - should be stale", func(t *testing.T) {
		userID := uint(3)
		userSession := writeUserSession(userID)
		idx := userSession.newSessionSlot("test-token")

		// Bump the main version but not the client version
		userSession.Version = 5
		userSession.Clients[idx].Version = 3

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("UserId", userID)
		c.Set("UserSession", "test-token")

		assert.True(t, IsStale(c))
	})

	t.Run("Session and token exist with matching versions - should not be stale", func(t *testing.T) {
		userID := uint(4)
		userSession := writeUserSession(userID)
		idx := userSession.newSessionSlot("fresh-token")

		// Set matching versions
		userSession.Version = 7
		userSession.Clients[idx].Version = 7

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("UserId", userID)
		c.Set("UserSession", "fresh-token")

		assert.False(t, IsStale(c))
	})
}

func TestGetUserSession(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("UserSession", "test-token-value")

	result := GetUserSessionToken(c)
	assert.Equal(t, "test-token-value", result)
}

func TestConcurrentAccess(t *testing.T) {
	// Clear global state
	userSessionMap = make(map[uint]*userSession)

	gin.SetMode(gin.TestMode)
	userID := uint(100)

	// Test concurrent session creation and access
	done := make(chan bool, 10)

	// Create multiple goroutines that try to access/create sessions
	for i := range 10 {
		go func(tokenSuffix int) {
			defer func() { done <- true }()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			req, _ := http.NewRequest("POST", "/test", nil)
			req.Header.Set("Only-Session-Token", "concurrent-token-"+string(rune(tokenSuffix+'0')))
			c.Request = req
			c.Set("UserId", userID)
			c.Status(http.StatusOK)

			sessionHandler := Session()
			sessionHandler(c)
		}(i)
	}

	// Wait for all goroutines to complete
	for range 10 {
		<-done
	}

	// Verify session was created and no race conditions occurred
	userSession, exists := readUserSession(userID)
	assert.True(t, exists)
	assert.True(t, userSession.Version > 0)
}
