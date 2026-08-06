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

resolve_app_env() {
    local app_var="$1"
    local legacy_var="$2"
    local default="$3"
    local app_value="${!app_var:-}"
    local legacy_value="${!legacy_var:-}"

    if [ -n "$app_value" ]; then
        export "$app_var"="$app_value"
    elif [ -n "$legacy_value" ]; then
        export "$app_var"="$legacy_value"
    else
        export "$app_var"="$default"
    fi
}

APP_JAR="${APP_JAR:-/mnt/app/grcpc-app.jar}"
MINIO_DATA_DIR="${MINIO_DATA_DIR:-/var/lib/minio/data}"
MINIO_SERVER_ENABLED="${MINIO_SERVER_ENABLED:-true}"

file_env "MINIO_ACCESS_KEY" ""
file_env "MINIO_SECRET_KEY" ""
file_env "MINIO_ROOT_USER" "${MINIO_ACCESS_KEY:-minioadmin}"
file_env "MINIO_ROOT_PASSWORD" "${MINIO_SECRET_KEY:-minioadmin}"
file_env "GRCPC_MINIO_ACCESS_KEY" ""
file_env "GRCPC_MINIO_SECRET_KEY" ""
file_env "DB_PASSWORD" "${DB_PASSWORD:-}"

if [ -z "$GRCPC_MINIO_ACCESS_KEY" ]; then
    GRCPC_MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-$MINIO_ROOT_USER}"
fi
if [ -z "$GRCPC_MINIO_SECRET_KEY" ]; then
    GRCPC_MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-$MINIO_ROOT_PASSWORD}"
fi

resolve_app_env "GRCPC_MINIO_ENABLED" "MINIO_ENABLED" "true"
resolve_app_env "GRCPC_MINIO_ENDPOINT" "MINIO_ENDPOINT" "http://localhost:9000"
resolve_app_env "GRCPC_MINIO_PUBLIC_ENDPOINT" "MINIO_PUBLIC_ENDPOINT" "$GRCPC_MINIO_ENDPOINT"
resolve_app_env "GRCPC_MINIO_BUCKET" "MINIO_BUCKET" "grc-documents"
resolve_app_env "GRCPC_MINIO_PRESIGNED_URL_EXPIRY_MINUTES" "MINIO_PRESIGNED_URL_EXPIRY_MINUTES" "15"
resolve_app_env "GRCPC_MINIO_DEFAULT_MAX_UPLOAD_SIZE_MB" "MINIO_DEFAULT_MAX_UPLOAD_SIZE_MB" "25"
resolve_app_env "GRCPC_MINIO_TEMP_TTL_MINUTES" "MINIO_TEMP_TTL_MINUTES" "120"
resolve_app_env "GRCPC_MINIO_TEMPORARY_PREFIX" "MINIO_TEMPORARY_PREFIX" "master-data/document/temp"
resolve_app_env "GRCPC_MINIO_PERMANENT_PREFIX" "MINIO_PERMANENT_PREFIX" "master-data/document/permanent"
resolve_app_env "GRCPC_MINIO_LIFECYCLE_MODE" "MINIO_LIFECYCLE_MODE" "APPLY"
resolve_app_env "GRCPC_MINIO_TEMP_EXPIRATION_ENABLED" "MINIO_TEMP_EXPIRATION_ENABLED" "true"
resolve_app_env "GRCPC_MINIO_TEMP_EXPIRATION_RULE_ID" "MINIO_TEMP_EXPIRATION_RULE_ID" "grcpc-temp-object-expiration"
resolve_app_env "GRCPC_MINIO_TEMP_EXPIRATION_DAYS" "MINIO_TEMP_EXPIRATION_DAYS" "2"

export MINIO_ROOT_USER
export MINIO_ROOT_PASSWORD
export GRCPC_MINIO_ACCESS_KEY
export GRCPC_MINIO_SECRET_KEY

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
