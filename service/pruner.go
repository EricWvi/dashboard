package service

import (
	"time"

	"github.com/EricWvi/dashboard/log"
	"github.com/EricWvi/dashboard/model"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// PruneScheduler manages pruning tasks
type PruneScheduler struct {
	cron *cron.Cron
	db   *gorm.DB
}

// NewPruneScheduler creates a new prune scheduler instance
func NewPruneScheduler(db *gorm.DB) *PruneScheduler {
	c := cron.New()
	return &PruneScheduler{
		cron: c,
		db:   db,
	}
}

// Start begins the prune scheduler
func (ps *PruneScheduler) Start() {
	// Schedule the tiptap history pruning job to run every day at 2:30 AM
	_, err := ps.cron.AddFunc("30 2 * * *", ps.PruneTiptapHistoryTask)
	if err != nil {
		log.Errorf(log.WorkerCtx, "Failed to schedule tiptap history pruning job: %v", err)
		return
	}

	log.Info(log.WorkerCtx, "Prune scheduler started successfully")
	ps.cron.Start()
}

// Stop gracefully shuts down the prune scheduler
func (ps *PruneScheduler) Stop() {
	ps.cron.Stop()
	log.Info(log.WorkerCtx, "Prune scheduler stopped")
}

// PruneTiptapHistoryTask prunes tiptap history older than 7 days
func (ps *PruneScheduler) PruneTiptapHistoryTask() {
	log.Info(log.WorkerCtx, "Starting tiptap history pruning job")

	// Calculate timestamp for 7 days ago
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	expireTs := sevenDaysAgo.UnixMilli()

	// Execute the pruning
	if rows, err := model.PruneTiptapHistory(ps.db, expireTs); err != nil {
		log.Errorf(log.WorkerCtx, "Failed to prune tiptap history: %v", err)
	} else {
		log.Infof(log.WorkerCtx, "Pruned %d tiptap history entries.", rows)
		log.Info(log.WorkerCtx, "Tiptap history pruning job completed successfully.")
	}
}
