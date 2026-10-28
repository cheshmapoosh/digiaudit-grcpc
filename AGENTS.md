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

## Profile-owned Basic Data

- Profile-owned Organization Types and Document Types are flat administrative Basic Data, separate from the core catalogs above. Root and authorized profile admins manage them under Initial Data Management (مدیریت داده‌های اولیه); Profile management remains root-only within that menu. Their profile IDs are server-owned and immutable. New references require an active type from the selected profile; referenced types cannot be deleted. See `grcpc-docs/master-data/accepted-corrections/2026-10-28-profile-owned-basic-data.md`.

## Organization owner Assignments (2026-10-28)

- Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-organization-owner-assignments.md`. Typed many-to-many owner Assignments replace the scalar owner field and join Organization aggregate Save under the existing ORGANIZATION Guard and transaction. The Owners tab precedes Documents.
- Actual root, authorized profile admins, and profile-local MASTER_DATA_ADMIN/ORGANIZATION_MASTER_DATA_MANAGER users are eligible owners. Only root and the selected profile's admin manage assignments. Ownership grants no authority. The new Organization role has narrow MD_ORGANIZATION permissions; existing Reference permissions retain Organization compatibility.

## Governance modal relationship drafts (2026-10-28)

- Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-governance-modal-relations.md`. The modal's main Save owns its typed editable relations; Local Organization L1–L9/B1 share one linked LOCAL Revision and O1 shares the Organization CENTRAL Revision, in one protected transaction. B1 is editable from both existing surfaces. O1/G1 support ACTIVE/INACTIVE/DELETED through forward V1202.
- No independent relationship Edit/Save/Undo/Restore UI or immediate relationship writes mount in these modals. Deleted reads are internal occupied-pair lookup only. Inverses/projections/structural Requirements remain read-only; Documents and independent structural Import retain their explicit exceptions.
- All structural parent updates use the existing Guard and one aggregate command. Shared table viewports divide the actual 70% modal budget; pending/invalid drafts join the main unsaved/readiness guard. Verification remains compile/typecheck/lint/static only.

## Structural hierarchy concurrency rule

- The later `grcpc-docs/master-data/accepted-corrections/2026-10-28-regulation-requirement-aggregate.md` supersedes the independent structural Import/read-only Requirement exception above only for the Regulation Requirements tab: Excel confirmation stages fresh children and lifecycle joins main Regulation Save. The latest owner correction removes View and its child modal; blue Excel replaces Select in the common RTL-aligned toolbar. Existing dependencies and one guarded CENTRAL transaction remain; Governance widths share one rule.

- The accepted `grcpc-docs/master-data/accepted-corrections/2026-10-28-main-catalog-display-order.md` authorizes sibling drag-and-drop only on the nine main Governance tree pages. Persist independent `display_order` fields in existing tables; forms, modals, value helps, relationship tabs and their existing sort fields remain outside this behavior. Reorder uses the existing hierarchy Guard, profile protection, versions and one CENTRAL Revision. New inserts are first in their group.
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
