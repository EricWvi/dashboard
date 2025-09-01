package user

import (
	"github.com/EricWvi/dashboard/middleware"
	"github.com/gin-gonic/gin"
)

func (b Base) GetSessionStatus(c *gin.Context, req *GetSessionStatusRequest) *GetSessionStatusResponse {
	return &GetSessionStatusResponse{
		Stale: middleware.IsStale(c),
	}
}

type GetSessionStatusRequest struct {
}

type GetSessionStatusResponse struct {
	Stale bool `json:"stale"`
}
