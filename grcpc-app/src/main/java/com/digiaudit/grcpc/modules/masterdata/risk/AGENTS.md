# AGENTS.md - backend risk master data

## Scope
Applies to the backend risk feature under `modules/masterdata/risk`.

## Feature purpose
Risk master data is a tree with risk categories and risk templates/patterns.

## Hierarchy rules
- `riskCategory` can contain child `riskCategory` nodes and `riskTemplate` nodes.
- `riskTemplate` is a leaf and must not have children.

## Rules
- Keep risk effects using the existing value/converter pattern; do not store untyped ad-hoc JSON.
- Keep `nodeType` values compatible with the UI: `riskCategory`, `riskTemplate`.
- Keep API base path `/api/risks` aligned with the UI repository.
- Validate hierarchy changes to prevent cycles and invalid parent-child combinations.
- Protect references from organization risk assignments before deleting nodes.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If DTOs change, update `grcpc-ui/src/features/risk`.
