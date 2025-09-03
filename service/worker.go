package service

import "context"

type contextKey string

const requestIDKey contextKey = "RequestId"

var (
	workerLogId = "9c89f949-ea0a-4e2b-b4f2-518dacd64ba8"
	WorkerCtx   = context.WithValue(context.Background(), requestIDKey, workerLogId)

	mediaLogId = "d002789b-07b0-4ee1-ae56-66596c956562"
	MediaCtx   = context.WithValue(context.Background(), requestIDKey, mediaLogId)

	IdemLogId = "55483de4-93c3-4ef3-bb24-99a3ce7b6e56"
	IdemCtx   = context.WithValue(context.Background(), requestIDKey, IdemLogId)
)
