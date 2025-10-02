# --- Stage 1: Frontend Builder ---
FROM node:20.19-alpine AS frontend-builder

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

# Copy frontend source and build
COPY client/ ./
RUN npm run build:dashboard
RUN npm run build:journal

# --- Stage 2: Backend Builder ---
FROM golang:1.24-alpine AS backend-builder

# Set working directory
WORKDIR /app

# Copy Go modules files for better caching
COPY go.mod go.sum ./
RUN go mod download

# Accept build args
ARG VERSION
ARG BUILDTIME

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags "-X 'github.com/EricWvi/dashboard/config.Version=${VERSION}' \
		-X 'github.com/EricWvi/dashboard/config.BuildTime=${BUILDTIME}' \
		-w -s -buildid="

# --- Stage 3: Runtime image ---
FROM alpine:latest

# Install a shell and CA certificates
RUN apk add --no-cache bash ca-certificates tzdata

# Set working directory inside container
WORKDIR /app

# Copy the built frontend from frontend-builder
COPY --from=frontend-builder /app/client/dist ./dist
COPY --from=frontend-builder /app/client/journal ./journal
RUN sed -i 's/e\.NavigationRoute(e\.createHandlerBoundToURL("index\.html"))/e.NavigationRoute(e.createHandlerBoundToURL("journal.html"))/g' ./journal/sw.js
# Copy the binary and config from backend-builder
COPY --from=backend-builder /app/dashboard .
COPY --from=backend-builder /app/config.prod.yaml config.yaml

# Expose your web server's port
EXPOSE 8765

ENV GIN_MODE=release

# Default entrypoint: run the server
ENTRYPOINT ["./dashboard"]
