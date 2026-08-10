@echo off
setlocal EnableExtensions EnableDelayedExpansion

title GRCPC Test Environment

set "PROJECT_NAME=grcpc-test"
set "COMPOSE_FILE=compose.test.yml"
set "APP_JAR=grcpc-app.jar"
set "SELECTED_JAR_FILE=.grcpc-selected-jar.txt"
set "MODE=up"
set "RESET_DATA=false"
set "DETACH=false"
set "JAR_SOURCE="
set "JAR_SOURCE_NAME="

cd /d "%~dp0"

call :parse_args %*
if errorlevel 1 exit /b %ERRORLEVEL%

rem For every normal start/reset, omitting the jar means using grcpc-app.jar.
rem These pairs are intentionally equivalent:
rem   grcpc-app.test.bat
rem   grcpc-app.test.bat grcpc-app.jar
rem
rem   grcpc-app.test.bat --reset
rem   grcpc-app.test.bat grcpc-app.jar --reset
rem
rem   grcpc-app.test.bat --detach
rem   grcpc-app.test.bat grcpc-app.jar --detach
if /I "%MODE%"=="up" if not defined JAR_SOURCE (
    set "JAR_SOURCE=%APP_JAR%"
    set "JAR_SOURCE_NAME=%APP_JAR%"
)

call :main
exit /b %ERRORLEVEL%


:parse_args
if "%~1"=="" exit /b 0

:parse_loop
if "%~1"=="" exit /b 0

if /I "%~1"=="--help" (
    set "MODE=help"
    shift
    goto :parse_loop
)

if /I "%~1"=="help" (
    set "MODE=help"
    shift
    goto :parse_loop
)

if /I "%~1"=="/?" (
    set "MODE=help"
    shift
    goto :parse_loop
)

if /I "%~1"=="--status" (
    set "MODE=status"
    shift
    goto :parse_loop
)

if /I "%~1"=="status" (
    set "MODE=status"
    shift
    goto :parse_loop
)

if /I "%~1"=="--ps" (
    set "MODE=status"
    shift
    goto :parse_loop
)

if /I "%~1"=="--logs" (
    set "MODE=logs"
    shift
    goto :parse_loop
)

if /I "%~1"=="logs" (
    set "MODE=logs"
    shift
    goto :parse_loop
)

if /I "%~1"=="--down" (
    set "MODE=down"
    shift
    goto :parse_loop
)

if /I "%~1"=="down" (
    set "MODE=down"
    shift
    goto :parse_loop
)

if /I "%~1"=="--reset" (
    set "RESET_DATA=true"
    shift
    goto :parse_loop
)

if /I "%~1"=="reset" (
    set "RESET_DATA=true"
    shift
    goto :parse_loop
)

if /I "%~1"=="--detach" (
    set "DETACH=true"
    shift
    goto :parse_loop
)

if /I "%~1"=="detach" (
    set "DETACH=true"
    shift
    goto :parse_loop
)

if defined JAR_SOURCE (
    echo ERROR: Only one jar file can be selected.
    echo First jar:  %JAR_SOURCE%
    echo Second arg: %~1
    echo.
    call :usage
    exit /b 1
)

if exist "%~1" (
    set "JAR_SOURCE=%~1"
    set "JAR_SOURCE_NAME=%~nx1"
    shift
    goto :parse_loop
)

echo ERROR: Unknown argument or file not found: %~1
echo.
call :usage
exit /b 1


:main
if /I "%MODE%"=="help" (
    call :usage
    exit /b 0
)

if /I not "%MODE%"=="up" if /I "%DETACH%"=="true" (
    echo ERROR: --detach is only valid when starting the environment.
    echo.
    call :usage
    exit /b 1
)

if /I not "%MODE%"=="up" if /I "%RESET_DATA%"=="true" (
    echo ERROR: --reset is only valid when starting the environment.
    echo.
    call :usage
    exit /b 1
)

if not exist "%COMPOSE_FILE%" (
    echo ERROR: Compose file not found:
    echo %CD%\%COMPOSE_FILE%
    exit /b 1
)

call :check_docker
if errorlevel 1 exit /b %ERRORLEVEL%

if /I "%MODE%"=="status" (
    call :compose_status
    exit /b %ERRORLEVEL%
)

