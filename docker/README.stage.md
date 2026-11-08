# Stage environment with external Oracle

Put `grcpc-app.stage.sh`, `compose.stage.yml`, `grcpc-app.jar`, and `stage.env`
in the same deployment directory. Create `stage.env` with `--init-env` if needed;
the template is `docker/env/stage.env.example`. Keep the template in that path
when copying the full repository, or copy it beside the runner as
`stage.env.example` for a portable deployment bundle.
Build and deploy a new application JAR containing `StageDatabaseCommand` before
using `--check` or `--init`; the runner rejects older JARs.

Run these commands from the deployment directory:

```bash
./grcpc-app.stage.sh --check-config
./grcpc-app.stage.sh --check
./grcpc-app.stage.sh --init --detach
./grcpc-app.stage.sh --logs
```

`--check-config` validates Compose and `stage.env` only. `--check` starts a
one-shot Java process in the stage container. It connects with the same Oracle
settings as the app, creates a uniquely named `GRCPC_CHECK_*` table, inserts,
reads, updates, reads, deletes, verifies the deletion, and drops the table.
It drops the table in a `finally` block if a CRUD step fails. A failed drop is
reported as a failure and may require manual cleanup.
The command prints each SQL statement, its bound test values, affected row
counts, read values, and the final table removal. It does not print database
credentials. Because the check container is removed when it exits, save its
console output if you need to retain the log:

```bash
set -o pipefail
./grcpc-app.stage.sh --check 2>&1 | tee stage-check.log
```

`--init` requires an interactive `RESET` confirmation. It stops the stage
containers, uses Flyway `clean` on **all objects in `DB_SCHEMA`**, runs all
packaged migrations from the beginning, and starts the containers. This
permanently deletes the schema's tables and data, including Flyway history.
It does not delete MinIO files. `DB_SCHEMA` must equal the connected Oracle
user's own current schema; Oracle-maintained schemas are refused. Use a dedicated schema
and stop other processes connected to it before initialization. If a migration
fails, the app is not started and the Flyway error appears in the command output.

The Java 21 `jre` container does not include `jshell`. The one-shot command in
the packaged JAR uses its bundled Oracle JDBC driver and Flyway libraries, so
the stage host and container need no JDK or separate JDBC download.
