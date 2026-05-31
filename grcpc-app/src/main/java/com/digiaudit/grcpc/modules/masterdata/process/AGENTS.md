# AGENTS.md - backend process master data

## Scope
Applies to the backend process feature under `modules/masterdata/process`.

## Feature purpose
Process master data models process trees and controls.

## Hierarchy rules
- `process` can contain child `process` and `subProcess` nodes.
- `subProcess` can contain `control` nodes.
- `control` is a leaf and must not have children.

## Rules
- Keep process/control entities and assignment entities consistent. Do not collapse separate concepts without an explicit migration/design decision.
- Keep `nodeType` values compatible with the UI: `process`, `subProcess`, `control`.
- Keep API base path `/api/processes` aligned with the UI repository.
- Validate hierarchy changes to prevent cycles and invalid parent-child combinations.
- Delete operations must protect children, controls, and assignments.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If DTOs change, update `grcpc-ui/src/features/process`.
