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

file_env "DB_PASSWORD" "${DB_PASSWORD:-}"
file_env "MINIO_ACCESS_KEY" "${MINIO_ACCESS_KEY:-}"
file_env "MINIO_SECRET_KEY" "${MINIO_SECRET_KEY:-}"

exec java ${JAVA_OPTS:-} -jar "$APP_JAR"
