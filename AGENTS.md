# AGENTS.md - grcpc project instructions for Codex

## Scope
These instructions apply to the whole repository. More specific `AGENTS.md` files under `grcpc-app`, `grcpc-ui`, and feature folders override or extend these rules.

## Project overview
- `grcpc-app`: Spring Boot 3.5.9, Java 21, Maven, Spring MVC, Spring Security, Spring Data JPA, Flyway, MapStruct, Lombok, MinIO integration.
- `grcpc-ui`: React 19, TypeScript, Vite, SAP UI5 Web Components for React, React Router, Zustand, axios, i18next.
- Deployment files live at the repository root and under `docker/`.
- The application is a GRC product. Keep naming, UX, API contracts, and security behavior consistent across backend and frontend.

## Shared project terminology

- When the user says `کاتالوگ` or `کاتالوگ‌ها` without further qualification, interpret it as the core Master Data catalogs (`کاتالوگ‌های اطلاعات پایه`): Organization, Process, Subprocess, Objective, Control Objective, Control, Risk, Regulation, Regulation Requirement, Policy, and Account Group.
- This conversational term includes structural Organization and Process/Subprocess catalogs; it is not limited to the backend `modules/masterdata/catalog` package or the UI's specialized-catalog group.
- A `کاتالوگ` is the collection for one core entity type; an `آیتم کاتالوگ` is one record in that collection; a `جدول کاتالوگ` is the database table storing those records. `موجودیت‌های هسته‌ای` and `جداول هسته‌ای` are the corresponding domain and database terms used in earlier discussions.
- Relationship, Assignment, Scope, Coverage, Document, Revision, and technical tables support catalogs; they are not themselves core catalogs under this terminology.
- See [Project terminology](grcpc-docs/master-data/README.md#project-terminology) for the Persian definitions and database-table mapping. This vocabulary agreement does not change schema, API names, or business rules.

## Repository-level rules
- Prefer small, focused changes. Do not rewrite working features unless the task explicitly asks for refactoring.
- Inspect the existing feature closest to the requested change and follow its pattern before introducing a new pattern.
- Do not commit secrets, real passwords, private tokens, or local machine paths.
- Do not modify generated/build output such as `grcpc-ui/dist` unless the task explicitly requires packaging static assets.
- Keep Persian as the default user-facing language where the existing UI expects Persian.
- When adding user-facing UI text, use i18n keys instead of hardcoded text.
- When adding backend database changes, use Flyway migrations. Do not edit migrations that may already be applied in normal operational delivery. Before production activation, explicitly designated Master Data V2 Day-Zero migrations may be refined only to create the final schema directly on a fresh Oracle database; this exception does not authorize rewriting operational migrations or upgrading populated Master Data V2 schemas.
- Maintain backend/frontend API contract compatibility. A DTO and its bundled UI normally change in the same task. Prompt 5.10 supersedes the remaining conflicting Prompt 5.8/5.9 browser rules: target Create/Edit uses one structural aggregate command for General Information, typed parent/owner, and Document drafts; temporary upload remains immediate and target-independent.

## Accepted Central reference Assignments (2026-10-27)

- Follow `grcpc-docs/master-data/accepted-corrections/2026-10-27-central-reference-assignments.md`. It authorizes exactly four typed direct Central Assignment tables and supersedes older direct-relation/count prohibitions only for those families.
- Control owns Risk/Control Objective/Requirement assignments; Control Objective owns Risk assignments. They share one aggregate Save and CENTRAL Revision with Documents/classifications.
- Coverage UI is removed in this phase; its schema, APIs, data and dependency rules remain. OrganizationObjective, Policy Scope and existing Document/Global Control links are not reimplemented.
- Guard unions are lexical; endpoint row locks are Control, Risk Template, Control Objective, Requirement, then ID. Control Objective gets no new Guard.
- This delivery permits only backend compile with `-Dskip.ui=true -Dmaven.test.skip=true`, UI typecheck and lint. Do not create, edit or run tests, run the app/Flyway, or connect to a database/browser/external service.

## Structural hierarchy concurrency rule
- Before implementing, modifying, or reviewing a structural mutation, identify the affected hierarchy boundary.
- Every `Create`, `Move`, `Delete`, `Restore`, re-parenting operation, and lifecycle change that affects structural eligibility must acquire the corresponding row in `masterdata_hierarchy_guard` with `PESSIMISTIC_WRITE` before reading or validating the hierarchy.
- The Guard Row lock, hierarchy validation, source mutation, and Business Revision persistence must remain inside the same database transaction.
- Prompt 5.10 Organization, Process, and Subprocess aggregate Update is structural because it owns the parent/owner field and must acquire the corresponding Guard even when the submitted parent value is unchanged.
- Related entities that form one hierarchy must share one Guard Row. `central_process` and `central_subprocess` share the `PROCESS` Guard Row.
- JVM-local locks, `Caffeine`, distributed-cache locks, table-wide locks, and entity `@Version` alone are not authoritative protection for hierarchy correctness.
- Read and follow:
  - `grcpc-docs/architecture/decisions/ADR-0001-database-hierarchy-guard-row.md`
  - `grcpc-docs/master-data/hierarchy-guard-row-contract.md`
  - `grcpc-app/AGENTS.md`

## Useful commands
Run commands from the relevant subproject directory.

Backend:
```bash
cd grcpc-app
./mvnw -Dskip.ui=true test
./mvnw -Dskip.ui=true package
```

Frontend:
```bash
cd grcpc-ui
npm run lint
npm run build
```

Full packaged app, including UI build copied into Spring Boot static resources:
```bash
cd grcpc-app
./mvnw -Dskip.ui=false package
```

## Before finishing a task
- Mention the important files changed.
- Mention verification commands you ran, or state clearly if you could not run them.
- For risky changes, explain the migration/configuration impact.
- For every hierarchy-related change, report the hierarchy key, guarded entry points, transaction boundary, and concurrency verification performed.
