package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"

	log "github.com/sirupsen/logrus"

	"github.com/gin-gonic/gin"
)

type Response struct {
	RequestId string `json:"requestId"`
	Code      int    `json:"code"`
	Message   any    `json:"message"`
}

func Dispatch(c *gin.Context, base any) {
	body := []byte(c.GetString("RequestBody"))

	method := reflect.ValueOf(base).MethodByName(c.GetString("Action"))
	if !method.IsValid() {
		ReplyError(c, http.StatusNotFound, "request action does not exist")
	} else {
		ctx := reflect.ValueOf(c)
		var ptr reflect.Value
		if c.ContentType() == "application/json" || len(body) == 0 {
			Type := method.Type()
			param := Type.In(1).Elem()
			p, err := parse(body, param)
			if err != nil {
				ReplyError(c, http.StatusBadRequest, "failed to parse request body: "+err.Error())
				return
			}
			ptr = p
			log.Debugf("%#v", ptr.Elem())
		} else {
			ptr = reflect.ValueOf(body)
		}
		rst := method.Call([]reflect.Value{ctx, ptr})[0]
		if !c.IsAborted() {
			c.JSON(http.StatusOK, Response{
				RequestId: c.GetString("RequestId"),
				Code:      http.StatusOK,
				Message:   rst.Interface(),
			})
		}
	}
}

func ReplyError(c *gin.Context, code int, msg string) {
	c.JSON(code, Response{
		RequestId: c.GetString("RequestId"),
		Code:      code,
		Message:   msg,
	})
}

func ReplyString(c *gin.Context, code int, msg string) {
	c.JSON(http.StatusOK, Response{
		RequestId: c.GetString("RequestId"),
		Code:      code,
		Message:   msg,
	})
}

func Errorf(c *gin.Context, format string, a ...any) {
	ReplyString(c, http.StatusBadRequest, fmt.Sprintf(format, a...))
	c.Abort()
}

// TODO validator
func parse(body []byte, param reflect.Type) (reflect.Value, error) {
	ptr := reflect.New(param).Interface()
	if len(body) != 0 {
		err := json.Unmarshal(body, &ptr)
		if err != nil {
			log.Error(err)
			return reflect.Value{}, err
		}
	}
	return reflect.ValueOf(ptr), nil
}
