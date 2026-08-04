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
- General Information uses `code`, `name`, `organizationType`, `parentOrganizationId`, `status`, `location`, `validFrom`, `validTo`, and `description`; `displayLabel` is the Organization name.
- Create displays server-owned `ACTIVE` without sending status. Edit sends only `ACTIVE` or `INACTIVE` with General Information; `DELETED` is never selectable.
- Code is Create-only. Parent is selectable on Create and Move-only afterward. Inactive nodes remain visible, selectable, editable, searchable, and structurally eligible.
- Only General Information and Documents tabs are visible. The List Report toolbar exposes only Create, View, and Delete.
- Keep the FCL tree/list/object-page flow, parent value help, selection, expanded state, RTL, and i18n behavior.
- Re-enable the shared Document component only with exact persisted V2 `organization.id` and target type `ORG`.
