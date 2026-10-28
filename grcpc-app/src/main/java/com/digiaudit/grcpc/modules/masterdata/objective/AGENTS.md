# AGENTS.md - backend objective master data

## Scope
Applies to the backend objective feature under `modules/masterdata/objective`.

## Feature purpose
Strategies and objectives share the `objective` hierarchy. A strategy is a root category with no parent strategy; an objective is a leaf with exactly one root strategy parent.

## Rules
- Follow `grcpc-docs/master-data/accepted-corrections/2026-10-27-objective-strategy-classification.md` for delivery item 3.
- The owner's follow-up `grcpc-docs/master-data/accepted-corrections/2026-10-28-objective-strategy-corrections.md` supersedes nested strategies and the shared Strategy form. Strategy Create/Update retains only code/name/description and Documents; objective type and validity are normalized to null. Strategy parents and Strategy children are rejected before mutation.
- Preserve tree behavior using `parentObjectiveId`; prevent cycles and invalid parent references. `kind` distinguishes `STRATEGY` from `OBJECTIVE` and is independent of `objectiveType`.
- Create, aggregate Update (including kind changes), Delete and Restore use the existing `OBJECTIVE` Guard. Create/Update and Organization Objective assignment retain the `ORGANIZATION` Guard union.
- Keep `nodeType` compatible with the UI type `objective`.
- Keep API base path `/api/objectives` aligned with the UI repository.
- Organization Objective changes use typed prepare/apply inside the protected owner transaction. Objective Create/Update records one CENTRAL owner Revision and one caused-by LOCAL Revision per changed Organization; Organization Save batches this family with its other LOCAL contents. Empty collections are no-op and unchanged relationships add no Revision Content. Preserve pair IDs, versions and local metadata when restoring.
- Validate date ranges such as effective/valid dates when business logic requires it.
- Do not introduce drag-and-drop/reordering semantics unless explicitly requested.

## Verification
- Only the authorized offline backend compile with `-Dskip.ui=true -Dmaven.test.skip=true`, UI typecheck and lint are permitted. Do not create, modify or run tests, run the application/Flyway, or connect to a database/browser/external service.
- If DTOs change, update `grcpc-ui/src/features/objective`.
