package service

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinIOConfig holds the configuration for MinIO connection
type MinIOConfig struct {
	Bucket          string
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	UseSSL          bool
	Expiry          time.Duration
}

// MinIOUploader wraps the MinIO client
type MinIOUploader struct {
	client *minio.Client
	bucket string
	expiry time.Duration
}

// NewMinIOUploader creates a new MinIO uploader instance
func NewMinIOUploader(config MinIOConfig) (*MinIOUploader, error) {
	// Initialize MinIO client
	minioClient, err := minio.New(config.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.AccessKeyID, config.SecretAccessKey, ""),
		Secure: config.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	return &MinIOUploader{client: minioClient, bucket: config.Bucket, expiry: config.Expiry}, nil
}

// UploadFromReader uploads a file to MinIO bucket from an io.Reader
func (m *MinIOUploader) UploadFromReader(ctx context.Context, objectName string, reader io.Reader, size int64, contentType string) error {
	_, err := m.client.PutObject(ctx, m.bucket, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	return nil
}

// UploadMultipartFile uploads a file from multipart form data
func (m *MinIOUploader) UploadMultipartFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open multipart file: %w", err)
	}
	defer file.Close()

	// Determine content type from filename or use the provided content type
	contentType := getContentTypeFromFilename(fileHeader.Filename)
	if contentType == "application/octet-stream" && len(fileHeader.Header.Get("Content-Type")) > 0 {
		contentType = fileHeader.Header.Get("Content-Type")
	}

	now := time.Now()
	fileKey := fmt.Sprintf("%d/%02d/%d_%s", now.Year(), now.Month(), now.Unix(), fileHeader.Filename)
	if len(fileKey) > 1000 {
		return "", fmt.Errorf("file key exceeds maximum length of 1000 characters")
	}

	return fileKey, m.UploadFromReader(ctx, fileKey, file, fileHeader.Size, contentType)
}

// getContentTypeFromFilename determines the content type based on filename
func getContentTypeFromFilename(filename string) string {
	ext := filepath.Ext(filename)
	return getContentTypeFromExtension(ext)
}

// getContentTypeFromExtension determines the content type based on file extension
func getContentTypeFromExtension(ext string) string {
	ext = strings.ToLower(ext)
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".mp4":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".avi":
		return "video/x-msvideo"
	default:
		return "application/octet-stream"
	}
}

// DeleteObject deletes an object from the MinIO bucket
func (m *MinIOUploader) DeleteObject(ctx context.Context, objectName string) error {
	err := m.client.RemoveObject(ctx, m.bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object %s: %w", objectName, err)
	}

	return nil
}

// PresignObject generates a presigned URL for an object in the MinIO bucket
func (m *MinIOUploader) PresignObject(ctx context.Context, objectName string) (string, error) {
	presignedURL, err := m.client.PresignedGetObject(ctx, m.bucket, objectName, m.expiry, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL for object %s: %w", objectName, err)
	}
	return presignedURL.String(), nil
}
