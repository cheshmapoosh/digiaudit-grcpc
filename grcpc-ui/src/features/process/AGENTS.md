# AGENTS.md - UI process feature

## Scope
Applies to `src/features/process`.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Parent Save submits declarative Document drafts in the same aggregate request; temporary upload remains an immediate target-independent command.
- Document temporary upload keeps the simplified Prompt 4.2 contract.
- No automated tests are part of this task.

## Process/Subprocess UI rules
- Use `/api/master-data/central/processes`, `/api/master-data/central/subprocesses`, and `/api/master-data/central/process-tree` only for structural data.
- Keep one combined visual tree, but persist Process and Subprocess through separate typed command models.
- Create does not send status. Edit sends `ACTIVE` or `INACTIVE`, typed parent/owner, General Information, and Document drafts; it never sends code or node type.
- Process parent and Subprocess owner are selectable on both Create and Edit and are submitted by the same Save command. Exclude the current Process and descendants; Subprocess always selects an eligible Process owner.
- Only General Information and Documents tabs are visible. The List Report toolbar exposes typed Create, View, and Delete.
- Do not send `nodeType`, generic parent IDs, process category, document count, objective, or operation-cycle fields in Update payloads. Use only typed `parentProcessId` or `processId`.
- Subprocess is a leaf and must not offer structural child creation.
- Use the shared Document component in `PARENT_SAVE` mode with target types `CENTRAL_PROCESS` or `CENTRAL_SUBPROCESS`; it emits serializable drafts and never performs a separate finalize command from these ObjectPages.
