#!/usr/bin/env bash
set -euo pipefail

file_env() {
    local var="$1"
    local file_var="${var}_FILE"
    local default="${2:-}"

    if [ "${!var:-}" ] && [ "${!file_var:-}" ]; then
        echo "ERROR: both $var and $file_var are set"
        exit 1
    fi

    local value="$default"

    if [ "${!var:-}" ]; then
        value="${!var}"
    elif [ "${!file_var:-}" ]; then
        value="$(cat "${!file_var}")"
    fi

    export "$var"="$value"
    unset "$file_var"
}

APP_JAR="${APP_JAR:-/mnt/app/grcpc-app.jar}"
MINIO_DATA_DIR="${MINIO_DATA_DIR:-/var/lib/minio/data}"
MINIO_SERVER_ENABLED="${MINIO_SERVER_ENABLED:-true}"

MINIO_ROOT_USER="${MINIO_ROOT_USER:-${MINIO_ACCESS_KEY:-minioadmin}}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-${MINIO_SECRET_KEY:-minioadmin}}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_PUBLIC_ENDPOINT="${MINIO_PUBLIC_ENDPOINT:-$MINIO_ENDPOINT}"
MINIO_BUCKET="${MINIO_BUCKET:-grcpc-documents}"
MINIO_ENABLED="${MINIO_ENABLED:-true}"

file_env "MINIO_ROOT_USER" "$MINIO_ROOT_USER"
file_env "MINIO_ROOT_PASSWORD" "$MINIO_ROOT_PASSWORD"
file_env "DB_PASSWORD" "${DB_PASSWORD:-}"

MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-$MINIO_ROOT_USER}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-$MINIO_ROOT_PASSWORD}"

export MINIO_ROOT_USER
export MINIO_ROOT_PASSWORD
export MINIO_ACCESS_KEY
export MINIO_SECRET_KEY
export MINIO_ENDPOINT
export MINIO_PUBLIC_ENDPOINT
export MINIO_BUCKET
export MINIO_ENABLED

MINIO_PID=""

if [ "$MINIO_SERVER_ENABLED" = "true" ]; then
    mkdir -p "$MINIO_DATA_DIR"
    chown -R minio:minio "$MINIO_DATA_DIR"

    echo "Starting MinIO..."
    gosu minio minio server "$MINIO_DATA_DIR" --address ":9000" --console-address ":9001" &
    MINIO_PID="$!"

    until curl -fsS "http://localhost:9000/minio/health/live" >/dev/null; do
        sleep 1
    done

    echo "MinIO is ready."
fi

if [ ! -f "$APP_JAR" ]; then
    echo "ERROR: Jar file not found: $APP_JAR"
    echo "Mount your jar directory to /mnt/app and set APP_JAR correctly."
    if [ -n "$MINIO_PID" ]; then
        kill -TERM "$MINIO_PID"
    fi
    exit 1
fi

echo "Starting Java application from mounted jar: $APP_JAR"

java ${JAVA_OPTS:-} -jar "$APP_JAR" &
APP_PID="$!"

shutdown() {
    kill -TERM "$APP_PID" 2>/dev/null || true
    if [ -n "$MINIO_PID" ]; then
        kill -TERM "$MINIO_PID" 2>/dev/null || true
    fi
    wait
}

trap shutdown TERM INT

if [ -n "$MINIO_PID" ]; then
    wait -n "$APP_PID" "$MINIO_PID"
else
    wait -n "$APP_PID"
fi
