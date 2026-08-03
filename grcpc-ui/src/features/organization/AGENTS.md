# AGENTS.md - UI organization feature

## Scope
Applies to `src/features/organization`.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Document commands remain outside Revision under the Prompt 4.2 correction.
- Document temporary upload keeps the simplified Prompt 4.2 contract.
- No automated tests are part of this task.

## Organization UI rules
- Use `/api/master-data/organizations` only for Organization structural data.
- Use `code`/`displayLabel` as the structural label; do not send or render Legacy `name`, `type`, `location`, or description fields.
- Keep the FCL tree/list/object-page flow, parent value help, selection, expanded state, RTL, and i18n behavior.
- Show deferred relation-tab messaging instead of calling Legacy assignment APIs until typed V2 relation slices exist.
- Re-enable the shared Document component only with exact persisted V2 `organization.id` and target type `ORG`.
