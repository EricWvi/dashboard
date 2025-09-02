package user

import (
	"github.com/EricWvi/dashboard/middleware"
	"github.com/gin-gonic/gin"
)

func (b Base) SyncSessionStatus(c *gin.Context, req *UpdateSessionStatusRequest) *UpdateSessionStatusResponse {
	middleware.UpdateSession(c)
	return &UpdateSessionStatusResponse{}
}

type UpdateSessionStatusRequest struct {
}

type UpdateSessionStatusResponse struct {
}
