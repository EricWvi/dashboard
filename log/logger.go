package log

import (
	"context"
	"fmt"
	"log/slog"
	"os"
)

var slogger *slog.Logger

func InitLogger(level slog.Level) {
	slogger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	}))
}

func Fatal(c context.Context, msg string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Error(msg, args...)
	os.Exit(1)
}

func Fatalf(c context.Context, format string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Error(fmt.Sprintf(format, args...))
	os.Exit(1)
}

func Error(c context.Context, msg string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Error(msg, args...)
}

func Errorf(c context.Context, format string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Error(fmt.Sprintf(format, args...))
}

func Warn(c context.Context, msg string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Warn(msg, args...)
}

func Warnf(c context.Context, format string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Warn(fmt.Sprintf(format, args...))
}

func Info(c context.Context, msg string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Info(msg, args...)
}

func Infof(c context.Context, format string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Info(fmt.Sprintf(format, args...))
}

func Debug(c context.Context, msg string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Debug(msg, args...)
}

func Debugf(c context.Context, format string, args ...any) {
	slogger.With("requestId", c.Value("RequestId")).Debug(fmt.Sprintf(format, args...))
}
