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

## Application MinIO Configuration

All application-side MinIO settings support environment overrides. `MINIO_ROOT_USER`
and `MINIO_ROOT_PASSWORD` remain server-container settings; production should inject
their corresponding application credentials through Secrets rather than editing
`application.yml`.

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `GRCPC_MINIO_ENABLED` | `true` | Enables application document storage and startup lifecycle handling. |
| `GRCPC_MINIO_ENDPOINT` | `http://localhost:9000` | Internal MinIO API endpoint used by the application. |
| `GRCPC_MINIO_PUBLIC_ENDPOINT` | `http://localhost:9000` | Browser-reachable endpoint used for pre-signed download URLs. |
| `GRCPC_MINIO_ACCESS_KEY` | `minioadmin` | Application MinIO access key; override through a Secret in production. |
| `GRCPC_MINIO_SECRET_KEY` | `minioadmin` | Application MinIO secret key; override through a Secret in production. |
| `GRCPC_MINIO_BUCKET` | `grc-documents` | Document object bucket, created when missing and verified before lifecycle setup. |
| `GRCPC_MINIO_PRESIGNED_URL_EXPIRY_MINUTES` | `15` | Lifetime of generated download URLs. |
| `GRCPC_MINIO_DEFAULT_MAX_UPLOAD_SIZE_MB` | `25` | Default document upload limit. |
| `GRCPC_MINIO_TEMP_TTL_MINUTES` | `120` | Oracle business-validity period for a temporary upload. |
| `GRCPC_MINIO_TEMPORARY_PREFIX` | `master-data/document/temp` | Object-key prefix for temporary uploads. |
| `GRCPC_MINIO_PERMANENT_PREFIX` | `master-data/document/permanent` | Object-key prefix for immutable permanent versions. |
| `GRCPC_MINIO_LIFECYCLE_MODE` | `APPLY` | Startup lifecycle mode: `DISABLED`, `VALIDATE`, or `APPLY`. |
| `GRCPC_MINIO_TEMP_EXPIRATION_ENABLED` | `true` | Manages temporary-object physical expiration. |
| `GRCPC_MINIO_TEMP_EXPIRATION_RULE_ID` | `grcpc-temp-object-expiration` | Fixed application-owned temporary expiration rule ID. |
| `GRCPC_MINIO_TEMP_EXPIRATION_DAYS` | `2` | Physical expiration age for objects under the temporary prefix. |
In Docker, the internal and public endpoints are often different:

```text
GRCPC_MINIO_ENDPOINT=http://minio:9000
GRCPC_MINIO_PUBLIC_ENDPOINT=https://files.example.com
```

Runtime entrypoints resolve application MinIO values in this order:

```text
explicit GRCPC_MINIO_* value
-> matching GRCPC_MINIO_*_FILE value (credentials)
-> compatible legacy MINIO_* value
-> MinIO root credential (credentials only)
-> documented application default
```

`GRCPC_MINIO_ACCESS_KEY_FILE` and `GRCPC_MINIO_SECRET_KEY_FILE` are supported for
application credentials. `MINIO_ROOT_USER_FILE`, `MINIO_ROOT_PASSWORD_FILE`, and
`DB_PASSWORD_FILE` are also supported by the packaged entrypoints. Legacy
`MINIO_ACCESS_KEY_FILE` and `MINIO_SECRET_KEY_FILE` remain compatibility fallbacks.
Supplying both a direct variable and its matching `_FILE` variable is rejected. Secret
file contents and credentials are never written to startup logs. Application credentials
may differ from the MinIO server root credentials; production should provision a scoped
application identity and set the `GRCPC_MINIO_*` credentials explicitly.

`GRCPC_MINIO_LIFECYCLE_MODE` defaults to `APPLY` for the current single-instance
deployment. A future multi-instance deployment should normally use one controlled
`APPLY` instance (or an infrastructure workflow) and run ordinary replicas in
`VALIDATE` mode.

Only the `grcpc-temp-object-expiration` temporary-object rule is supported. The former
`AbortIncompleteMultipartUpload` rule was removed because the deployed MinIO server
rejects its standalone lifecycle XML; startup reconciliation still removes that obsolete
application-owned rule ID. No application cleanup scheduler replaces it.

The lifecycle rule removes physical MinIO objects only. It does not delete Oracle
`document_temp_upload` rows and does not replace the `expires_at` business check.
Permanent objects have no automatic expiration rule. The default two-day physical
cleanup window is deliberately longer than the 120-minute application temporary-upload
TTL. Configuration is rejected unless physical expiration is strictly greater than the
business TTL, and an unexpired Oracle row remains the authority for retry eligibility.

The production Compose file pins MinIO to `RELEASE.2025-09-07T16-13-09Z`.
Runtime lifecycle verification used that exact server release (commit
`07c3a429bfed433e49018cb0f78a52145d4bedeb`) and MinIO Java SDK `8.5.17`.
