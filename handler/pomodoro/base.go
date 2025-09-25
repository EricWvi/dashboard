package pomodoro

import (
	"github.com/EricWvi/dashboard/handler"
	"github.com/gin-gonic/gin"
)

type Base struct{}

func DefaultHandler(c *gin.Context) {
	handler.Dispatch(c, Base{})
}
