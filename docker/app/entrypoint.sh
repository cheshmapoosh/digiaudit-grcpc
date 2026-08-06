#!/usr/bin/env sh
set -eu

file_env() {
    var="$1"
    file_var="${var}_FILE"
    default="${2:-}"

    eval var_value="\${$var:-}"
    eval file_value="\${$file_var:-}"

    if [ -n "$var_value" ] && [ -n "$file_value" ]; then
        echo "ERROR: both $var and $file_var are set"
        exit 1
    fi

    value="$default"

    if [ -n "$var_value" ]; then
        value="$var_value"
    elif [ -n "$file_value" ]; then
        value="$(cat "$file_value")"
    fi

    export "$var=$value"
    unset "$file_var"
}

resolve_app_env() {
    app_var="$1"
    legacy_var="$2"
    default="$3"
    eval app_value="\${$app_var:-}"
    eval legacy_value="\${$legacy_var:-}"

    if [ -n "$app_value" ]; then
        export "$app_var=$app_value"
    elif [ -n "$legacy_value" ]; then
        export "$app_var=$legacy_value"
    else
        export "$app_var=$default"
    fi
}

file_env "DB_PASSWORD" "${DB_PASSWORD:-}"
file_env "MINIO_ACCESS_KEY" "${MINIO_ACCESS_KEY:-}"
file_env "MINIO_SECRET_KEY" "${MINIO_SECRET_KEY:-}"
file_env "MINIO_ROOT_USER" "${MINIO_ROOT_USER:-}"
file_env "MINIO_ROOT_PASSWORD" "${MINIO_ROOT_PASSWORD:-}"
file_env "GRCPC_MINIO_ACCESS_KEY" "${GRCPC_MINIO_ACCESS_KEY:-}"
file_env "GRCPC_MINIO_SECRET_KEY" "${GRCPC_MINIO_SECRET_KEY:-}"

if [ -z "$GRCPC_MINIO_ACCESS_KEY" ]; then
    GRCPC_MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-${MINIO_ROOT_USER:-minioadmin}}"
fi
if [ -z "$GRCPC_MINIO_SECRET_KEY" ]; then
    GRCPC_MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-minioadmin}}"
fi
export GRCPC_MINIO_ACCESS_KEY GRCPC_MINIO_SECRET_KEY

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

exec java ${JAVA_OPTS:-} -jar "$APP_JAR"
