#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="grcpc-stage"
COMPOSE_FILE="$SCRIPT_DIR/compose.stage.yml"
ENV_FILE="$SCRIPT_DIR/stage.env"
APP_JAR="$SCRIPT_DIR/grcpc-app.jar"
MODE=""
DETACH="false"
JAR_SOURCE=""

usage() {
    cat <<'EOF_USAGE'
GRCPC Stage Environment Runner (Java 21 + MinIO + Nginx, external Oracle)

Usage:
  ./grcpc-app.stage.sh --init-env          Create stage.env from the example
  ./grcpc-app.stage.sh --check-config      Validate stage.env and Compose
  ./grcpc-app.stage.sh --check             Check Oracle connection and temporary-table CRUD
  ./grcpc-app.stage.sh --init              Clean the stage Oracle schema, migrate, and start
  ./grcpc-app.stage.sh --init --detach     Initialize and start in the background
  ./grcpc-app.stage.sh                     Start attached using grcpc-app.jar
  ./grcpc-app.stage.sh --detach            Start in the background
  ./grcpc-app.stage.sh /path/to/app.jar --detach
                                          Copy the selected JAR and start
  ./grcpc-app.stage.sh --status            Show service status
  ./grcpc-app.stage.sh --logs              Follow the latest service logs
  ./grcpc-app.stage.sh --down              Stop and remove stage containers
  ./grcpc-app.stage.sh --help

Attached mode is the default; Ctrl+C stops the services.
--detached and -d are aliases for --detach.
Relative JAR paths are resolved from your current working directory.
Compose, stage.env and the runtime grcpc-app.jar live beside this script.
MinIO files and application logs persist in data/minio and data/app/logs.
Run --down before starting with a replacement JAR. Persistent data is kept.
The application applies packaged Oracle migrations when FLYWAY_ENABLED=true.
--init permanently removes all objects in the configured Oracle schema.
It requires an interactive RESET confirmation and does not erase MinIO files.
--check creates and removes a uniquely named temporary table in that schema.
EOF_USAGE
}

fail() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

set_mode() {
    [[ -z "$MODE" ]] || fail "Choose only one management command."
    MODE="$1"
}

