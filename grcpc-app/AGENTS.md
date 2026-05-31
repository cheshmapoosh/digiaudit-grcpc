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

## API and error handling
- Use DTOs at API boundaries; do not expose JPA entities directly.
- Use MapStruct mappers when an existing feature does so.
- Use `BusinessException`, `NotFoundException`, `ConflictException`, and `ForbiddenException` consistently so `ApiExceptionHandler` can format errors.
- Keep endpoint paths stable unless the UI and callers are updated in the same task.

## Persistence and migrations
- Use Flyway for schema/data changes under `src/main/resources/db/migration`.
- Do not edit existing migrations; add a new versioned migration.
- Preserve Oracle compatibility in vendor migrations.
- Put seed data shared across databases in `db/migration/common` when appropriate.
- Keep audit fields and soft-delete behavior consistent with existing entities.

## Security and audit
- Do not bypass Spring Security or `CurrentUserProvider`.
- Do not log passwords, tokens, or sensitive request bodies.
- Audit sensitive management operations using the existing audit module/pattern.

## Verification
- Preferred quick verification: `./mvnw -Dskip.ui=true test`.
- For packaging backend without rebuilding UI: `./mvnw -Dskip.ui=true package`.
- If changing frontend contract from backend, also run the UI checks from `grcpc-ui`.
