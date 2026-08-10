#!/usr/bin/env bash

set -u
set -o pipefail

PROJECT_NAME="grcpc-test"
COMPOSE_FILE="compose.test.yml"
APP_JAR="grcpc-app.jar"
SELECTED_JAR_FILE=".grcpc-selected-jar.txt"
MODE="up"
RESET_DATA="false"
DETACH="false"
JAR_SOURCE=""
JAR_SOURCE_NAME=""

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPT_DIR" || exit 1

usage() {
    cat <<'EOF'

============================================================
GRCPC Test Environment Runner
============================================================

Default behavior is ATTACHED mode.
It starts:
  1. Oracle Database
  2. MinIO Object Storage
  3. GRCPC Spring Boot Application

------------------------------------------------------------
Expected files in the same folder
------------------------------------------------------------

  grcpc-app.test.sh
  compose.test.yml
  grcpc-app.jar

If no jar argument is supplied, ./grcpc-app.jar is selected automatically.
Another relative jar can also be supplied; it is copied to ./grcpc-app.jar.

------------------------------------------------------------
Attached mode - default
------------------------------------------------------------

  ./grcpc-app.test.sh
  ./grcpc-app.test.sh grcpc-app.jar
      These commands are equivalent.
      Start in attached mode and show Compose logs in this terminal.
      Press Ctrl+C to stop and remove the environment containers.

  ./grcpc-app.test.sh grcpc-app-1.1.0.jar
      Copy the selected jar to ./grcpc-app.jar and start attached.

------------------------------------------------------------
Detached mode
------------------------------------------------------------

  ./grcpc-app.test.sh --detach
  ./grcpc-app.test.sh grcpc-app.jar --detach
      These commands are equivalent.
      Start in background and return to the shell.

  ./grcpc-app.test.sh grcpc-app-1.1.0.jar --detach
      Copy the selected jar and start in background.

------------------------------------------------------------
Reset database and local data
------------------------------------------------------------

  ./grcpc-app.test.sh --reset
  ./grcpc-app.test.sh grcpc-app.jar --reset
      These commands are equivalent.
      Delete Oracle data, MinIO data, and app logs, then start attached.

  ./grcpc-app.test.sh --reset --detach
  ./grcpc-app.test.sh grcpc-app.jar --reset --detach
      Reset all local data and start detached.

  ./grcpc-app.test.sh grcpc-app-1.1.0.jar --reset
      Reset all local data, select the given jar, then start attached.

------------------------------------------------------------
Management commands
------------------------------------------------------------

  ./grcpc-app.test.sh --status
  ./grcpc-app.test.sh --ps
      Show service status and selected executable jar name.

  ./grcpc-app.test.sh --logs
      Follow logs of a detached environment.

  ./grcpc-app.test.sh --down
      Stop and remove containers. Local persistent data is preserved.

  ./grcpc-app.test.sh --help
      Show this help message.

------------------------------------------------------------
URLs
------------------------------------------------------------

  App URL:       http://localhost:8080
  Oracle:        localhost:1521 / FREEPDB1 / GRCPC
  MinIO API:     http://localhost:9000
  MinIO Console: http://localhost:9001

EOF
}

parse_args() {
    while (($# > 0)); do
        case "$1" in
            --help|help|-h)
                MODE="help"
                ;;
            --status|status|--ps)
                MODE="status"
                ;;
            --logs|logs)
                MODE="logs"
                ;;
            --down|down)
                MODE="down"
                ;;
            --reset|reset)
                RESET_DATA="true"
                ;;
            --detach|detach)
                DETACH="true"
                ;;
            *)
                if [[ -n "$JAR_SOURCE" ]]; then
                    echo "ERROR: Only one jar file can be selected."
                    echo "First jar:  $JAR_SOURCE"
                    echo "Second arg: $1"
                    echo
                    usage
                    return 1
                fi

                if [[ -e "$1" ]]; then
                    JAR_SOURCE="$1"
                    JAR_SOURCE_NAME="$(basename -- "$1")"
                else
                    echo "ERROR: Unknown argument or file not found: $1"
                    echo
                    usage
                    return 1
                fi
                ;;
        esac
        shift
    done

    if [[ "$MODE" == "up" && -z "$JAR_SOURCE" ]]; then
        JAR_SOURCE="$APP_JAR"
        JAR_SOURCE_NAME="$APP_JAR"
    fi

    return 0
}

compose() {
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" "$@"
}