if /I "%MODE%"=="down" (
    call :compose_down
    exit /b %ERRORLEVEL%
)

if /I "%MODE%"=="logs" (
    call :compose_logs
    exit /b %ERRORLEVEL%
)

if /I not "%MODE%"=="up" (
    echo ERROR: Unsupported mode: %MODE%
    call :usage
    exit /b 1
)

call :prepare_dirs
if errorlevel 1 exit /b %ERRORLEVEL%

if /I "%RESET_DATA%"=="true" (
    echo.
    echo Reset requested. Stopping containers and deleting local test data...
    docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down --remove-orphans
    if exist "data\oracle" rmdir /S /Q "data\oracle"
    if exist "data\minio" rmdir /S /Q "data\minio"
    if exist "data\app" rmdir /S /Q "data\app"
    call :prepare_dirs
) else (
    call :is_environment_running
    if not errorlevel 1 (
        echo.
        echo ERROR: GRCPC test environment is already running.
        echo.
        call :print_jar_info
        echo.
        echo Stop it first with:
        echo   grcpc-app.test.bat --down
        echo.
        echo Current status:
        docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" ps --all
        exit /b 1
    )
)

call :prepare_jar
if errorlevel 1 exit /b %ERRORLEVEL%

echo.
echo ============================================================
echo Starting GRCPC test environment
 echo ============================================================
echo.
call :print_jar_info
if /I "%DETACH%"=="true" (
    echo Run mode:          DETACHED
) else (
    echo Run mode:          ATTACHED
)
echo.
echo App URL:       http://localhost:8080
echo Oracle:        localhost:1521 / FREEPDB1 / GRCPC
echo MinIO API:     http://localhost:9000
echo MinIO Console: http://localhost:9001
echo.
echo Local data folders:
echo   %CD%\data\oracle\oradata
echo   %CD%\data\minio
echo   %CD%\data\app\logs
echo.

if /I "%DETACH%"=="true" (
    call :start_detached
    exit /b %ERRORLEVEL%
)

call :start_attached
exit /b %ERRORLEVEL%


:start_attached
echo Starting in ATTACHED mode.
echo Docker Compose logs will remain visible in this window.
echo Press Ctrl+C to stop the environment.
echo.

docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up --remove-orphans
set "COMPOSE_EXIT_CODE=%ERRORLEVEL%"

echo.
echo Attached session ended. Ensuring GRCPC services are stopped...
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down --remove-orphans >nul 2>&1

echo GRCPC test environment is stopped.
exit /b %COMPOSE_EXIT_CODE%


:start_detached
echo Starting in DETACHED mode...
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up -d --remove-orphans
if errorlevel 1 exit /b %ERRORLEVEL%

call :wait_for_app_port

echo.
echo GRCPC test environment is running in DETACHED mode.
echo.
echo Useful commands:
echo   grcpc-app.test.bat --status
echo   grcpc-app.test.bat --logs
echo   grcpc-app.test.bat --down
echo   grcpc-app.test.bat --help
echo.
exit /b 0


:usage
echo.
echo ============================================================
echo GRCPC Test Environment Runner
echo ============================================================
echo.
echo Default behavior is ATTACHED mode.
echo It starts:
echo   1. Oracle Database
echo   2. MinIO Object Storage
echo   3. GRCPC Spring Boot Application
echo.
echo ------------------------------------------------------------
echo Expected files in the same folder
echo ------------------------------------------------------------
echo.
echo   grcpc-app.test.bat
echo   compose.test.yml
echo   grcpc-app.jar
echo.
echo If no jar argument is supplied, .\grcpc-app.jar is selected automatically.
echo Another relative jar can also be supplied; it is copied to .\grcpc-app.jar.
echo.
echo ------------------------------------------------------------
echo Attached mode - default
echo ------------------------------------------------------------
echo.
echo   grcpc-app.test.bat
echo   grcpc-app.test.bat grcpc-app.jar
echo       These commands are equivalent.
echo       Start in attached mode and show Compose logs in this window.
echo       Press Ctrl+C to stop the environment.
echo.
echo   grcpc-app.test.bat grcpc-app-1.1.0.jar
echo       Copy the selected jar to .\grcpc-app.jar and start attached.
echo.
echo ------------------------------------------------------------
echo Detached mode
 echo ------------------------------------------------------------
