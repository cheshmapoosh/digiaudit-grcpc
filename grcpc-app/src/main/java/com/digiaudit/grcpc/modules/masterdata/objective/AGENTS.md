# AGENTS.md - backend objective master data

## Scope
Applies to the backend objective feature under `modules/masterdata/objective`.

## Feature purpose
Objectives are hierarchical master data nodes. An objective can contain child objectives.

## Rules
- Preserve tree behavior using `parentId`; prevent cycles and invalid parent references.
- Keep `nodeType` compatible with the UI type `objective`.
- Keep API base path `/api/objectives` aligned with the UI repository.
- Validate date ranges such as effective/valid dates when business logic requires it.
- Do not introduce drag-and-drop/reordering semantics unless explicitly requested.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If DTOs change, update `grcpc-ui/src/features/objective`.
