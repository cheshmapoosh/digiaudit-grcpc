# AGENTS.md - grcpc-app backend instructions

## Scope
These instructions apply to `grcpc-app`. Feature-specific instructions under `src/main/java/com/digiaudit/grcpc/modules/**/AGENTS.md` extend them.

## Architecture
- Base package: `com.digiaudit.grcpc`.
- Keep feature code under `src/main/java/com/digiaudit/grcpc/modules`.
- Use the existing layered package style:
  - `api`: Spring MVC controllers, request/response DTOs, mappers.
  - `application`: use-case/services and transaction boundaries.
  - `domain`: entities, enums/value objects, repository interfaces.
  - `config`: feature-local configuration only when needed.
- Keep controllers thin. Validation, business rules, and hierarchy checks belong in application services.
- JPA entity class names should end with `Entity`.
- Prefer UUID identifiers consistently with the existing code.
- Reuse shared code from `common` for exceptions, auditing, persistence, security, logging, and utilities.

## Structural hierarchy Guard Row
- The authoritative hierarchy-concurrency mechanism is the database table `masterdata_hierarchy_guard`.
- Identify the hierarchy boundary before implementing any structural mutation.
- Acquire the corresponding Guard Row with `PESSIMISTIC_WRITE` inside the same business transaction and before the first hierarchy read, parent check, cycle check, lifecycle check, dependency check, or structural write.
- Keep the Guard Row locked until transaction completion. Do not manually unlock it.
- `Create`, `Move`, `Delete`, `Restore`, re-parenting, structural bulk/import/initialization operations, and lifecycle changes that alter parent/child eligibility are guarded operations.
- Purely descriptive updates do not require a hierarchy Guard unless they also change a structural invariant.
- If one command touches more than one independent hierarchy, acquire all Guard Rows in ascending `hierarchy_key` order.
- A missing Guard Row is a configuration/integrity failure. Never create Guard Rows lazily inside a business command.
- Lock timeout or acquisition failure must fail closed and be translated to a stable concurrency response such as `HIERARCHY_BUSY` (`409`). Do not report success and do not silently retry in the initial implementation.
- `@Version` remains required on mutable business entities for stale-client detection, but it does not replace the hierarchy Guard Row.
- Do not use `Caffeine`, `ReentrantLock`, JVM synchronization, table-wide locks, or distributed-cache locks as the source of correctness.
- Read the binding decision and contract:
  - `grcpc-docs/architecture/decisions/ADR-0001-database-hierarchy-guard-row.md`
  - `grcpc-docs/master-data/hierarchy-guard-row-contract.md`

## API and error handling
- Use DTOs at API boundaries; do not expose JPA entities directly.
- Use MapStruct mappers when an existing feature does so.
- Use `BusinessException`, `NotFoundException`, `ConflictException`, and `ForbiddenException` consistently so `ApiExceptionHandler` can format errors.
- Keep endpoint paths stable unless the UI and callers are updated in the same task.

## Persistence and migrations
- Use Flyway for schema/data changes under `src/main/resources/db/migration`.
- Do not edit existing migrations in normal operational delivery; add a new versioned migration. The accepted Master Data V2 Greenfield exception permits explicitly designated Day-Zero migrations to be refined before production activation so a fresh Oracle schema is created in its final form. `V1162` is already accepted under that exception; Prompt 5.10 must not change it or add a compensating migration.
- Preserve Oracle compatibility in vendor migrations.
- Put seed data shared across databases in `db/migration/common` when appropriate.
- Keep audit fields and soft-delete behavior consistent with existing entities.
- Guard Row definitions and seed rows are Flyway-owned. Runtime code must not create, rename, or repair them automatically.

## Security and audit
- Do not bypass Spring Security or `CurrentUserProvider`.
- Do not log passwords, tokens, or sensitive request bodies.
- Audit sensitive management operations using the existing audit module/pattern.

## Verification
- Prompt 5.10 explicitly prohibits automated test creation, modification, and execution.
- Preferred quick verification: `./mvnw -Dskip.ui=true test`.
- For packaging backend without rebuilding UI: `./mvnw -Dskip.ui=true package`.
- If changing frontend contract from backend, also run the UI checks from `grcpc-ui`.
- Hierarchy changes require real concurrent-transaction verification against the supported database engine; a single-threaded unit test is not sufficient evidence.