echo.
echo   grcpc-app.test.bat --detach
echo   grcpc-app.test.bat grcpc-app.jar --detach
echo       These commands are equivalent.
echo       Start in background and return to the command prompt.
echo.
echo   grcpc-app.test.bat grcpc-app-1.1.0.jar --detach
echo       Copy the selected jar and start in background.
echo.
echo ------------------------------------------------------------
echo Reset database and local data
 echo ------------------------------------------------------------
echo.
echo   grcpc-app.test.bat --reset
echo   grcpc-app.test.bat grcpc-app.jar --reset
echo       These commands are equivalent.
echo       Delete Oracle data, MinIO data, and app logs, then start attached.
echo.
echo   grcpc-app.test.bat --reset --detach
echo   grcpc-app.test.bat grcpc-app.jar --reset --detach
echo       Reset all local data and start detached.
echo.
echo   grcpc-app.test.bat grcpc-app-1.1.0.jar --reset
echo       Reset all local data, select the given jar, then start attached.
echo.
echo ------------------------------------------------------------
echo Management commands
 echo ------------------------------------------------------------
echo.
echo   grcpc-app.test.bat --status
echo   grcpc-app.test.bat --ps
echo       Show service status and selected executable jar name.
echo.
echo   grcpc-app.test.bat --logs
echo       Follow logs of a detached environment.
echo.
echo   grcpc-app.test.bat --down
echo       Stop and remove containers. Local persistent data is preserved.
echo.
echo   grcpc-app.test.bat --help
echo       Show this help message.
echo.
echo ------------------------------------------------------------
echo URLs
 echo ------------------------------------------------------------
echo.
echo   App URL:       http://localhost:8080
echo   Oracle:        localhost:1521 / FREEPDB1 / GRCPC
echo   MinIO API:     http://localhost:9000
echo   MinIO Console: http://localhost:9001
echo.
exit /b 0


:prepare_dirs
if not exist "data" mkdir "data" >nul 2>&1
if not exist "data\oracle" mkdir "data\oracle" >nul 2>&1
if not exist "data\oracle\oradata" mkdir "data\oracle\oradata" >nul 2>&1
if not exist "data\minio" mkdir "data\minio" >nul 2>&1
if not exist "data\app" mkdir "data\app" >nul 2>&1
if not exist "data\app\logs" mkdir "data\app\logs" >nul 2>&1
exit /b 0


:prepare_jar
if defined JAR_SOURCE (
    if /I not "%JAR_SOURCE:~-4%"==".jar" (
        echo ERROR: The selected file is not a .jar file:
        echo %JAR_SOURCE%
        exit /b 1
    )

    if not exist "%JAR_SOURCE%" (
        echo ERROR: Jar file not found:
        echo %CD%\%JAR_SOURCE%
        exit /b 1
    )

    for %%F in ("%JAR_SOURCE%") do set "JAR_SOURCE_FULL=%%~fF"
    for %%F in ("%APP_JAR%") do set "APP_JAR_FULL=%%~fF"

    echo.
    echo Selected jar: %JAR_SOURCE%
    echo Executable runtime jar: %APP_JAR%

    if /I "!JAR_SOURCE_FULL!"=="!APP_JAR_FULL!" (
        echo Selected jar is already the executable runtime jar.
    ) else (
        echo Copying selected jar to runtime file...
        copy /Y "%JAR_SOURCE%" "%CD%\%APP_JAR%" >nul
        if errorlevel 1 (
            echo ERROR: Failed to copy jar.
            exit /b 1
        )
    )

    > "%SELECTED_JAR_FILE%" echo %JAR_SOURCE_NAME%
)

if not exist "%APP_JAR%" (
    echo ERROR: Jar file not found:
    echo %CD%\%APP_JAR%
    echo.
    echo Put the built jar beside this bat file with this exact name:
    echo %APP_JAR%
    echo.
    echo Or pass a relative jar file name:
    echo grcpc-app.test.bat grcpc-app-1.1.0.jar
    exit /b 1
)

if not exist "%SELECTED_JAR_FILE%" (
    > "%SELECTED_JAR_FILE%" echo %APP_JAR%
)

exit /b 0


:load_selected_jar_name
set "SELECTED_JAR_NAME=%APP_JAR%"
if exist "%SELECTED_JAR_FILE%" (
    set /p SELECTED_JAR_NAME=<"%SELECTED_JAR_FILE%"
)
if not defined SELECTED_JAR_NAME set "SELECTED_JAR_NAME=%APP_JAR%"
exit /b 0


