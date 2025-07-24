package main

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/handler/media"
	"github.com/EricWvi/dashboard/handler/todo"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

// Load loads the middlewares, routes, handlers.
func Load(g *gin.Engine, mw ...gin.HandlerFunc) *gin.Engine {
	middleware.InitJWTMap()

	// Middlewares.
	g.Use(gin.Recovery())
	g.Use(mw...)
	g.Use(gzip.Gzip(gzip.DefaultCompression))

	// 404 Handler.
	//g.NoRoute(func(c *gin.Context) {
	//	handler.ReplyError(c, http.StatusNotFound, "The incorrect API route.")
	//})

	// serve spa index.html
	//regexRouter := ginregex.New(g, nil)
	//regexRouter.Any("^/.*$", func(c *gin.Context) {
	//	c.File(viper.GetString("route.front.index"))
	//})
	g.NoRoute(func(c *gin.Context) {
		c.File(viper.GetString("route.front.index"))
	})

	dir := viper.GetString("route.front.dir")
	err := filepath.Walk(dir,
		func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() {
				p := strings.TrimPrefix(path, dir)
				g.StaticFile(p, path)
			}
			return nil
		})
	if err != nil {
		log.Error(err)
		os.Exit(1)
	}

	g.GET("/ping", handler.Ping)
	g.Use(middleware.JWT)

	raw := g.Group(viper.GetString("route.back.base"))
	raw.POST("/upload", media.Upload)
	raw.GET("/m/:link", media.Serve)

	back := g.Group(viper.GetString("route.back.base"))
	back.Use(middleware.Logging)
	back.POST("/media", media.DefaultHandler)
	back.POST("/todo", todo.DefaultHandler)

	return g
}
