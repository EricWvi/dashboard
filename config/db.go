package config

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/EricWvi/dashboard/log"
	"github.com/spf13/viper"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() {
	passwd := os.Getenv("POSTGRES_PASSWORD")
	DB = openDB(
		viper.GetString("db.host"),
		viper.GetString("db.port"),
		viper.GetString("db.username"),
		passwd,
		viper.GetString("db.name"),
	)
}

func openDB(host, port, username, password, name string) *gorm.DB {
	ctx := context.Background()

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=%s",
		host,
		username,
		password,
		name,
		port,
		time.Local)
	log.Info(ctx, "db connection uses timezone "+time.Local.String())

	newLogger := log.NewDBLogger(slog.LevelInfo, logger.Config{
		SlowThreshold: time.Second, // Slow SQL threshold
		LogLevel:      logger.Info, // Log level
		Colorful:      false,       // Disable color
	})

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Error(ctx, err.Error())
		log.Errorf(ctx, "Database connection failed. Database name: %s", name)
		os.Exit(1)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Error(ctx, err.Error())
		log.Error(ctx, "SetMaxIdleConns get an error.")
	} else {
		sqlDB.SetMaxOpenConns(20000)
		sqlDB.SetMaxIdleConns(100)
	}

	log.Info(ctx, "db connected")

	return db
}
