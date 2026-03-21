package auth

import (
	"os"

	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

func (base Base) Auth(c *gin.Context, req *AuthRequest) *AuthResponse {
	// Get OIDC configuration
	tokenEndpoint := viper.GetString("oidc.tokenEndpoint")
	userinfoEndpoint := viper.GetString("oidc.userinfoEndpoint")
	clientID := viper.GetString("oidc.clientId")
	clientSecret := os.Getenv("DASHBOARD_CLIENT_SECRET")

	if tokenEndpoint == "" || userinfoEndpoint == "" || clientID == "" || clientSecret == "" {
		handler.Errorf(c, "OIDC is not properly configured")
		return nil
	}

	// Step 1: Exchange authorization code for access token
	tokenResp, err := service.ExchangeCodeForToken(tokenEndpoint, req.Code, clientID, clientSecret, req.RedirectURI)
	if err != nil {
		handler.Errorf(c, "failed to exchange code for token: %v", err)
		return nil
	}

	// Step 2: Get user info using access token
	userInfo, err := service.GetUserInfo(userinfoEndpoint, tokenResp.AccessToken)
	if err != nil {
		handler.Errorf(c, "failed to get user info: %v", err)
		return nil
	}

	// Step 3: Encrypt email and return as token
	encryptedToken, err := service.Encrypt(service.Key(), userInfo.Email)
	if err != nil {
		handler.Errorf(c, "failed to encrypt token: %v", err)
		return nil
	}

	return &AuthResponse{
		Token: encryptedToken,
	}
}

type AuthRequest struct {
	Code        string `form:"code" binding:"required"`
	RedirectURI string `form:"redirect_uri" binding:"required"`
}

type AuthResponse struct {
	Token string `json:"token"`
}
