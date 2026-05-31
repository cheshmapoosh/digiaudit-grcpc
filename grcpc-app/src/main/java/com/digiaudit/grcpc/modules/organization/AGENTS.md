# AGENTS.md - backend organization module

## Scope
Applies to the backend `organization` module.

## Feature purpose
Organization stores the organization tree and its assignments/relationships to processes, risks, regulations, policies, and other references.

## Rules
- Preserve tree behavior using `parentId`; prevent cycles and invalid parent references.
- Keep organization code uniqueness and status semantics consistent with existing service logic.
- Keep API base path `/api/organizations` and assignment endpoints aligned with the UI repositories.
- Keep assignment APIs explicit: process assignments, risk assignments, controls, and reference assignments should remain understandable and separately testable.
- Be careful with cross-module references. Use UUID references consistently unless a deliberate FK migration is requested.
- Delete operations must protect child organizations and dependent assignments/references.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If DTOs or assignment contracts change, update `grcpc-ui/src/features/organization`.
