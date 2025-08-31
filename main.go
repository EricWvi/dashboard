package main

import (
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/migration"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

func main() {
	// init
	config.Init()

	// Run migrations
	if err := runMigrations(); err != nil {
		log.Fatalf(service.WorkerCtx, "Failed to run migrations: %v", err)
	}

	// Initialize MinIO service
	minioService, err := service.InitMinIOService()
	if err != nil {
		log.Fatalf(service.WorkerCtx, "Failed to initialize MinIO service: %v", err)
	}

	// Initialize and start job scheduler
	jobScheduler := service.NewJobScheduler(minioService, config.ContextDB(service.WorkerCtx))
	// Re-presign expired media files immediately on startup
	jobScheduler.RePresignExpiredMedia()
	jobScheduler.Start()

	// Set up graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		log.Info(service.WorkerCtx, "Shutting down job scheduler...")
		jobScheduler.Stop()
		os.Exit(0)
	}()

	// gin
	g := gin.New()
	Load(g)

	addr := viper.GetString("addr")

	log.Infof(service.WorkerCtx, "Start to listening the incoming requests on http address: %s", addr)
	log.Error(service.WorkerCtx, http.ListenAndServe(addr, g).Error())
}

func runMigrations() error {
	migrator := migration.NewMigrator(config.ContextDB(service.WorkerCtx))

	// Add all migrations
	migrations := migration.GetAllMigrations()
	for _, m := range migrations {
		migrator.AddMigration(m)
	}

	// Run migrations
	if err := migrator.Up(); err != nil {
		return err
	}

	return nil
}
