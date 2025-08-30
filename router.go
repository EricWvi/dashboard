package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	"github.com/EricWvi/dashboard/handler"
	"github.com/EricWvi/dashboard/handler/blog"
	"github.com/EricWvi/dashboard/handler/bookmark"
	"github.com/EricWvi/dashboard/handler/collection"
	"github.com/EricWvi/dashboard/handler/echo"
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

	// Middlewares.
	g.Use(gin.Recovery())
	g.Use(mw...)
	g.Use(gzip.Gzip(gzip.DefaultCompression))

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
		log.Error(context.Background(), err.Error())
		os.Exit(1)
	}

	g.StaticFile("/", viper.GetString("route.front.index"))

	g.GET("/ping", handler.Ping)
	g.Use(middleware.JWT)

	raw := g.Group(viper.GetString("route.back.base"))
	raw.POST("/upload", media.Upload)
	raw.GET("/m/:link", media.Serve)

	back := g.Group(viper.GetString("route.back.base"))
	back.Use(middleware.Logging)
	back.POST("/user", user.DefaultHandler)
	back.POST("/media", media.DefaultHandler)
	back.POST("/todo", todo.DefaultHandler)
	back.POST("/watch", watch.DefaultHandler)
	back.POST("/echo", echo.DefaultHandler)
	back.POST("/collection", collection.DefaultHandler)
	back.POST("/tiptap", tiptap.DefaultHandler)
	back.POST("/bookmark", bookmark.DefaultHandler)
	back.POST("/blog", blog.DefaultHandler)

	return g
}
