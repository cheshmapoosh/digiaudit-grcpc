# AGENTS.md - backend regulation module

## Scope
Applies to the backend `regulation` module.

## Feature purpose
Regulations are tree-based legal/reference master data with law groups, laws, and law requirements.

## Hierarchy rules
- `lawGroup` can contain child `lawGroup` nodes and `law` nodes.
- `law` can contain `lawRequirement` nodes.
- `lawRequirement` is a leaf and must not have children.

## Rules
- Keep `nodeType` values compatible with the UI: `lawGroup`, `law`, `lawRequirement`.
- Keep API base path `/api/regulations` aligned with the UI repository.
- Requirements belong under laws; do not add a requirements tab/child model under requirement nodes.
- Validate effective/valid dates and issuer/owner metadata where business rules require it.
- Delete operations must protect child nodes and dependent references.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If DTOs change, update `grcpc-ui/src/features/regulation`.
