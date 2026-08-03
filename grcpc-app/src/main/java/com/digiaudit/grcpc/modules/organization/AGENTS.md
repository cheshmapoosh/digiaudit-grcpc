# AGENTS.md - backend organization module

## Scope
Applies to the backend `organization` module.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Document commands remain outside Revision under the Prompt 4.2 correction.
- Document temporary upload keeps the simplified Prompt 4.2 contract.
- No automated tests are part of this task.

## Organization rules
- Organization maps only the approved V2 `organization` table fields.
- Use `code` as the derived structural display label; do not add Legacy `name`, `type`, `location`, or description fields.
- Keep explicit create, update, move, activate, inactivate, delete, and restore commands under `/api/master-data/organizations`.
- Delete operations must protect child organizations and approved V2 dependents without cascading.