parse_args() {
    while (($# > 0)); do
        case "$1" in
            --help|help|-h) set_mode help ;;
            --init-env|init-env) set_mode init_env ;;
            --init|init) set_mode init ;;
            --check-config|check-config) set_mode check_config ;;
            --check|check) set_mode check ;;
            --status|status|--ps) set_mode status ;;
            --logs|logs) set_mode logs ;;
            --down|down) set_mode down ;;
            --detach|--detached|detach|-d) DETACH="true" ;;
            -*) fail "Unknown option: $1 (use --help)." ;;
            *)
                [[ -z "$JAR_SOURCE" ]] || fail "Only one JAR can be selected."
                # Capture the caller's directory before changing to SCRIPT_DIR.
                if [[ "$1" == /* ]]; then
                    JAR_SOURCE="$1"
                else
                    JAR_SOURCE="$PWD/$1"
                fi
                ;;
        esac
        shift
    done
    MODE="${MODE:-up}"
    if [[ "$MODE" != "up" && "$MODE" != "init" && ( "$DETACH" == "true" || -n "$JAR_SOURCE" ) ]]; then
        fail "A JAR path and --detach are only valid when starting the environment."
    fi
    if [[ "$MODE" == "init" && -n "$JAR_SOURCE" ]]; then
        fail "Place the intended runtime JAR beside this script before --init; a JAR path is not accepted."
    fi
    JAR_SOURCE="${JAR_SOURCE:-$APP_JAR}"
}

compose() {
    sudo env APP_JAR_PATH="$APP_JAR" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" "$@"
}

init_env() {
    if [[ -e "$ENV_FILE" || -L "$ENV_FILE" ]]; then
        [[ -f "$ENV_FILE" && -r "$ENV_FILE" ]] || fail "stage.env is not a readable file."
        echo "Using existing stage.env; its values were preserved."
        return
    fi

    local template="$SCRIPT_DIR/stage.env.example"
    if [[ ! -f "$template" ]]; then
        template="$SCRIPT_DIR/docker/env/stage.env.example"
    fi
    [[ -f "$template" && -r "$template" ]] || fail \
        "Copy docker/env/stage.env.example beside this script as stage.env.example or prepare stage.env."

    # Do not execute the environment file or overwrite a concurrently created one.
    (umask 077; set -C; cat -- "$template" > "$ENV_FILE")
    echo "Created stage.env with owner-only permissions."
    echo "Fill Oracle settings, MinIO credentials and PUBLIC_HOST before starting."
}

check_compose() {
    command -v docker >/dev/null 2>&1 || fail "Docker CLI is not available."
    docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is not available."
    [[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found: $COMPOSE_FILE"
    [[ -f "$ENV_FILE" && -r "$ENV_FILE" ]] || fail "stage.env is not a readable file."
    compose config --quiet
}

require_runtime_jar() {
    [[ -f "$APP_JAR" && -r "$APP_JAR" ]] || fail \
        "Runtime JAR is missing or unreadable: $APP_JAR"
    LC_ALL=C grep -aFq \
        'BOOT-INF/classes/com/digiaudit/grcpc/runtime/StageDatabaseCommand.class' \
        "$APP_JAR" || fail \
        "Runtime JAR lacks the stage database commands. Build and deploy the updated application JAR first."
}

run_db_command() {
    require_runtime_jar
    if [[ "$1" == "init" ]]; then
        compose run --rm --no-deps -e GRCPC_STAGE_DB_INIT_CONFIRMED=RESET \
            --entrypoint java app -jar /opt/grcpc/grcpc-app.jar --stage-db-init
    else
        compose run --rm --no-deps --entrypoint java app \
            -jar /opt/grcpc/grcpc-app.jar --stage-db-check
    fi
}

confirm_init() {
    local answer=""
    [[ -t 0 ]] || fail "--init requires an interactive terminal for destructive confirmation."
    echo "WARNING: --init permanently removes ALL objects and data in the Oracle schema configured by DB_SCHEMA."
    echo "Flyway will rebuild that schema from the packaged migrations; MinIO files are preserved."
    echo "Stop any other application using this schema before continuing."
    read -r -p "Type RESET to continue: " answer || answer=""
    [[ "$answer" == "RESET" ]] || fail "Initialization cancelled; no data was changed."
}

prepare_jar() {
    [[ "${JAR_SOURCE,,}" == *.jar ]] || fail "The selected file must have a .jar extension."
    [[ -f "$JAR_SOURCE" && -r "$JAR_SOURCE" ]] || fail "JAR file is not readable: $JAR_SOURCE"
    [[ ! -d "$APP_JAR" ]] || fail "grcpc-app.jar is a directory; provide an executable JAR file."

    # A stopped container still holds a bind mount to the previous JAR inode.
    # Require its removal before replacing the runtime file, even if it is not running.
    local existing_app
    existing_app="$(compose ps --all --quiet app)"
    [[ -z "$existing_app" ]] || fail \
        "An app container already exists. Run ./grcpc-app.stage.sh --down before starting again."

    if [[ "$JAR_SOURCE" -ef "$APP_JAR" ]]; then
        echo "Using runtime JAR: $APP_JAR"
        return
    fi

    local temporary_jar
    temporary_jar="$(mktemp "$SCRIPT_DIR/.grcpc-stage-jar.XXXXXX")"
    if ! cp -- "$JAR_SOURCE" "$temporary_jar" || ! chmod 644 "$temporary_jar" || ! mv -f -- "$temporary_jar" "$APP_JAR"; then
        rm -f -- "$temporary_jar"
        fail "Could not copy the selected JAR; the previous runtime JAR was preserved."
    fi
    echo "Copied selected JAR to: $APP_JAR"
}

main() {
    parse_args "$@"
    cd -- "$SCRIPT_DIR"

    if [[ "$MODE" == "help" ]]; then
        usage
        return
    fi
    if [[ "$MODE" == "init_env" ]]; then
        init_env
        return
    fi
    if [[ ! -e "$ENV_FILE" && ! -L "$ENV_FILE" ]]; then
        if [[ "$MODE" == "up" || "$MODE" == "check" || "$MODE" == "init" || "$MODE" == "check_config" ]]; then
            init_env
        fi
        fail "Configure stage.env, then run the command again (use --init-env to create it)."
    fi

    check_compose
    if [[ "$MODE" == "check_config" ]]; then
        echo "Stage configuration is valid. Oracle connectivity was not checked."
        return
    fi
    sudo docker info >/dev/null 2>&1 || fail "Docker engine is unavailable or the current user cannot access it."

    case "$MODE" in
        check)
            run_db_command check
            ;;
        init)
            require_runtime_jar
            confirm_init
            compose down
            run_db_command init
            mkdir -p -- "$SCRIPT_DIR/data/minio" "$SCRIPT_DIR/data/app/logs"
            if [[ "$DETACH" == "true" ]]; then
                compose up -d
                compose ps --all
                echo "Schema rebuilt and startup requested. Use --logs to check application readiness."
            else
                echo "Schema rebuilt. Starting attached; press Ctrl+C to stop the services."
                compose up
            fi
            ;;
        status)
            echo "Runtime JAR: $APP_JAR"
            echo "MinIO data: $SCRIPT_DIR/data/minio"
            compose ps --all
            ;;
        logs) compose logs --tail 200 -f ;;
        down)
            echo "Stopping stage containers; persistent data will be preserved."
            compose down
            ;;
        up)
            prepare_jar
            mkdir -p -- "$SCRIPT_DIR/data/minio" "$SCRIPT_DIR/data/app/logs"
            echo "MinIO data: $SCRIPT_DIR/data/minio"
            echo "Application logs: $SCRIPT_DIR/data/app/logs"
            if [[ "$DETACH" == "true" ]]; then
                compose up -d
                compose ps --all
                echo "Startup requested. Use --logs to check Oracle connectivity and application readiness."
            else
                echo "Starting attached. Press Ctrl+C to stop the services."
                compose up
            fi
            ;;
    esac
}

main "$@"