check_docker() {
    echo "Checking Docker CLI..."
    if ! command -v docker >/dev/null 2>&1; then
        echo "ERROR: Docker CLI is not available."
        echo "Install Docker Engine or Docker Desktop and make sure docker is in PATH."
        return 1
    fi

    echo "Checking Docker Compose plugin..."
    if ! docker compose version >/dev/null 2>&1; then
        echo "ERROR: Docker Compose v2 plugin is not available."
        echo "Install the Docker Compose v2 plugin."
        return 1
    fi

    echo "Checking Docker engine..."
    if ! docker info >/dev/null 2>&1; then
        echo "ERROR: Docker engine is not running or the current user cannot access it."
        echo "Start Docker and verify that 'docker info' succeeds without sudo."
        return 1
    fi

    echo "Docker engine is ready."
    return 0
}

prepare_dirs() {
    mkdir -p \
        data/oracle/oradata \
        data/minio \
        data/app/logs
}

prepare_jar() {
    if [[ -n "$JAR_SOURCE" ]]; then
        if [[ "${JAR_SOURCE,,}" != *.jar ]]; then
            echo "ERROR: The selected file is not a .jar file:"
            echo "$JAR_SOURCE"
            return 1
        fi

        if [[ ! -f "$JAR_SOURCE" ]]; then
            echo "ERROR: Jar file not found:"
            echo "$SCRIPT_DIR/$JAR_SOURCE"
            return 1
        fi

        local source_full target_full
        source_full="$(realpath -m -- "$JAR_SOURCE")"
        target_full="$(realpath -m -- "$APP_JAR")"

        echo
        echo "Selected jar: $JAR_SOURCE"
        echo "Executable runtime jar: $APP_JAR"

        if [[ "$source_full" == "$target_full" ]]; then
            echo "Selected jar is already the executable runtime jar."
        else
            echo "Copying selected jar to runtime file..."
            if ! cp -f -- "$JAR_SOURCE" "$APP_JAR"; then
                echo "ERROR: Failed to copy jar."
                return 1
            fi
        fi

        printf '%s\n' "$JAR_SOURCE_NAME" > "$SELECTED_JAR_FILE"
    fi

    if [[ ! -f "$APP_JAR" ]]; then
        echo "ERROR: Jar file not found:"
        echo "$SCRIPT_DIR/$APP_JAR"
        echo
        echo "Put the built jar beside this script with this exact name:"
        echo "$APP_JAR"
        echo
        echo "Or pass another relative jar file name:"
        echo "./grcpc-app.test.sh grcpc-app-1.1.0.jar"
        return 1
    fi

    if [[ ! -f "$SELECTED_JAR_FILE" ]]; then
        printf '%s\n' "$APP_JAR" > "$SELECTED_JAR_FILE"
    fi

    return 0
}

load_selected_jar_name() {
    SELECTED_JAR_NAME="$APP_JAR"
    if [[ -f "$SELECTED_JAR_FILE" ]]; then
        IFS= read -r SELECTED_JAR_NAME < "$SELECTED_JAR_FILE" || true
    fi
    if [[ -z "${SELECTED_JAR_NAME:-}" ]]; then
        SELECTED_JAR_NAME="$APP_JAR"
    fi
}

print_jar_info() {
    load_selected_jar_name
    echo "Executable jar name: $SELECTED_JAR_NAME"
    echo "Runtime mounted jar: $APP_JAR"
    echo "Runtime jar path:   $SCRIPT_DIR/$APP_JAR"

    if [[ -f "$APP_JAR" ]]; then
        local size modified
        size="$(stat -c '%s' "$APP_JAR" 2>/dev/null || wc -c < "$APP_JAR")"
        modified="$(stat -c '%y' "$APP_JAR" 2>/dev/null || true)"
        echo "Runtime jar size:   $size bytes"
        if [[ -n "$modified" ]]; then
            echo "Runtime jar time:   $modified"
        fi
    else
        echo "Runtime jar status: NOT FOUND"
    fi
}

is_environment_running() {
    [[ -n "$(compose ps --status running -q 2>/dev/null | head -n 1)" ]]
}

compose_status() {
    echo
    echo "============================================================"
    echo "GRCPC Test Environment Status"
    echo "============================================================"
    echo
    print_jar_info
    echo

    if is_environment_running; then
        echo "Environment status: RUNNING"
        echo
        echo "To stop it, run:"
        echo "  ./grcpc-app.test.sh --down"
    else
        echo "Environment status: NOT RUNNING"
        echo
        echo "To start it, run:"
        echo "  ./grcpc-app.test.sh"
    fi

    echo
    echo "Docker Compose services:"
    compose ps --all
}

compose_down() {
    echo "Stopping GRCPC test environment..."
    compose down --remove-orphans
}

compose_logs() {
    echo "Showing GRCPC test logs..."
    compose logs -f
}

check_app_container() {
    local status
    status="$(docker inspect -f '{{.State.Status}}' grcpc-test-app 2>/dev/null || true)"
    if [[ "$status" != "running" ]]; then
        echo
        echo "WARNING: App container status is: ${status:-unknown}"
        echo "The application container is not stable."
        echo "Check logs with:"
        echo "  ./grcpc-app.test.sh --logs"
    fi
}

