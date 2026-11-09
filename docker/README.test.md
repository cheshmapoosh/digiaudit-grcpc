# GRCPC Portable Test Runner

This runner is for Windows machines where you already have a built Spring Boot
boot jar and want to run the full test infrastructure with Docker Compose.

It starts:

- Java 21 runtime for `grcpc-app`
- Oracle Free test database
- MinIO object storage

## Run

Put your boot jar next to `grcpc-app.test.bat` and `compose.test.yml` with this
exact name:

```text
grcpc-app.jar
```

Then run from that directory in PowerShell:

```powershell
.\grcpc-app.test.bat
```

You can also pass a custom jar path:

```powershell
.\grcpc-app.test.bat "path\to\grcpc-app-version.jar"
```

The runner copies the selected jar to `grcpc-app.jar` next to the BAT file and
starts `compose.test.yml`. It does not load `docker/env/test.env.example` or
`docker/env/test-jar.env.example`.

To start Compose directly with the example settings, use
`docker compose --env-file docker/env/test.env.example -f compose.test.yml up -d`
with the JAR already in place. Set `PUBLIC_HOST` to the test server's IP
address or hostname if the product manager connects from another machine. This
sets the address used by the browser for signed downloads.

## Useful commands

```powershell
# Start in attached mode; Ctrl+C stops the environment and preserves data
.\grcpc-app.test.bat

# Start in detached mode
.\grcpc-app.test.bat --detach

# Stop containers and preserve Oracle/MinIO data
.\grcpc-app.test.bat --down

# Show status or follow logs
.\grcpc-app.test.bat --status
.\grcpc-app.test.bat --logs
```

`--reset` requires explicit confirmation and permanently removes the Oracle
named volume, MinIO object data, and application logs before starting again.
It is not needed to resolve a port conflict.

## Endpoints and data

- Application: <http://localhost:8080>
- Oracle: `localhost:1521`, service `FREEPDB1`, user `GRCPC`, password `grcpc`
- MinIO API: <http://localhost:9000> by default
- MinIO Console: <http://localhost:9001> by default
- MinIO user/password: `minioadmin` / `minioadmin`
- Oracle data: Docker named volume managed by Compose
- MinIO object data: `data/minio` next to the runner
- Application logs: `data/app/logs` next to the runner

## Windows cannot bind MinIO port 9000

If Docker reports `ports are not available` and
`listen tcp 0.0.0.0:9000: bind: An attempt was made to access a socket in a way
forbidden by its access permissions`, Windows has refused the host port used
by MinIO. An excluded/reserved port range or another process may be responsible;
the error alone does not identify which.

On the affected laptop, use these read-only PowerShell commands to inspect
listeners and excluded TCP port ranges:

```powershell
Get-NetTCPConnection -LocalPort 9000 -ErrorAction SilentlyContinue
netsh interface ipv4 show excludedportrange protocol=tcp
```

Choose available host ports outside the excluded ranges. For example, if
`19000` and `19001` are available, run from the package directory:

```powershell
.\grcpc-app.test.bat --down
$env:MINIO_API_PORT = '19000'
$env:MINIO_CONSOLE_PORT = '19001'
.\grcpc-app.test.bat
```

The application still opens at <http://localhost:8080>. MinIO API and Console
move to <http://localhost:19000> and <http://localhost:19001>. Compose also
updates the application's public MinIO endpoint, so browser-facing presigned
download URLs use the selected API port.

These PowerShell variables last for the current session. For subsequent starts
by double-clicking the BAT file, create a `.env` text file next to
`compose.test.yml` containing:

```dotenv
MINIO_API_PORT=19000
MINIO_CONSOLE_PORT=19001
```

Compose loads that `.env` automatically. Variables in the calling shell take
precedence. With no overrides, the API and Console keep ports `9000` and `9001`.
Keep this local file limited to the laptop's port settings.

## Notes

- The application connects to Oracle using the Compose service name `oracle`.
- Internal MinIO connections remain `http://minio:9000`; only published host
  ports and the public download endpoint change.
- Flyway is enabled and uses the Oracle migrations packaged inside the boot jar.
