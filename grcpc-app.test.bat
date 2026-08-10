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
    exit /b 1
)

if exist "%~1" (
    set "JAR_SOURCE=%~1"
    set "JAR_SOURCE_NAME=%~nx1"
    shift
    goto :parse_loop
)

echo ERROR: Unknown argument or file not found: %~1
exit /b 1

:main
if /I "%MODE%"=="help" (
    call :usage
    exit /b 0
)

if /I not "%MODE%"=="up" if /I "%DETACH%"=="true" (
    echo ERROR: --detach is only valid when starting the environment.
    exit /b 1
)
if /I not "%MODE%"=="up" if /I "%RESET_DATA%"=="true" (
    echo ERROR: --reset is only valid when starting the environment.
    exit /b 1
)

if not exist "%COMPOSE_FILE%" (
    echo ERROR: Compose file not found: %CD%\%COMPOSE_FILE%
    exit /b 1
)

call :check_docker
if errorlevel 1 exit /b %ERRORLEVEL%

if /I "%MODE%"=="status" (
    call :compose_status
    exit /b !ERRORLEVEL!
)
if /I "%MODE%"=="down" (
    call :compose_down
    exit /b !ERRORLEVEL!
)
if /I "%MODE%"=="logs" (
    call :compose_logs
    exit /b !ERRORLEVEL!
)
if /I not "%MODE%"=="up" exit /b 1

if /I "%RESET_DATA%"=="true" (
    call :confirm_reset
    if errorlevel 1 exit /b !ERRORLEVEL!
    call :reset_data
    if errorlevel 1 exit /b !ERRORLEVEL!
) else (
    call :prepare_dirs
    if errorlevel 1 exit /b !ERRORLEVEL!
    call :is_environment_running
    if not errorlevel 1 (
        echo ERROR: GRCPC test environment is already running.
        echo Stop it first with: grcpc-app.test.bat --down
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
if /I "%DETACH%"=="true" (echo Run mode:          DETACHED) else (echo Run mode:          ATTACHED)
echo Oracle data:       Docker named volume managed by Compose
echo MinIO data:        %CD%\data\minio
echo Application logs:  %CD%\data\app\logs
echo.

if /I "%DETACH%"=="true" (
    call :start_detached
    exit /b !ERRORLEVEL!
)

call :start_attached
exit /b %ERRORLEVEL%

:confirm_reset
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Write-Host ''; Write-Host 'WARNING: RESET WILL PERMANENTLY DELETE ALL TEST DATA.' -ForegroundColor Yellow; Write-Host '  - Oracle database named volume' -ForegroundColor Yellow; Write-Host '  - MinIO object data' -ForegroundColor Yellow; Write-Host '  - Application logs' -ForegroundColor Yellow; Write-Host '  - Legacy data/oracle directory, if present' -ForegroundColor Yellow; Write-Host 'This operation cannot be undone.' -ForegroundColor Yellow; Write-Host ''"
if errorlevel 1 (
    echo.
    echo WARNING: RESET WILL PERMANENTLY DELETE ALL TEST DATA.
    echo This operation cannot be undone.
    echo.
)
set "RESET_CONFIRM="
set /P "RESET_CONFIRM=Continue with RESET? [y/N]: "
if /I "%RESET_CONFIRM%"=="Y" exit /b 0
if /I "%RESET_CONFIRM%"=="YES" exit /b 0
echo.
echo Reset cancelled. No persistent data was changed.
exit /b 2

:reset_data
echo.
echo Reset confirmed. Stopping containers and deleting all persistent test data...
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down -v --remove-orphans
if errorlevel 1 exit /b %ERRORLEVEL%
rem Also remove legacy bind-mount Oracle data from older packages.
if exist "data\oracle" rmdir /S /Q "data\oracle"
if exist "data\minio" rmdir /S /Q "data\minio"
if exist "data\app" rmdir /S /Q "data\app"
call :prepare_dirs
exit /b %ERRORLEVEL%

:prepare_dirs
if not exist "data" mkdir "data" >nul 2>&1
if not exist "data\minio" mkdir "data\minio" >nul 2>&1
if not exist "data\app" mkdir "data\app" >nul 2>&1
if not exist "data\app\logs" mkdir "data\app\logs" >nul 2>&1
exit /b 0

:prepare_jar
if /I not "%JAR_SOURCE:~-4%"==".jar" (
    echo ERROR: The selected file is not a .jar file: %JAR_SOURCE%
    exit /b 1
)
if not exist "%JAR_SOURCE%" (
    echo ERROR: Jar file not found: %CD%\%JAR_SOURCE%
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
    if errorlevel 1 exit /b 1
)

> "%SELECTED_JAR_FILE%" echo %JAR_SOURCE_NAME%
exit /b 0

:load_selected_jar_name
set "SELECTED_JAR_NAME=%APP_JAR%"
if exist "%SELECTED_JAR_FILE%" set /p SELECTED_JAR_NAME=<"%SELECTED_JAR_FILE%"
if not defined SELECTED_JAR_NAME set "SELECTED_JAR_NAME=%APP_JAR%"
exit /b 0

:print_jar_info
call :load_selected_jar_name
echo Executable jar name: %SELECTED_JAR_NAME%
echo Runtime mounted jar: %APP_JAR%
echo Runtime jar path:   %CD%\%APP_JAR%
if exist "%APP_JAR%" (
    for %%F in ("%APP_JAR%") do echo Runtime jar size:   %%~zF bytes
) else (
    echo Runtime jar status: NOT FOUND
)
exit /b 0

:check_docker
echo Checking Docker CLI...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker CLI is not available.
    exit /b 1
)

echo Checking Docker Compose plugin...
docker compose version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose v2 plugin is not available.
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

:start_attached
echo Starting in ATTACHED mode.
echo Press Ctrl+C to stop the environment.
echo.
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up --remove-orphans
set "COMPOSE_EXIT_CODE=%ERRORLEVEL%"
echo.
echo Attached session ended. Ensuring GRCPC services are stopped...
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down --remove-orphans >nul 2>&1
echo GRCPC test environment is stopped. Persistent data was preserved.
exit /b %COMPOSE_EXIT_CODE%

:start_detached
echo Starting in DETACHED mode...
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up -d --remove-orphans
if errorlevel 1 exit /b %ERRORLEVEL%
call :wait_for_app_port
echo.
echo GRCPC test environment is running in DETACHED mode.
exit /b 0

:wait_for_app_port
echo Waiting for application port 8080...
for /L %%i in (1,1,180) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "try { $c = New-Object Net.Sockets.TcpClient; $r = $c.BeginConnect('127.0.0.1', 8080, $null, $null); if ($r.AsyncWaitHandle.WaitOne(1000)) { $c.EndConnect($r); $c.Close(); exit 0 } else { $c.Close(); exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        echo Application port is open.
        exit /b 0
    )
    timeout /t 2 /nobreak >nul
)
echo WARNING: Application port 8080 is not open yet.
exit /b 0

