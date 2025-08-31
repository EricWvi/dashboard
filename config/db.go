package config

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	db *gorm.DB

	loggerConfig = logger.Config{
		LogLevel:                  logger.Info,
		SlowThreshold:             time.Second,
		ParameterizedQueries:      true,
		IgnoreRecordNotFoundError: true,
	}
	slogger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
)

func InitDB() {
	passwd := os.Getenv("POSTGRES_PASSWORD")
	db = openDB(
		viper.GetString("db.host"),
		viper.GetString("db.port"),
		viper.GetString("db.username"),
		passwd,
		viper.GetString("db.name"),
	)

	if gin.Mode() == gin.DebugMode {
		loggerConfig.ParameterizedQueries = false
	}
}

func ContextDB(ctx context.Context) *gorm.DB {
	gormLogger := logger.NewSlogLogger(slogger.With("requestId", ctx.Value("RequestId")), loggerConfig)
	return db.Session(&gorm.Session{Logger: gormLogger})
}

func openDB(host, port, username, password, name string) *gorm.DB {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=%s",
		host,
		username,
		password,
		name,
		port,
		time.Local)
	log.Info(service.WorkerCtx, "db connection uses timezone "+time.Local.String())

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.NewSlogLogger(slogger.With("requestId", service.WorkerCtx), loggerConfig),
	})
	if err != nil {
		log.Error(service.WorkerCtx, err.Error())
		log.Errorf(service.WorkerCtx, "Database connection failed. Database name: %s", name)
		os.Exit(1)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Error(service.WorkerCtx, err.Error())
		log.Error(service.WorkerCtx, "SetMaxIdleConns get an error.")
	} else {
		sqlDB.SetMaxOpenConns(20000)
		sqlDB.SetMaxIdleConns(100)
	}

	log.Info(service.WorkerCtx, "db connected")

	return db
}
