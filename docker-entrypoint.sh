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

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
APP_JAR="${APP_JAR:-/mnt/app/grcpc-app.jar}"

POSTGRES_USER="${POSTGRES_USER:-grcpc}"
POSTGRES_DB="${POSTGRES_DB:-grcpc}"
GRC_SCHEMA="${GRC_SCHEMA:-grc}"

file_env "POSTGRES_PASSWORD"

mkdir -p "$PGDATA"
chown -R postgres:postgres "$PGDATA"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
    if [ -z "${POSTGRES_PASSWORD:-}" ]; then
        echo "ERROR: POSTGRES_PASSWORD is required for first database initialization."
        echo "Set it with -e POSTGRES_PASSWORD=grcpc or POSTGRES_PASSWORD_FILE."
        exit 1
    fi

    echo "Initializing PostgreSQL database..."

    gosu postgres initdb -D "$PGDATA" --encoding=UTF8 --locale=C.UTF-8

    echo "listen_addresses='*'" >> "$PGDATA/postgresql.conf"
    echo "host all all all scram-sha-256" >> "$PGDATA/pg_hba.conf"

    gosu postgres pg_ctl -D "$PGDATA" -w start

    gosu postgres psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres \
        -v app_user="$POSTGRES_USER" \
        -v app_password="$POSTGRES_PASSWORD" \
        -v app_db="$POSTGRES_DB" <<'EOSQL'
CREATE USER :"app_user" WITH PASSWORD :'app_password';
CREATE DATABASE :"app_db" OWNER :"app_user";
EOSQL

    gosu postgres psql -v ON_ERROR_STOP=1 --username postgres --dbname "$POSTGRES_DB" \
        -v app_user="$POSTGRES_USER" \
        -v app_schema="$GRC_SCHEMA" <<'EOSQL'
CREATE SCHEMA IF NOT EXISTS :"app_schema" AUTHORIZATION :"app_user";
ALTER ROLE :"app_user" SET search_path TO :"app_schema", public;
GRANT ALL ON SCHEMA :"app_schema" TO :"app_user";
EOSQL

    gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop

    echo "PostgreSQL initialized."
fi

echo "Starting PostgreSQL..."
gosu postgres postgres -D "$PGDATA" &

POSTGRES_PID="$!"

until gosu postgres pg_isready -q; do
    sleep 1
done

echo "PostgreSQL is ready."

if [ ! -f "$APP_JAR" ]; then
    echo "ERROR: Jar file not found: $APP_JAR"
    echo "Mount your jar directory to /mnt/app and set APP_JAR correctly."
    kill -TERM "$POSTGRES_PID"
    exit 1
fi

echo "Starting Java application from mounted jar: $APP_JAR"

java ${JAVA_OPTS:-} -jar "$APP_JAR" &

APP_PID="$!"

trap 'kill -TERM "$APP_PID" "$POSTGRES_PID"; wait' TERM INT

wait -n "$APP_PID" "$POSTGRES_PID"