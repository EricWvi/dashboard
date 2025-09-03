package service

import (
	"context"
	"sync"

	"github.com/EricWvi/dashboard/log"
	"gorm.io/gorm"
)

var (
	workerCtx, WorkerCancel = context.WithCancel(context.Background())
	WorkerWg                = sync.WaitGroup{}
)

func StartRePresignWorker(db *gorm.DB) {
	// Initialize MinIO service
	minioService, err := InitMinIOService()
	if err != nil {
		log.Fatalf(log.WorkerCtx, "Failed to initialize MinIO service: %v", err)
	}

	// Initialize and start job scheduler
	jobScheduler := NewJobScheduler(minioService, db)
	// Re-presign expired media files immediately on startup
	jobScheduler.RePresignExpiredMedia()
	jobScheduler.Start()

	// Set up graceful shutdown
	WorkerWg.Add(1)
	go func() {
		<-workerCtx.Done()
		log.Info(log.WorkerCtx, "Shutting down job scheduler...")
		jobScheduler.Stop()
		WorkerWg.Done()
	}()
}

func StartPruneTiptapHistoryWorker(db *gorm.DB) {
	// Initialize and start prune scheduler
	pruneScheduler := NewPruneScheduler(db)
	pruneScheduler.Start()

	// Set up graceful shutdown
	WorkerWg.Add(1)
	go func() {
		<-workerCtx.Done()
		log.Info(log.WorkerCtx, "Shutting down tiptap history prune scheduler...")
		pruneScheduler.Stop()
		WorkerWg.Done()
	}()
}
