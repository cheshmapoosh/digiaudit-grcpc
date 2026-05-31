@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM GRCPC Portable Test Runner - Windows + Docker Compose
REM
REM Usage:
REM   grcpc-app.bat
REM   grcpc-app.bat "D:\path\to\grcpc-app.jar"
REM   grcpc-app.bat --reset
REM   grcpc-app.bat --reset "D:\path\to\grcpc-app.jar"
REM   grcpc-app.bat --down
REM   grcpc-app.bat --logs
REM
REM This script runs a ready Spring Boot jar with:
REM   - Java 21 runtime container
REM   - Oracle Free test database
REM   - MinIO object storage
REM ============================================================

set "PROJECT_NAME=grcpc-test"
set "COMPOSE_FILE=compose.test-jar.yml"
set "ENV_TEMPLATE=docker\env\test-jar.env.example"
set "ENV_FILE=.docker\test\test-jar.env"
set "RUNTIME_DIR=.docker\test\app"
set "RUNTIME_JAR=%RUNTIME_DIR%\grcpc-app.jar"
set "DEFAULT_JAR_SOURCE="
set "JAR_SOURCE="
set "RESET_DATA=false"
set "DETACHED=false"
set "MODE=up"
set "DOCKER_STARTED_BY_SCRIPT=false"

cd /d "%~dp0"
set "DEFAULT_JAR_SOURCE=%CD%\grcpc-app.jar"

call :parse_args %*
if errorlevel 1 exit /b %ERRORLEVEL%

call :main
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Finished with exit code: %EXIT_CODE%
if /I not "%CI%"=="true" pause
exit /b %EXIT_CODE%


:parse_args
if "%~1"=="" goto :parse_done

:parse_loop
if "%~1"=="" goto :parse_done

if /I "%~1"=="--reset" (
    set "RESET_DATA=true"
    shift
    goto :parse_loop
)

if /I "%~1"=="--detached" (
    set "DETACHED=true"
    shift
    goto :parse_loop
)

if /I "%~1"=="-d" (
    set "DETACHED=true"
    shift
    goto :parse_loop
)

if /I "%~1"=="--down" (
    set "MODE=down"
    shift
    goto :parse_loop
)

if /I "%~1"=="--logs" (
    set "MODE=logs"
    shift
    goto :parse_loop
)

if /I "%~1"=="--help" (
    call :usage
    exit /b 1
)

if not defined JAR_SOURCE (
    set "JAR_SOURCE=%~1"
    shift
    goto :parse_loop
)

echo ERROR: Unknown argument: %~1
echo.
call :usage
exit /b 1

:parse_done
exit /b 0


:usage
echo GRCPC Docker Compose Test Runner
echo.
echo Usage:
echo   grcpc-app.bat
echo   grcpc-app.bat "D:\path\to\grcpc-app.jar"
echo   grcpc-app.bat --reset
echo   grcpc-app.bat --reset "D:\path\to\grcpc-app.jar"
echo   grcpc-app.bat --detached
echo   grcpc-app.bat --detached "D:\path\to\grcpc-app.jar"
echo   grcpc-app.bat --down
echo   grcpc-app.bat --logs
echo.
echo Notes:
echo   If no jar path is provided, .\grcpc-app.jar is used from this script directory.
echo   --reset removes Oracle and MinIO test volumes before starting.
echo   Without --detached, logs are shown in the current window.
exit /b 0


:main
if not exist "%COMPOSE_FILE%" (
    echo ERROR: Compose file not found: %CD%\%COMPOSE_FILE%
    exit /b 1
)

call :check_docker
if errorlevel 1 exit /b %ERRORLEVEL%

call :prepare_env_file
if errorlevel 1 exit /b %ERRORLEVEL%

if /I "%MODE%"=="down" (
    call :compose_down
    exit /b %ERRORLEVEL%
)

if /I "%MODE%"=="logs" (
    call :compose_logs
    exit /b %ERRORLEVEL%
)

call :prepare_jar
if errorlevel 1 exit /b %ERRORLEVEL%

