@echo off
setlocal EnableDelayedExpansion

REM =========================
REM GRCPC Docker Runner
REM =========================

set CONTAINER_NAME=grcpc-app
set IMAGE_NAME=grcpc-app:latest
set PG_VOLUME=grcpc_pgdata

set HOST_TARGET_DIR=.
set APP_JAR_NAME=grcpc-app.jar
set IMAGE_TAR_NAME=grcpc-app.tar

set RESET_DB=false
set JAVA_OPTS=-Xms256m -Xmx512m

set DOCKER_STARTED_BY_SCRIPT=false

cd /d "%~dp0"

call :main
set EXIT_CODE=%ERRORLEVEL%

call :cleanup

echo.
echo Finished with exit code: %EXIT_CODE%
pause

exit /b %EXIT_CODE%


:main
echo Checking Docker CLI...

docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Docker CLI is not available.
    echo Make sure Docker Desktop is installed and docker.exe is in PATH.
    echo.
    exit /b 1
)

echo.
echo Checking Docker engine...

docker info >nul 2>&1
if errorlevel 1 (
    echo Docker engine is not ready.
    echo Starting Docker Desktop from CLI without opening Docker Desktop UI explicitly...

    docker desktop start > "%TEMP%\grcpc-docker-desktop-start.log" 2>&1

    if errorlevel 1 (
        echo.
        echo ERROR: Could not start Docker Desktop.
        type "%TEMP%\grcpc-docker-desktop-start.log"
        echo.
        exit /b 1
    )

    set DOCKER_STARTED_BY_SCRIPT=true
) else (
    echo Docker engine is already ready.
)

echo.
echo Waiting for Docker engine...

set DOCKER_READY=false

for /L %%i in (1,1,90) do (
    docker info >nul 2>&1
    if not errorlevel 1 (
        set DOCKER_READY=true
        goto :docker_ready
    )

    echo Waiting... %%i/90
    timeout /t 2 /nobreak >nul
)

:docker_ready
if not "%DOCKER_READY%"=="true" (
    echo.
    echo ERROR: Docker engine is not ready.
    echo Docker Desktop status:
    docker desktop status
    echo.
    exit /b 1
)

echo Docker is ready.

echo.
echo Selecting Linux containers engine if available...
docker desktop engine use linux >nul 2>&1

if not exist "%HOST_TARGET_DIR%\%APP_JAR_NAME%" (
    echo.
    echo ERROR: Jar file not found:
    echo %HOST_TARGET_DIR%\%APP_JAR_NAME%
    echo.
    exit /b 1
)

echo.
echo Removing old container if exists...
docker rm -f "%CONTAINER_NAME%" >nul 2>&1

if /I "%RESET_DB%"=="true" (
    echo.
    echo Removing PostgreSQL volume: %PG_VOLUME%
    docker volume rm "%PG_VOLUME%" >nul 2>&1
)

if exist "%HOST_TARGET_DIR%\%IMAGE_TAR_NAME%" (
    echo.
    echo Docker image tar found:
    echo %HOST_TARGET_DIR%\%IMAGE_TAR_NAME%

    echo.
    echo Removing old image if exists: %IMAGE_NAME%
    docker image rm -f "%IMAGE_NAME%" >nul 2>&1

    echo.
    echo Loading docker image...

    docker load -i "%HOST_TARGET_DIR%\%IMAGE_TAR_NAME%" > "%TEMP%\grcpc-docker-load.log" 2>&1

    if errorlevel 1 (
        echo.
        echo ERROR: Failed to load docker image.
        type "%TEMP%\grcpc-docker-load.log"
        echo.
        exit /b 1
    )

    type "%TEMP%\grcpc-docker-load.log"

    docker image inspect "%IMAGE_NAME%" >nul 2>&1
    if errorlevel 1 (
        echo.
        echo ERROR: Loaded image does not have tag %IMAGE_NAME%.
        echo Please save the image as %IMAGE_NAME%.
        echo.
        echo Example:
        echo docker tag grcpc-app:1.0.1 grcpc-app:latest
        echo docker save grcpc-app:latest -o %HOST_TARGET_DIR%\%IMAGE_TAR_NAME%
        echo.
        exit /b 1
    )
) else (
    echo.
    echo No docker image tar found beside jar:
    echo %HOST_TARGET_DIR%\%IMAGE_TAR_NAME%
    echo Existing local image will be used: %IMAGE_NAME%
)

docker image inspect "%IMAGE_NAME%" >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Docker image not found: %IMAGE_NAME%
    echo Put %IMAGE_TAR_NAME% beside jar or load image manually.
    echo.
    exit /b 1
)

echo.
echo Starting container in foreground mode.
echo When this BAT exits, the container/app will stop.
echo.
echo Container: %CONTAINER_NAME%
echo Image:     %IMAGE_NAME%
echo.

docker run --rm --name "%CONTAINER_NAME%" ^
  -p 8080:8080 ^
  -p 5432:5432 ^
  -v "%PG_VOLUME%:/var/lib/postgresql/data" ^
  -v "%HOST_TARGET_DIR%:/mnt/app:ro" ^
  -e "APP_JAR=/mnt/app/%APP_JAR_NAME%" ^
  -e "POSTGRES_USER=grcpc" ^
  -e "POSTGRES_PASSWORD=grcpc" ^
  -e "POSTGRES_DB=grcpc" ^
  -e "GRC_SCHEMA=grc" ^
  -e "JAVA_OPTS=%JAVA_OPTS%" ^
  "%IMAGE_NAME%"

set RUN_EXIT_CODE=%ERRORLEVEL%

echo.
echo Container stopped.

exit /b %RUN_EXIT_CODE%


:cleanup
echo.
echo Cleaning up...

echo Ensuring container is stopped...
docker rm -f "%CONTAINER_NAME%" >nul 2>&1

if "%DOCKER_STARTED_BY_SCRIPT%"=="true" (
    echo Docker Desktop was started by this script.
    echo Stopping Docker Desktop...

    docker desktop stop >nul 2>&1

    echo Docker Desktop stopped.
) else (
    echo Docker engine was already running before this script. It will not be stopped.
)

exit /b 0