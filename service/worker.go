package service

import "context"

var (
	workerLogId = "9c89f949-ea0a-4e2b-b4f2-518dacd64ba8"
	WorkerCtx   = context.WithValue(context.Background(), "RequestId", workerLogId)

	mediaLogId = "d002789b-07b0-4ee1-ae56-66596c956562"
	MediaCtx   = context.WithValue(context.Background(), "RequestId", mediaLogId)
)
