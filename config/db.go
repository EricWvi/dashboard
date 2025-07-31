package config

import (
	"fmt"
	"os"
	"time"

	log "github.com/sirupsen/logrus"
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
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=%s",
		host,
		username,
		password,
		name,
		port,
		time.Local)

	newLogger := logger.New(
		log.StandardLogger(),
		logger.Config{
			SlowThreshold: time.Second, // Slow SQL threshold
			LogLevel:      logger.Info, // Log level
			Colorful:      false,       // Disable color
		},
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Error(err)
		log.Errorf("Database connection failed. Database name: %s", name)
		os.Exit(1)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Error(err)
		log.Errorf("SetMaxIdleConns get an error.")
	} else {
		sqlDB.SetMaxOpenConns(20000)
		sqlDB.SetMaxIdleConns(100)
	}

	log.Info("db connected")

	return db
}
