package log

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"gorm.io/gorm/logger"
)

type SlogLogger struct {
	inner *slog.Logger
}

func NewSlogLogger(level slog.Level) SlogLogger {
	return SlogLogger{
		inner: slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: level,
		})),
	}
}

var slogger SlogLogger

func (l SlogLogger) Fatal(c context.Context, msg string, args ...any) {
	l.inner.Error(msg, append([]any{"requestId", c.Value("RequestId")}, args...)...)
	os.Exit(1)
}

func (l SlogLogger) Fatalf(c context.Context, format string, args ...any) {
	l.inner.Error(fmt.Sprintf(format, args...), "requestId", c.Value("RequestId"))
	os.Exit(1)
}

func (l SlogLogger) Error(c context.Context, msg string, args ...any) {
	l.inner.Error(msg, append([]any{"requestId", c.Value("RequestId")}, args...)...)
}

func (l SlogLogger) Errorf(c context.Context, format string, args ...any) {
	l.inner.Error(fmt.Sprintf(format, args...), "requestId", c.Value("RequestId"))
}

func (l SlogLogger) Warn(c context.Context, msg string, args ...any) {
	l.inner.Warn(msg, append([]any{"requestId", c.Value("RequestId")}, args...)...)
}

func (l SlogLogger) Warnf(c context.Context, format string, args ...any) {
	l.inner.Warn(fmt.Sprintf(format, args...), "requestId", c.Value("RequestId"))
}

func (l SlogLogger) Info(c context.Context, msg string, args ...any) {
	l.inner.Info(msg, append([]any{"requestId", c.Value("RequestId")}, args...)...)
}

func (l SlogLogger) Infof(c context.Context, format string, args ...any) {
	l.inner.Info(fmt.Sprintf(format, args...), "requestId", c.Value("RequestId"))
}

func (l SlogLogger) Debug(c context.Context, msg string, args ...any) {
	l.inner.Debug(msg, append([]any{"requestId", c.Value("RequestId")}, args...)...)
}

func (l SlogLogger) Debugf(c context.Context, format string, args ...any) {
	l.inner.Debug(fmt.Sprintf(format, args...), "requestId", c.Value("RequestId"))
}

func InitLogger(level slog.Level) {
	slogger = NewSlogLogger(level)
}

func Fatal(c context.Context, msg string, args ...any) {
	slogger.Fatal(c, msg, args...)
}

func Fatalf(c context.Context, format string, args ...any) {
	slogger.Fatalf(c, format, args...)
}

func Error(c context.Context, msg string, args ...any) {
	slogger.Error(c, msg, args...)
}

func Errorf(c context.Context, format string, args ...any) {
	slogger.Errorf(c, format, args...)
}

func Warn(c context.Context, msg string, args ...any) {
	slogger.Warn(c, msg, args...)
}

func Warnf(c context.Context, format string, args ...any) {
	slogger.Warnf(c, format, args...)
}

func Info(c context.Context, msg string, args ...any) {
	slogger.Info(c, msg, args...)
}

func Infof(c context.Context, format string, args ...any) {
	slogger.Infof(c, format, args...)
}

func Debug(c context.Context, msg string, args ...any) {
	slogger.Debug(c, msg, args...)
}

func Debugf(c context.Context, format string, args ...any) {
	slogger.Debugf(c, format, args...)
}

type DBLogger struct {
	logger SlogLogger
	config logger.Config
}

func NewDBLogger(level slog.Level, config logger.Config) *DBLogger {
	return &DBLogger{
		logger: NewSlogLogger(level),
		config: config,
	}
}

func (l *DBLogger) LogMode(level logger.LogLevel) logger.Interface {
	slogLevel := slog.LevelInfo
	switch level {
	case logger.Silent:
		slogLevel = slog.LevelError + 1
	case logger.Error:
		slogLevel = slog.LevelError
	case logger.Warn:
		slogLevel = slog.LevelWarn
	case logger.Info:
		slogLevel = slog.LevelInfo
	default:
	}
	return NewDBLogger(slogLevel, l.config)
}

func (l *DBLogger) Error(ctx context.Context, msg string, args ...any) {
	l.logger.Error(ctx, msg, args...)
}

func (l *DBLogger) Warn(ctx context.Context, msg string, args ...any) {
	l.logger.Warn(ctx, msg, args...)
}

func (l *DBLogger) Info(ctx context.Context, msg string, args ...any) {
	l.logger.Info(ctx, msg, args...)
}

func (l *DBLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	elapsed := time.Since(begin)
	switch {
	case err != nil && (!errors.Is(err, logger.ErrRecordNotFound) || !l.config.IgnoreRecordNotFoundError):
		sql, rows := fc()
		if rows == -1 {
			l.logger.Infof(ctx, "%s [%.3fms] [rows:%v] %s", err, float64(elapsed.Nanoseconds())/1e6, "-", sql)
		} else {
			l.logger.Infof(ctx, "%s [%.3fms] [rows:%v] %s", err, float64(elapsed.Nanoseconds())/1e6, rows, sql)
		}
	case elapsed > l.config.SlowThreshold && l.config.SlowThreshold != 0:
		sql, rows := fc()
		slowLog := fmt.Sprintf("SLOW SQL >= %v", l.config.SlowThreshold)
		if rows == -1 {
			l.logger.Infof(ctx, "%s [%.3fms] [rows:%v] %s", slowLog, float64(elapsed.Nanoseconds())/1e6, "-", sql)
		} else {
			l.logger.Infof(ctx, "%s [%.3fms] [rows:%v] %s", slowLog, float64(elapsed.Nanoseconds())/1e6, rows, sql)
		}
	default:
		sql, rows := fc()
		if rows == -1 {
			l.logger.Infof(ctx, "[%.3fms] [rows:%v] %s", float64(elapsed.Nanoseconds())/1e6, "-", sql)
		} else {
			l.logger.Infof(ctx, "[%.3fms] [rows:%v] %s", float64(elapsed.Nanoseconds())/1e6, rows, sql)
		}
	}
}
