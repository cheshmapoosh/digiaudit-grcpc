# AGENTS.md - backend policy master data

## Scope
Applies to the backend policy feature under `modules/masterdata/policy`.

## Feature purpose
Policies are tree-based master data with two node types: `policyGroup` and `policy`.

## Hierarchy rules
- `policyGroup` can contain child `policyGroup` nodes and `policy` nodes.
- `policy` is a leaf and must not have children.

## Rules
- Keep `nodeType` values compatible with the UI and API DTOs.
- Keep API base path `/api/policies` aligned with the UI repository.
- Validate lifecycle fields such as version, valid dates, review date, status, and communication settings.
- Delete operations must protect child nodes and dependent references.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If DTOs change, update `grcpc-ui/src/features/policy`.