wait_for_app_port() {
    echo
    echo "Waiting for application port 8080..."

    local i
    for ((i = 1; i <= 180; i++)); do
        if timeout 1 bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080' >/dev/null 2>&1; then
            echo "Application port is open."
            sleep 3
            check_app_container
            return 0
        fi

        echo "Waiting for app... $i/180"
        sleep 2
    done

    echo "WARNING: Application port 8080 is not open yet."
    echo "Check status and logs with:"
    echo "  ./grcpc-app.test.sh --status"
    echo "  ./grcpc-app.test.sh --logs"
    return 0
}

ATTACHED_CLEANED_UP="false"

cleanup_attached() {
    if [[ "$ATTACHED_CLEANED_UP" == "true" ]]; then
        return 0
    fi
    ATTACHED_CLEANED_UP="true"

    echo
    echo "Attached session ended. Ensuring GRCPC services are stopped..."
    compose down --remove-orphans >/dev/null 2>&1 || true
    echo "GRCPC test environment is stopped."
}

start_attached() {
    echo "Starting in ATTACHED mode."
    echo "Docker Compose logs will remain visible in this terminal."
    echo "Press Ctrl+C to stop the environment."
    echo

    ATTACHED_CLEANED_UP="false"
    trap 'exit 130' INT TERM HUP
    trap 'cleanup_attached' EXIT

    compose up --remove-orphans
    local compose_exit_code=$?

    trap - INT TERM HUP EXIT
    cleanup_attached
    return "$compose_exit_code"
}

start_detached() {
    echo "Starting in DETACHED mode..."
    if ! compose up -d --remove-orphans; then
        return 1
    fi

    wait_for_app_port

    echo
    echo "GRCPC test environment is running in DETACHED mode."
    echo
    echo "Useful commands:"
    echo "  ./grcpc-app.test.sh --status"
    echo "  ./grcpc-app.test.sh --logs"
    echo "  ./grcpc-app.test.sh --down"
    echo "  ./grcpc-app.test.sh --help"
    echo
    return 0
}

main() {
    if [[ "$MODE" == "help" ]]; then
        usage
        return 0
    fi

    if [[ "$MODE" != "up" && "$DETACH" == "true" ]]; then
        echo "ERROR: --detach is only valid when starting the environment."
        echo
        usage
        return 1
    fi

    if [[ "$MODE" != "up" && "$RESET_DATA" == "true" ]]; then
        echo "ERROR: --reset is only valid when starting the environment."
        echo
        usage
        return 1
    fi

    if [[ ! -f "$COMPOSE_FILE" ]]; then
        echo "ERROR: Compose file not found:"
        echo "$SCRIPT_DIR/$COMPOSE_FILE"
        return 1
    fi

    check_docker || return $?

    case "$MODE" in
        status)
            compose_status
            return $?
            ;;
        down)
            compose_down
            return $?
            ;;
        logs)
            compose_logs
            return $?
            ;;
        up)
            ;;
        *)
            echo "ERROR: Unsupported mode: $MODE"
            usage
            return 1
            ;;
    esac

    prepare_dirs || return $?

    if [[ "$RESET_DATA" == "true" ]]; then
        echo
        echo "Reset requested. Stopping containers and deleting local test data..."
        compose down --remove-orphans || true
        rm -rf -- data/oracle data/minio data/app
        prepare_dirs || return $?
    else
        if is_environment_running; then
            echo
            echo "ERROR: GRCPC test environment is already running."
            echo
            print_jar_info
            echo
            echo "Stop it first with:"
            echo "  ./grcpc-app.test.sh --down"
            echo
            echo "Current status:"
            compose ps --all
            return 1
        fi
    fi

    prepare_jar || return $?

    echo
    echo "============================================================"
    echo "Starting GRCPC test environment"
    echo "============================================================"
    echo
    print_jar_info
    if [[ "$DETACH" == "true" ]]; then
        echo "Run mode:          DETACHED"
    else
        echo "Run mode:          ATTACHED"
    fi
    echo
    echo "App URL:       http://localhost:8080"
    echo "Oracle:        localhost:1521 / FREEPDB1 / GRCPC"
    echo "MinIO API:     http://localhost:9000"
    echo "MinIO Console: http://localhost:9001"
    echo
    echo "Local data folders:"
    echo "  $SCRIPT_DIR/data/oracle/oradata"
    echo "  $SCRIPT_DIR/data/minio"
    echo "  $SCRIPT_DIR/data/app/logs"
    echo

    if [[ "$DETACH" == "true" ]]; then
        start_detached
        return $?
    fi

    start_attached
}

parse_args "$@" || exit $?
main
exit $?
