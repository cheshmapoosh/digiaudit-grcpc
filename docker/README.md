# GRCPC Docker Environments

Oracle is the only relational database target for this project. MinIO is used
for object storage in every environment.

| Environment | Services in Compose | Database |
| --- | --- | --- |
| `dev` | Java 21 app, MinIO, Oracle Free | Local container |
| `test` | Java 21 app, MinIO, Oracle Free | Local container |
| `stage` | Nginx, Java 21 app, MinIO | External Oracle |
| `prod` | Nginx, Java 21 app, MinIO | External Oracle |

## Build the deliverable JARs

From the repository root, with Java 21, Node.js and the UI dependencies installed:

```powershell
Set-Location grcpc-ui
npm.cmd run build
Set-Location ../grcpc-app
.\mvnw.cmd -Pedition-single '-Dskip.ui=true' '-Dmaven.test.skip=true' package
.\mvnw.cmd -Pedition-multi '-Dskip.ui=true' '-Dmaven.test.skip=true' package
```

The executable JARs, including the UI, are
`target/edition-single/grcpc-app-<version>-single.jar` and
`target/edition-multi/grcpc-app-<version>-multi.jar`. Maven packages the
single-profile marker inside the SINGLE JAR. The backend reads it from the
packaged classpath. A build without an explicit edition uses multi-profile
behavior. Either edition can be run in any environment.

Copy the selected JAR to the deployment directory as `grcpc-app.jar`.
For `dev`, `stage` and `prod` the direct Compose command can also mount a
different file via `APP_JAR_PATH`. To upgrade from SINGLE to MULTI, stop the
application container, replace the JAR and recreate the container using the
same Oracle schema and MinIO data. The edition switch requires no data
migration. SINGLE uses the default profile seeded by V1190 and requires it
to be active. The same Oracle schema can also contain other profiles for MULTI.

## Development

```powershell
docker compose --env-file docker/env/dev.env.example -f compose.dev.yml up -d
```

For development from IntelliJ, add `oracle minio` to the end of the command
and use the local endpoints from the comments in `docker/env/dev.env.example`.
In IntelliJ, keep the default Maven profile and select `GRCPC - SINGLE` from
the Run menu for single-profile mode. This configuration adds the same
single-profile marker used by the SINGLE JAR to the local run's classpath.
Use the regular `GrcpcApiApplication` configuration for multi-profile mode.
Both configurations compile the Java files directly from `src/main/java`.

Useful endpoints:

- Application: `http://localhost:8080`
- Oracle: `localhost:1521`, service `FREEPDB1`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## Portable Test Environment

This topology runs Oracle, MinIO, and the built application in Docker. The test
machine only needs Docker:

```powershell
.\grcpc-app.test.bat
```

Place the built boot jar next to the runner as `grcpc-app.jar`. Compose mounts
that jar into a Java 21 runtime image; it does not build the application.
See [Portable Test Runner](README.test.md) for startup options and Windows
port-conflict troubleshooting.

## Stage and production with external Oracle

Copy the matching env example to `stage.env` or `prod.env` beside the
Compose file and fill in the external Oracle URL, schema and credentials and
the MinIO credentials. Preserve the `docker/nginx/start.sh` and
`docker/app/entrypoint.sh` paths when copying the deployment files.

```powershell
docker compose --env-file stage.env -f compose.stage.yml up -d
docker compose --env-file prod.env -f compose.prod.yml up -d
```

Use separate deployment directories for test, stage and prod. Use distinct
published ports if the environments share a host. Stage expects its Java, MinIO and Nginx
images to have already been loaded on the host. See the [stage runner guide](README.stage.md)
for its commands and file layout.

Configure the Nginx entry point in the deployment env file:

| Access | `PUBLIC_HOST` | `PUBLIC_SCHEME` | `APP_PORT` |
| --- | --- | --- | --- |
| HTTP by IP | `192.0.2.10` (replace with the server IPv4 address) | `http` | `80` |
| HTTP by domain | `grc.example.com` | `http` | `80` |
| HTTPS by domain | `grc.example.com` | `https` | `443` |

Create a DNS record pointing the domain to the server for domain access. For
HTTPS, place the certificate chain in `fullchain.pem` and the matching private
key in `privkey.pem` under the host directory selected by `NGINX_TLS_DIR`
(default `./tls`). That directory is mounted read-only. Run Compose again
after changing the env file. Restart Nginx after renewing the certificate
files. The selected port serves the selected scheme.

Nginx publishes one port for the app and its signed MinIO downloads. MinIO's
API and console are internal in stage and prod. Remove a legacy
`GRCPC_MINIO_PUBLIC_ENDPOINT` or `MINIO_PUBLIC_ENDPOINT` setting when using
downloads through Nginx. An explicit endpoint is useful for deployments that
already have a separate storage gateway. If the MinIO deployment uses a
non-default S3 region, set `GRCPC_MINIO_PRESIGN_REGION` to match it.

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

Dev persists MinIO objects under `./data/dev/minio` by default. Test and
stage use `./data/minio` relative to their respective deployment directories.
Prod keeps the existing named `MINIO_VOLUME` at `MINIO_DATA_DIR`. If you have
existing dev data in a different host directory, set `DEV_MINIO_DATA_PATH`
to that directory. If an older dev container stored files in its writable
layer, export those files into the new bind directory before replacing it.

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
`DB_PASSWORD_FILE` are also supported by the production entrypoint. Mount the
host directory via `GRCPC_SECRETS_DIR` and use paths under
`/run/secrets/grcpc/` for the `_FILE` values. Legacy
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
