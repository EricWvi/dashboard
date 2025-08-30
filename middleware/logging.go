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

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func Logging(c *gin.Context) {
	start := time.Now().UTC()

	// set RequestId and Action
	// Get existing ID or generate new
	requestId := c.GetHeader("X-Request-ID")
	if requestId == "" {
		requestId = uuid.NewString()
	}
	c.Set("RequestId", requestId)
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

	// use blw to retrieve response body
	blw := &bodyLogWriter{
		body:           bytes.NewBufferString(""),
		ResponseWriter: c.Writer,
	}
	c.Writer = blw

	c.Next()

	// Calculates the latency.
	end := time.Now().UTC()
	latency := end.Sub(start)

	// get code and message
	rsp := handler.Response{}
	if err := json.Unmarshal(blw.body.Bytes(), &rsp); err != nil {
		log.Errorf(c, "response body can not unmarshal to handler.Response struct, body: `%s`", blw.body.Bytes())
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
