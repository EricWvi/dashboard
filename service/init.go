package service

import (
	"os"

	"github.com/spf13/viper"
)

// InitMinIOService initializes and returns a MinIO service instance
func InitMinIOService() (*MinIOUploader, error) {
	return NewMinIOUploader(MinIOConfig{
		Bucket:          viper.GetString("minio.bucket"),
		AccessKeyID:     viper.GetString("minio.accessKeyID"),
		SecretAccessKey: os.Getenv("DASHBOARD_MINIO_KEY"),
		Endpoint:        viper.GetString("minio.endpoint"),
		UseSSL:          viper.GetBool("minio.secure"),
		Expiry:          viper.GetDuration("minio.expiry"),
	})
}
