package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/log"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func Logging() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now().UTC()

		// set RequestId and Action
		// Get existing ID or generate new
		if c.GetString("RequestId") == "" {
			c.Set("RequestId", uuid.NewString())
		}
		action := c.Request.URL.Query().Get("Action")
		if len(action) == 0 {
			handler.ReplyError(c, http.StatusBadRequest, "request action is missing")
			c.Abort()
			return
		}
		c.Set("Action", action)

		// log request body
		requestBody, err := io.ReadAll(c.Request.Body)
		if err != nil {
			log.Error(c, "failed to read request body")
			handler.ReplyError(c, http.StatusInternalServerError, "failed to read request body")
			c.Abort()
			return
		}
		// c.Set("RequestBody", string(requestBody))
		c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody)) // restore

		// log request fields
		fields := []any{
			"ip", c.ClientIP(),
		}
		if c.ContentType() == "application/json" {
			fields = append(fields, "body", string(requestBody))
		}
		log.Info(c, c.Request.Method+" "+c.Request.URL.String(), fields...)

		c.Next()

		// Calculates the latency.
		end := time.Now().UTC()
		latency := end.Sub(start)

		// get code and message
		rsp := handler.Response{}
		blw, _ := c.Get("bodyWriter")
		if err := json.Unmarshal(blw.(*bodyWriter).body.Bytes(), &rsp); err != nil {
			log.Errorf(c, "response body can not unmarshal to handler.Response struct, body: `%s`", blw.(*bodyWriter).body.Bytes())
			c.Abort()
		} else {
			fields := []any{
				"code", rsp.Code,
				"latency", latency,
			}
			if rsp.Code >= 400 {
				log.Info(c, rsp.Message.(string), fields...)
			} else {
				log.Info(c, "ok", fields...)
			}
		}
	}
}
