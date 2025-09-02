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

func TestSyncVersion(t *testing.T) {
	// Clear global state
	userSessionMap = make(map[uint]*userSession)
	gin.SetMode(gin.TestMode)

	t.Run("SyncVersion should sync client version with user session version", func(t *testing.T) {
		userSession := &userSession{Version: 10}
		userSession.Clients[0] = clientSession{Version: 5, Token: "test-token"}

		// Sync version for client at index 0
		userSession.SyncVersion(0)

		// Client version should now match user session version
		assert.Equal(t, int64(10), userSession.Clients[0].Version)
		assert.Equal(t, int64(10), userSession.Version) // User session version unchanged
	})

	t.Run("SyncVersion with different versions", func(t *testing.T) {
		userSession := &userSession{Version: 25}
		userSession.Clients[2] = clientSession{Version: 12, Token: "another-token"}

		userSession.SyncVersion(2)

		assert.Equal(t, int64(25), userSession.Clients[2].Version)
	})

	t.Run("SyncVersion thread safety", func(t *testing.T) {
		userSession := &userSession{Version: 50}
		userSession.Clients[1] = clientSession{Version: 20, Token: "thread-token"}

		// Test concurrent sync operations
		done := make(chan bool, 5)

		for range 5 {
			go func() {
				defer func() { done <- true }()
				userSession.SyncVersion(1)
			}()
		}

		// Wait for all goroutines
		for range 5 {
			<-done
		}

		// Final version should be synced
		assert.Equal(t, int64(50), userSession.Clients[1].Version)
	})
}

func TestUpdateSession(t *testing.T) {
	// Clear global state before tests
	userSessionMap = make(map[uint]*userSession)
	gin.SetMode(gin.TestMode)

	t.Run("UpdateSession creates new token when no token exists", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("GET", "/GetUser", nil)
		c.Request = req
		c.Set("UserId", uint(1))
		c.Set("UserSession", "") // No existing token

		token := UpdateSession(c)

		// Should return a new UUID token
		assert.NotEmpty(t, token)
		assert.Len(t, token, 36) // UUID format length

		// Should create user session
		userSession, exists := readUserSession(uint(1))
		require.True(t, exists)

		// Should find the token in session slots
		idx := userSession.findSessionSlot(token)
		assert.NotEqual(t, -1, idx)
	})

	t.Run("UpdateSession with existing token syncs version", func(t *testing.T) {
		userSessionMap = make(map[uint]*userSession) // Reset

		// Setup existing user session with a token
		userSession := writeUserSession(uint(2))
		userSession.Version = 5
		existingToken := "existing-token-123"
		idx := userSession.newSessionSlot(existingToken)
		userSession.Clients[idx].Version = 2 // Out of sync

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/update-session", nil)
		c.Request = req
		c.Set("UserId", uint(2))
		c.Set("UserSession", existingToken)

		token := UpdateSession(c)

		// Should return the same token
		assert.Equal(t, existingToken, token)

		// Should sync the version
		updatedUserSession, _ := readUserSession(uint(2))
		assert.Equal(t, int64(5), updatedUserSession.Clients[idx].Version)
		assert.Equal(t, int64(5), updatedUserSession.Version)
	})

	t.Run("UpdateSession with non-existent token creates new slot", func(t *testing.T) {
		userSessionMap = make(map[uint]*userSession) // Reset

		// Setup existing user session
		userSession := writeUserSession(uint(3))
		userSession.Version = 8
		userSession.newSessionSlot("different-token")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/update-session", nil)
		c.Request = req
		c.Set("UserId", uint(3))
		c.Set("UserSession", "non-existent-token")

		token := UpdateSession(c)

		// Should return the provided token
		assert.Equal(t, "non-existent-token", token)

		// Should create new slot for this token
		updatedUserSession, _ := readUserSession(uint(3))
		idx := updatedUserSession.findSessionSlot("non-existent-token")
		assert.NotEqual(t, -1, idx)
		assert.Equal(t, "non-existent-token", updatedUserSession.Clients[idx].Token)
	})

	t.Run("UpdateSession creates user session if none exists", func(t *testing.T) {
		userSessionMap = make(map[uint]*userSession) // Reset

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/update-session", nil)
		c.Request = req
		c.Set("UserId", uint(4))
		c.Set("UserSession", "new-user-token")

		token := UpdateSession(c)

		assert.Equal(t, "new-user-token", token)

		// Should create new user session
		userSession, exists := readUserSession(uint(4))
		require.True(t, exists)

		// Should find the token
		idx := userSession.findSessionSlot("new-user-token")
		assert.NotEqual(t, -1, idx)
	})
}

