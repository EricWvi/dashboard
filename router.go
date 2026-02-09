package main

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/handler/blog"
	"github.com/EricWvi/dashboard/handler/bookmark"
	"github.com/EricWvi/dashboard/handler/card"
	"github.com/EricWvi/dashboard/handler/collection"
	"github.com/EricWvi/dashboard/handler/echo"
	"github.com/EricWvi/dashboard/handler/entry"
	"github.com/EricWvi/dashboard/handler/flomo"
	"github.com/EricWvi/dashboard/handler/media"
	"github.com/EricWvi/dashboard/handler/tiptap"
	"github.com/EricWvi/dashboard/handler/todo"
	"github.com/EricWvi/dashboard/handler/user"
	"github.com/EricWvi/dashboard/handler/watch"
	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

// Load loads the middlewares, routes, handlers.
func Load(g *gin.Engine, mw ...gin.HandlerFunc) *gin.Engine {
	middleware.InitJWTMap()

	// Basic Middlewares.
	g.Use(gin.Recovery())
	g.Use(mw...)
	g.Use(gzip.Gzip(gzip.DefaultCompression))

	// serve front dist
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
		log.Error(log.WorkerCtx, err.Error())
		os.Exit(1)
	}
	dir = viper.GetString("route.journal.dir")
	err = filepath.Walk(dir,
		func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() {
				p := strings.TrimPrefix(path, dir)
				g.StaticFile("/journal"+p, path)
			}
			return nil
		})
	if err != nil {
		log.Error(log.WorkerCtx, err.Error())
		os.Exit(1)
	}

	// serve index.html at root path
	g.StaticFile("/", viper.GetString("route.front.index"))
	g.StaticFile("/journal/", viper.GetString("route.journal.index"))

	g.GET("/ping", handler.Ping)
	// middleware.BodyWriter retrieves response body
	g.Use(middleware.BodyWriter())
	// middleware.JWT inject user ID
	g.Use(middleware.JWT())
	// middleware.Idempotency handles idempotency key
	g.Use(middleware.Idempotency())

	raw := g.Group(viper.GetString("route.back.base"))
	raw.POST("/upload", media.Upload)
	raw.GET("/m/:link", media.Serve)

	back := g.Group(viper.GetString("route.back.base"))
	// middleware.Logging logs request and response
	back.Use(middleware.Logging())
	// middleware.Session maintains session status
	back.Use(middleware.Session())

	back.GET("/user", user.DefaultHandler)
	back.POST("/user", user.DefaultHandler)
	back.GET("/media", media.DefaultHandler)
	back.POST("/media", media.DefaultHandler)
	back.GET("/todo", todo.DefaultHandler)
	back.POST("/todo", todo.DefaultHandler)
	back.GET("/watch", watch.DefaultHandler)
	back.POST("/watch", watch.DefaultHandler)
	back.GET("/echo", echo.DefaultHandler)
	back.POST("/echo", echo.DefaultHandler)
	back.GET("/collection", collection.DefaultHandler)
	back.POST("/collection", collection.DefaultHandler)
	back.GET("/tiptap", tiptap.DefaultHandler)
	back.POST("/tiptap", tiptap.DefaultHandler)
	back.GET("/bookmark", bookmark.DefaultHandler)
	back.POST("/bookmark", bookmark.DefaultHandler)
	back.GET("/blog", blog.DefaultHandler)
	back.POST("/blog", blog.DefaultHandler)
	back.GET("/entry", entry.DefaultHandler)
	back.POST("/entry", entry.DefaultHandler)
	back.GET("/card", card.DefaultHandler)
	back.POST("/card", card.DefaultHandler)
	back.GET("/flomo", flomo.DefaultHandler)
	back.POST("/flomo", flomo.DefaultHandler)

	// Handle 404 for all unmatched routes
	g.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{
			"code":    404,
			"message": "404 page not found - Gin Server",
		})
	})

	return g
}
