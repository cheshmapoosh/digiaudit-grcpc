# AGENTS.md - UI process feature

## Scope
Applies to `src/features/process`.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Document commands remain outside Revision under the Prompt 4.2 correction.
- Document temporary upload keeps the simplified Prompt 4.2 contract.
- No automated tests are part of this task.

## Process/Subprocess UI rules
- Use `/api/master-data/central/processes`, `/api/master-data/central/subprocesses`, and `/api/master-data/central/process-tree` only for structural data.
- Keep one combined visual tree, but persist Process and Subprocess through separate typed command models.
- Create does not send status. Edit sends `ACTIVE` or `INACTIVE` with General Information and never sends code, node type, parent Process, or owning Process.
- Process parent and Subprocess owner are selectable on Create and Move-only afterward. Inactive nodes remain visible, selectable, editable, searchable, and structurally eligible in the combined tree.
- Only General Information and Documents tabs are visible. The List Report toolbar exposes typed Create, View, and Delete.
- Do not send `nodeType`, generic parent IDs, process category, owner, document count, objective, or operation-cycle fields in Update payloads.
- Subprocess is a leaf and must not offer structural child creation.
- Re-enable the shared Document component only with exact persisted V2 IDs and target types `CENTRAL_PROCESS` or `CENTRAL_SUBPROCESS`.
