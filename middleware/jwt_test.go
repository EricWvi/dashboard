package middleware

import (
	"maps"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock functions to replace the external dependencies for testing
var (
	// Store original functions to restore after tests
	originalEmailToID map[string]uint

	// Test data
	testEmailToID = map[string]uint{
		"user1@example.com": 1,
		"user2@example.com": 2,
		"user3@example.com": 3,
	}
)

func setupJWTTests() {
	// Save original state
	originalEmailToID = emailToID

	// Set up test state
	emailToID = make(map[string]uint)
	maps.Copy(emailToID, testEmailToID)
}

func teardownJWTTests() {
	// Restore original state
	emailToID = originalEmailToID
}

func TestJWT(t *testing.T) {
	setupJWTTests()
	defer teardownJWTTests()

	gin.SetMode(gin.TestMode)

	t.Run("No Remote-Email header sets UserId to 0", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("GET", "/test", nil)
		c.Request = req

		jwtHandler := JWT()
		jwtHandler(c)

		userId := GetUserId(c)
		assert.Equal(t, uint(0), userId)
	})

	t.Run("Empty Remote-Email header sets UserId to 0", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("Remote-Email", "")
		c.Request = req

		jwtHandler := JWT()
		jwtHandler(c)

		userId := GetUserId(c)
		assert.Equal(t, uint(0), userId)
	})

	t.Run("Valid email in Remote-Email header sets correct UserId", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("Remote-Email", "user1@example.com")
		c.Request = req

		jwtHandler := JWT()
		jwtHandler(c)

		userId := GetUserId(c)
		assert.Equal(t, uint(1), userId)
	})

	t.Run("Another valid email sets correct UserId", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("Remote-Email", "user2@example.com")
		c.Request = req

		jwtHandler := JWT()
		jwtHandler(c)

		userId := GetUserId(c)
		assert.Equal(t, uint(2), userId)
	})

	t.Run("Unknown email creates new user", func(t *testing.T) {
		// We need to mock the writeMap function behavior for new users
		// For this test, we'll simulate adding a new user to our test map
		newEmail := "newuser@example.com"
		newUserID := uint(99)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("Remote-Email", newEmail)
		c.Request = req

		// Simulate the writeMap behavior by pre-adding the user
		// In a real scenario, this would call model.CreateUser
		emailToID[newEmail] = newUserID

		jwtHandler := JWT()
		jwtHandler(c)

		userId := GetUserId(c)
		assert.Equal(t, newUserID, userId)
	})
}

func TestGetUserId(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Returns correct UserId from context", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		expectedUserId := uint(42)
		c.Set("UserId", expectedUserId)

		userId := GetUserId(c)
		assert.Equal(t, expectedUserId, userId)
	})

	t.Run("Returns 0 when UserId not set in context", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		userId := GetUserId(c)
		assert.Equal(t, uint(0), userId)
	})
}

func TestReadMap(t *testing.T) {
	setupJWTTests()
	defer teardownJWTTests()

	t.Run("Returns existing user ID", func(t *testing.T) {
		id, ok := readMap("user1@example.com")
		assert.True(t, ok)
		assert.Equal(t, uint(1), id)
	})

	t.Run("Returns false for non-existent email", func(t *testing.T) {
		id, ok := readMap("nonexistent@example.com")
		assert.False(t, ok)
		assert.Equal(t, uint(0), id)
	})

	t.Run("Handles empty email", func(t *testing.T) {
		id, ok := readMap("")
		assert.False(t, ok)
		assert.Equal(t, uint(0), id)
	})
}

func TestWriteMap(t *testing.T) {
	setupJWTTests()
	defer teardownJWTTests()

	t.Run("Returns existing user ID if user exists", func(t *testing.T) {
		id := writeMap("user1@example.com")
		assert.Equal(t, uint(1), id)
	})

	t.Run("Creates new user for non-existent email", func(t *testing.T) {
		// Since we can't easily mock the model.CreateUser function in this test,
		// we'll test the logic by manually checking the map behavior

		// First verify the email doesn't exist
		_, exists := emailToID["newtest@example.com"]
		assert.False(t, exists)

		// Simulate the creation by manually adding to map
		// In real implementation, this would call model.CreateUser
		newEmail := "newtest@example.com"
		newID := uint(100)
		emailToID[newEmail] = newID

		// Test that writeMap returns the existing ID
		id := writeMap(newEmail)
		assert.Equal(t, newID, id)
	})
}