if /I "%RESET_DATA%"=="true" (
    echo.
    echo Reset requested. Removing test containers and volumes...
    docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down -v --remove-orphans
    if errorlevel 1 exit /b %ERRORLEVEL%
)

echo.
echo Starting GRCPC test environment...
echo.
echo Project:       %PROJECT_NAME%
echo Compose file:  %COMPOSE_FILE%
echo Env file:      %ENV_FILE%
echo Runtime jar:   %RUNTIME_JAR%
echo App URL:       http://localhost:8080
echo Oracle:        localhost:1521 / FREEPDB1 / GRCPC
echo MinIO API:     http://localhost:9000
echo MinIO Console: http://localhost:9001
echo.

if /I "%DETACHED%"=="true" (
    docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up -d --remove-orphans
) else (
    docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up --remove-orphans
)

exit /b %ERRORLEVEL%


:check_docker
echo Checking Docker CLI...
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Docker CLI is not available.
    echo Make sure Docker Desktop is installed and docker.exe is in PATH.
    echo.
    exit /b 1
)

echo Checking Docker Compose plugin...
docker compose version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Docker Compose v2 plugin is not available.
    echo Install/update Docker Desktop, then try again.
    echo.
    exit /b 1
)

echo Checking Docker engine...
docker info >nul 2>&1
if not errorlevel 1 (
    echo Docker engine is ready.
    exit /b 0
)

echo Docker engine is not ready. Trying to start Docker Desktop...

docker desktop start > "%TEMP%\grcpc-docker-desktop-start.log" 2>&1
if errorlevel 1 (
    if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
        start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
    ) else (
        echo WARNING: docker desktop start failed, and Docker Desktop.exe was not found in Program Files.
        type "%TEMP%\grcpc-docker-desktop-start.log"
    )
) else (
    set "DOCKER_STARTED_BY_SCRIPT=true"
)

echo Waiting for Docker engine...
for /L %%i in (1,1,120) do (
    docker info >nul 2>&1
    if not errorlevel 1 (
        echo Docker engine is ready.
        exit /b 0
    )
    echo Waiting... %%i/120
    timeout /t 2 /nobreak >nul
)

echo.
echo ERROR: Docker engine is not ready.
echo Docker Desktop status:
docker desktop status 2>nul
echo.
exit /b 1


:prepare_env_file
if not exist ".docker\test" mkdir ".docker\test" >nul 2>&1

if not exist "%ENV_FILE%" (
    if not exist "%ENV_TEMPLATE%" (
        echo ERROR: Env template not found: %ENV_TEMPLATE%
        exit /b 1
    )
    echo Creating local env file: %ENV_FILE%
    copy "%ENV_TEMPLATE%" "%ENV_FILE%" >nul
)

exit /b 0


:prepare_jar
if not defined JAR_SOURCE (
    set "JAR_SOURCE=%DEFAULT_JAR_SOURCE%"
    echo.
    echo No jar path was provided. Using default jar:
    echo %JAR_SOURCE%
)

if not defined JAR_SOURCE (
    echo ERROR: Jar path is required.
    exit /b 1
)

if not exist "%JAR_SOURCE%" (
    echo.
    echo ERROR: Jar file not found:
    echo %JAR_SOURCE%
    echo.
    exit /b 1
)

if /I not "%JAR_SOURCE:~-4%"==".jar" (
    echo.
    echo ERROR: The selected file is not a .jar file:
    echo %JAR_SOURCE%
    echo.
    exit /b 1
)

if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%" >nul 2>&1

echo.
echo Preparing runtime jar...
echo Source: %JAR_SOURCE%
echo Target: %RUNTIME_JAR%
copy /Y "%JAR_SOURCE%" "%RUNTIME_JAR%" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy jar to runtime directory.
    exit /b 1
)

exit /b 0


:compose_down
echo Stopping GRCPC test environment...
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down --remove-orphans
exit /b %ERRORLEVEL%


:compose_logs
echo Showing GRCPC test logs...
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" logs -f
exit /b %ERRORLEVEL%
