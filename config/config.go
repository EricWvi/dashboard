package config

import (
	"log/slog"

	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/service"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

func Init() {
	// init config
	if err := LoadCfg(); err != nil {
		panic(err)
	}
	if service.Key() == "" {
		panic("DASHBOARD_ENCRYPT_KEY is not set")
	}

	// logger
	if gin.Mode() == gin.DebugMode {
		log.InitLogger(slog.LevelDebug)
	} else {
		log.InitLogger(slog.LevelInfo)
	}

	InitDB()
}

func LoadCfg() error {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("config")
	viper.AddConfigPath(".")
	if err := viper.ReadInConfig(); err != nil {
		return err
	}

	return nil
}