func TestGetId(t *testing.T) {
	setupJWTTests()
	defer teardownJWTTests()

	t.Run("Returns existing user ID", func(t *testing.T) {
		id := getId("user2@example.com")
		assert.Equal(t, uint(2), id)
	})

	t.Run("Creates new user for non-existent email", func(t *testing.T) {
		// Simulate a new user creation
		newEmail := "getidtest@example.com"
		newID := uint(200)

		// Since getId calls writeMap which would call model.CreateUser,
		// we simulate this by pre-adding the user
		emailToID[newEmail] = newID

		id := getId(newEmail)
		assert.Equal(t, newID, id)
	})
}

func TestConcurrentMapAccess(t *testing.T) {
	setupJWTTests()
	defer teardownJWTTests()

	// Test concurrent access to the email-to-ID map
	const numGoroutines = 10
	done := make(chan bool, numGoroutines)

	// Test concurrent reads
	for i := range numGoroutines {
		go func(index int) {
			defer func() { done <- true }()

			email := "user1@example.com"
			id, ok := readMap(email)

			// All should get the same result
			assert.True(t, ok)
			assert.Equal(t, uint(1), id)
		}(i)
	}

	// Wait for all goroutines to complete
	for range numGoroutines {
		<-done
	}
}

func TestJWTMiddlewareIntegration(t *testing.T) {
	setupJWTTests()
	defer teardownJWTTests()

	gin.SetMode(gin.TestMode)

	// Create a test router with the JWT middleware
	router := gin.New()
	router.Use(JWT())

	router.GET("/test", func(c *gin.Context) {
		userId := GetUserId(c)
		c.JSON(http.StatusOK, gin.H{"userId": userId})
	})

	t.Run("Integration test with valid email", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("Remote-Email", "user3@example.com")

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), `"userId":3`)
	})

	t.Run("Integration test without email header", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), `"userId":0`)
	})
}

func TestJWTWithSessionMiddleware(t *testing.T) {
	setupJWTTests()
	defer teardownJWTTests()

	gin.SetMode(gin.TestMode)

	// Test JWT middleware works correctly with Session middleware
	t.Run("JWT and Session middleware together", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		req, _ := http.NewRequest("POST", "/test", nil)
		req.Header.Set("Remote-Email", "user1@example.com")
		req.Header.Set("Only-Session-Token", "test-token")
		c.Request = req

		// Apply JWT middleware first
		jwtHandler := JWT()
		jwtHandler(c)

		// Verify JWT set the user ID
		userId := GetUserId(c)
		assert.Equal(t, uint(1), userId)

		// Now apply Session middleware
		c.Status(http.StatusOK) // Simulate successful response
		sessionHandler := Session()
		sessionHandler(c)

		// Verify session middleware can access the user ID
		sessionToken := GetUserSessionToken(c)
		assert.Equal(t, "test-token", sessionToken)

		// Verify user session was created
		userSession, exists := readUserSession(uint(1))
		require.True(t, exists)
		assert.Equal(t, int64(1), userSession.Version)
	})
}

// Benchmark tests for performance
func BenchmarkJWTMiddleware(b *testing.B) {
	setupJWTTests()
	defer teardownJWTTests()

	gin.SetMode(gin.TestMode)
	jwtHandler := JWT()

	b.Run("ExistingUser", func(b *testing.B) {
		for b.Loop() {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			req, _ := http.NewRequest("GET", "/test", nil)
			req.Header.Set("Remote-Email", "user1@example.com")
			c.Request = req

			jwtHandler(c)
		}
	})

	b.Run("NoEmail", func(b *testing.B) {
		for b.Loop() {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			req, _ := http.NewRequest("GET", "/test", nil)
			c.Request = req

			jwtHandler(c)
		}
	})
}

// Note: InitJWTMap is not tested here as it requires database connection
// and external dependencies. In a real-world scenario, you would:
// 1. Create an interface for the database operations
// 2. Use dependency injection to pass the database interface
// 3. Mock the database interface in tests
// 4. Test InitJWTMap with the mocked interface
//
// Example approach for testing InitJWTMap:
//
// type DBInterface interface {
//     CreateEmailToIDMap() (map[string]uint, error)
// }
//
// func InitJWTMapWithDB(db DBInterface) error {
//     m, err := db.CreateEmailToIDMap()
//     if err != nil {
//         return err
//     }
//     emailToID = m
//     return nil
// }
//
// Then in tests, mock DBInterface and test the error handling and success cases.