:print_jar_info
call :load_selected_jar_name
echo Executable jar name: %SELECTED_JAR_NAME%
echo Runtime mounted jar: %APP_JAR%
echo Runtime jar path:   %CD%\%APP_JAR%
if exist "%APP_JAR%" (
    for %%F in ("%APP_JAR%") do echo Runtime jar size:   %%~zF bytes
    for %%F in ("%APP_JAR%") do echo Runtime jar time:   %%~tF
) else (
    echo Runtime jar status: NOT FOUND
)
exit /b 0


:check_docker
echo Checking Docker CLI...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker CLI is not available.
    echo Install Docker Desktop and make sure docker.exe is in PATH.
    exit /b 1
)

echo Checking Docker Compose plugin...
docker compose version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose v2 plugin is not available.
    echo Install or update Docker Desktop.
    exit /b 1
)

echo Checking Docker engine...
docker info >nul 2>&1
if not errorlevel 1 (
    echo Docker engine is ready.
    exit /b 0
)

echo Docker engine is not ready. Trying to start Docker Desktop...

if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
) else (
    echo ERROR: Docker Desktop.exe was not found.
    exit /b 1
)

for /L %%i in (1,1,120) do (
    docker info >nul 2>&1
    if not errorlevel 1 (
        echo Docker engine is ready.
        exit /b 0
    )
    echo Waiting for Docker engine... %%i/120
    timeout /t 2 /nobreak >nul
)

echo ERROR: Docker engine is not ready.
exit /b 1


:is_environment_running
set "RUNNING_CONTAINER="
for /F "delims=" %%i in ('docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" ps --status running -q 2^>nul') do (
    set "RUNNING_CONTAINER=%%i"
    goto :is_environment_running_done
)

:is_environment_running_done
if defined RUNNING_CONTAINER exit /b 0
exit /b 1


:compose_status
echo.
echo ============================================================
echo GRCPC Test Environment Status
echo ============================================================
echo.
call :print_jar_info
echo.
call :is_environment_running
if not errorlevel 1 (
    echo Environment status: RUNNING
    echo.
    echo To stop it, run:
    echo   grcpc-app.test.bat --down
) else (
    echo Environment status: NOT RUNNING
    echo.
    echo To start attached, run:
    echo   grcpc-app.test.bat
    echo To start detached, run:
    echo   grcpc-app.test.bat --detach
)
echo.
echo Docker Compose services:
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" ps --all
exit /b %ERRORLEVEL%


:wait_for_app_port
echo.
echo Waiting for application port 8080...

for /L %%i in (1,1,180) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "try { $c = New-Object Net.Sockets.TcpClient; $r = $c.BeginConnect('127.0.0.1', 8080, $null, $null); if ($r.AsyncWaitHandle.WaitOne(1000)) { $c.EndConnect($r); $c.Close(); exit 0 } else { $c.Close(); exit 1 } } catch { exit 1 }" >nul 2>&1

    if not errorlevel 1 (
        echo Application port is open.
        timeout /t 3 /nobreak >nul
        call :check_app_container
        exit /b 0
    )

    echo Waiting for app... %%i/180
    timeout /t 2 /nobreak >nul
)

echo WARNING: Application port 8080 is not open yet.
echo Check status and logs with:
echo   grcpc-app.test.bat --status
echo   grcpc-app.test.bat --logs
exit /b 0


:check_app_container
set "APP_CONTAINER_STATUS="
for /F "delims=" %%s in ('docker inspect -f "{{.State.Status}}" grcpc-test-app 2^>nul') do set "APP_CONTAINER_STATUS=%%s"
if /I not "%APP_CONTAINER_STATUS%"=="running" (
    echo.
    echo WARNING: App container status is: %APP_CONTAINER_STATUS%
    echo The TCP port was open, but the application container is not stable.
    echo Check logs with:
    echo   grcpc-app.test.bat --logs
)
exit /b 0


:compose_down
echo Stopping GRCPC test environment...
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down --remove-orphans
exit /b %ERRORLEVEL%


:compose_logs
echo Showing GRCPC test logs...
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" logs -f
exit /b %ERRORLEVEL%
