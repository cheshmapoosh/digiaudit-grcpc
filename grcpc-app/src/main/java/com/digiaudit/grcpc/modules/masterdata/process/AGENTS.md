# AGENTS.md - backend process master data

## Scope
Applies to the backend process feature under `modules/masterdata/process`.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Document commands remain outside Revision under the Prompt 4.2 correction.
- Document temporary upload keeps the simplified Prompt 4.2 contract.
- No automated tests are part of this task.

## Process/Subprocess rules
- Persist Process rows only in `central_process`.
- Persist Subprocess rows only in `central_subprocess`.
- The combined Process/Subprocess tree DTO may expose `PROCESS` and `SUBPROCESS` node types for UI presentation only.
- Subprocess is a structural leaf and must not expose child creation.
- Keep explicit typed V2 command routes under `/api/master-data/central/processes` and `/api/master-data/central/subprocesses`.
