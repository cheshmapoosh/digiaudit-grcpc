# GRCPC Docker Environments

Oracle is the only relational database target for this project. MinIO is used
for object storage in every environment.

## Development with IntelliJ

Start Oracle and MinIO with Docker:

```powershell
docker compose --env-file docker/env/dev.env.example -f compose.dev.yml up -d
```

Run `grcpc-app` from IntelliJ with the application environment variables shown
in `docker/env/dev.env.example`.

Useful endpoints:

- Application from IntelliJ: `http://localhost:8080`
- Oracle: `localhost:1521`, service `FREEPDB1`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## Portable Test Environment

This topology runs Oracle, MinIO, and the built application in Docker. The test
machine only needs Docker:

```powershell
docker compose --env-file docker/env/test.env.example -f compose.test.yml up --build
```

The application image is built by Docker using the multi-stage Dockerfile at
`docker/app/Dockerfile`.

## Production with External Oracle

Production runs only `grcpc-app` and MinIO in Docker. Oracle is external:

```powershell
docker compose --env-file docker/env/prod.env.example -f compose.prod.yml up -d
```

Replace all `change-me` and example host values before running production.

## Flyway

Flyway is configured for Oracle by default:

```text
spring.flyway.locations=classpath:db/migration/common,classpath:db/migration/oracle
DB_DRIVER_CLASS_NAME=oracle.jdbc.OracleDriver
DB_SCHEMA=GRCPC
```

The application sets this explicitly to
`classpath:db/migration/common,classpath:db/migration/oracle`, so only Oracle
migrations are used.

Hibernate is also aligned with the current Oracle migrations:

```text
hibernate.type.preferred_uuid_jdbc_type=VARCHAR
```

Boolean entity fields are converted to Oracle `NUMBER(1)` values through the
global JPA boolean-number converter. JSON payload columns are stored as `CLOB`
in the Oracle schema.

## MinIO Paths

The MinIO data path is configurable with `MINIO_DATA_DIR`.
The default is:

```text
/var/lib/minio/data
```

Compose mounts the MinIO volume to that path, for example:

```text
grcpc_test_minio:/var/lib/minio/data
```

## MinIO Endpoints

`MINIO_ENDPOINT` is the internal endpoint used by the Java application.
`MINIO_PUBLIC_ENDPOINT` is used when the application generates pre-signed URLs
for the UI.

In Docker, these are often different:

```text
MINIO_ENDPOINT=http://minio:9000
MINIO_PUBLIC_ENDPOINT=https://files.example.com
```

For local environments, `MINIO_PUBLIC_ENDPOINT=http://localhost:9000` is usually
correct.
