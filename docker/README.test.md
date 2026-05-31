# GRCPC Portable Test Runner

This runner is for Windows machines where you already have a built Spring Boot
boot jar and want to run the full test infrastructure with Docker Compose.

It starts:

- Java 21 runtime for `grcpc-app`
- Oracle Free test database
- MinIO object storage

## Run

Put your boot jar next to `grcpc-app.bat` with this exact name:

```text
grcpc-app.jar
```

Then run:

```bat
grcpc-app.bat
```

You can still pass a custom jar path explicitly:

```bat
grcpc-app.bat "D:\GRC\digiaudit-grcpc\grcpc-app\target\grcpc-app-1.0.2.jar"
```

The BAT file copies the selected jar to:

```text
.docker\test\app\grcpc-app.jar
```

Then it starts Compose with:

```text
compose.test-jar.yml
.docker\test\test-jar.env
```

The first run creates `.docker\test\test-jar.env` from
`docker\env\test-jar.env.example`. Edit the local env file if you need to
change ports, passwords, Java memory, or log levels.

## Useful commands

```bat
REM Start with default .\grcpc-app.jar and show logs in the current window
grcpc-app.bat

REM Start with an explicit jar path
grcpc-app.bat "D:\path\to\grcpc-app.jar"

REM Start in detached mode with default .\grcpc-app.jar
grcpc-app.bat --detached

REM Start in detached mode with an explicit jar path
grcpc-app.bat --detached "D:\path\to\grcpc-app.jar"

REM Stop containers, keep Oracle/MinIO data
grcpc-app.bat --down

REM Show logs
grcpc-app.bat --logs

REM Remove Oracle/MinIO/log volumes and start clean with default .\grcpc-app.jar
grcpc-app.bat --reset

REM Remove Oracle/MinIO/log volumes and start clean with an explicit jar path
grcpc-app.bat --reset "D:\path\to\grcpc-app.jar"
```

## Endpoints

- Application: <http://localhost:8080>
- Oracle: `localhost:1521`, service `FREEPDB1`, user `GRCPC`, password `grcpc`
- MinIO API: <http://localhost:9000>
- MinIO Console: <http://localhost:9001>
- MinIO user/password: `minioadmin` / `minioadmin`

## Notes

- The application connects to Oracle using the Compose service name `oracle`, not
  `localhost`.
- The application connects to MinIO using `http://minio:9000` internally.
- `MINIO_PUBLIC_ENDPOINT` stays `http://localhost:9000` so browser-facing
  presigned URLs work on the Windows host.
- Flyway is enabled by default and uses the Oracle migrations already packaged
  inside the boot jar.
