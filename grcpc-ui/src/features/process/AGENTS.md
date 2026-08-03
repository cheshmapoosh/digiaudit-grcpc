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
- Do not send `nodeType`, generic parent IDs, process category, owner, document count, objective, or operation-cycle fields in mutation payloads.
- Subprocess is a leaf and must not offer structural child creation.
- Remove the Account Group tab and show deferred relation-tab messaging for other unavailable V2 relation slices without calling Legacy APIs.
- Re-enable the shared Document component only with exact persisted V2 IDs and target types `CENTRAL_PROCESS` or `CENTRAL_SUBPROCESS`.