func TestSessionWorkflow(t *testing.T) {
	// Test the complete workflow
	userSessionMap = make(map[uint]*userSession)
	gin.SetMode(gin.TestMode)

	userID := uint(100)

	t.Run("Complete session workflow", func(t *testing.T) {
		// Step 1: New client accesses server without Only-Session-Token
		w1 := httptest.NewRecorder()
		c1, _ := gin.CreateTestContext(w1)

		req1, _ := http.NewRequest("GET", "/api/user?Action=GetUser", nil)
		// No Only-Session-Token header set
		c1.Request = req1
		c1.Set("UserId", userID)

		// Server calls UpdateSession to create new token
		newToken := UpdateSession(c1)
		t.Log("newToken ", newToken)

		assert.NotEmpty(t, newToken)
		assert.Len(t, newToken, 36) // UUID format

		// Check session was created
		userSession, exists := readUserSession(userID)
		require.True(t, exists)
		idx := userSession.findSessionSlot(newToken)
		assert.NotEqual(t, -1, idx)

		// Step 2: Client uses the new token for subsequent requests
		w2 := httptest.NewRecorder()
		c2, _ := gin.CreateTestContext(w2)

		req2, _ := http.NewRequest("POST", "/api/action", nil)
		req2.Header.Set("Only-Session-Token", newToken)
		c2.Request = req2
		c2.Set("UserId", userID)
		c2.Status(http.StatusOK)

		// Normal session middleware processing
		sessionHandler := Session()
		sessionHandler(c2)

		assert.False(t, c2.IsAborted())
		assert.Equal(t, newToken, GetUserSessionToken(c2))

		// Session should be bumped
		updatedSession, _ := readUserSession(userID)
		assert.Equal(t, int64(1), updatedSession.Version)

		// Step 3: Check if session is stale (should not be)
		w3 := httptest.NewRecorder()
		c3, _ := gin.CreateTestContext(w3)
		c3.Set("UserId", userID)
		c3.Set("UserSession", newToken)

		isStale := IsStale(c3)
		assert.False(t, isStale, "Session should not be stale")

		// Step 4: Simulate another client action that bumps version
		w4 := httptest.NewRecorder()
		c4, _ := gin.CreateTestContext(w4)

		// Server calls UpdateSession to create another token
		c4.Set("UserId", userID)
		anotherClientToken := UpdateSession(c4)
		t.Log("anotherClientToken ", anotherClientToken)
		req4, _ := http.NewRequest("POST", "/api/another-action", nil)
		req4.Header.Set("Only-Session-Token", anotherClientToken)
		c4.Request = req4
		c4.Status(http.StatusOK)

		sessionHandler(c4)

		// Version should be bumped again
		finalSession, _ := readUserSession(userID)
		assert.Equal(t, int64(2), finalSession.Version)

		// first client should be stale
		assert.True(t, IsStale(c3), "First client now should be stale")

		// Step 5: Use UpdateSession to sync an out-of-sync client
		w5 := httptest.NewRecorder()
		c5, _ := gin.CreateTestContext(w5)
		c5.Set("UserId", userID)
		c5.Set("UserSession", newToken)

		// Should be stale before update
		assert.True(t, IsStale(c5))

		// UpdateSession should sync it
		syncedToken := UpdateSession(c5)
		assert.Equal(t, newToken, syncedToken)

		// Should no longer be stale
		assert.False(t, IsStale(c5))
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
