# --- Stage 1: Builder ---
FROM golang:1.24-alpine AS builder

# Set working directory
WORKDIR /app

COPY . .

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux go build

# --- Stage 2: Runtime image ---
FROM alpine:latest

# Install a shell and CA certificates
RUN apk add --no-cache bash ca-certificates tzdata

# Set the timezone to Asia/Shanghai
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Set working directory inside container
WORKDIR /app

# Copy the binary and the config file from the builder
COPY --from=builder /app/client/dist ./dist
COPY --from=builder /app/dashboard .
COPY --from=builder /app/config.prod.yaml config.yaml

# Expose your web server's port
EXPOSE 8765

# Default entrypoint: run the server
ENTRYPOINT ["./dashboard"]