:compose_status
echo.
echo ============================================================
echo GRCPC Test Environment Status
echo ============================================================
echo.
call :print_jar_info
echo.
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" ps --all
echo.
echo Docker Compose volumes:
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" config --volumes
exit /b %ERRORLEVEL%

:compose_down
echo Stopping GRCPC test environment ^(persistent data will be preserved^)...
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" down --remove-orphans
exit /b %ERRORLEVEL%

:compose_logs
docker compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" logs -f
exit /b %ERRORLEVEL%

:usage
echo.
echo ============================================================
echo GRCPC Test Environment Runner
echo ============================================================
echo.
echo Default: ATTACHED mode using .\grcpc-app.jar
echo.
echo   grcpc-app.test.bat
echo   grcpc-app.test.bat grcpc-app.jar
echo       Equivalent. Press Ctrl+C to stop.
echo.
echo   grcpc-app.test.bat --detach
echo       Start in background.
echo.
echo   grcpc-app.test.bat --reset
echo       Show a destructive-reset warning and require y/yes confirmation.
echo       If confirmed, remove Oracle named volume, MinIO data and logs,
echo       then start attached with a fresh Oracle database.
echo.
echo   grcpc-app.test.bat --reset --detach
echo       Same confirmation, then reset all test data and start detached.
echo.
echo   grcpc-app.test.bat grcpc-app-1.1.0.jar --reset
echo       Same confirmation, then reset and use another jar.
echo.
echo   grcpc-app.test.bat --status
echo   grcpc-app.test.bat --logs
echo   grcpc-app.test.bat --down
echo   grcpc-app.test.bat --help
echo.
echo --down preserves persistent data.
echo --reset destroys persistent test data only after explicit confirmation.
echo.
exit /b 0
