package main

import (
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/EricWvi/dashboard/config"
	"github.com/EricWvi/dashboard/migration"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

func main() {
	// init
	config.Init()

	// Run migrations
	if err := runMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize MinIO service
	minioService, err := service.InitMinIOService()
	if err != nil {
		log.Fatalf("Failed to initialize MinIO service: %v", err)
	}

	// Initialize and start job scheduler
	jobScheduler := service.NewJobScheduler(minioService, config.DB)
	// Re-presign expired media files immediately on startup
	jobScheduler.RePresignExpiredMedia()
	jobScheduler.Start()

	// Set up graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		log.Info("Shutting down job scheduler...")
		jobScheduler.Stop()
		os.Exit(0)
	}()

	// gin
	g := gin.New()
	Load(g, gin.LoggerWithWriter(log.StandardLogger().Out))

	addr := viper.GetString("addr")

	log.Infof("Start to listening the incoming requests on http address: %s", addr)
	log.Info(http.ListenAndServe(addr, g).Error())
}

func runMigrations() error {
	migrator := migration.NewMigrator(config.DB)

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
