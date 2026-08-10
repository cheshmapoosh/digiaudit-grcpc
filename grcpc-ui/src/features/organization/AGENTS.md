# AGENTS.md - UI organization feature

## Scope
Applies to `src/features/organization`.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Parent Save submits declarative Document drafts in the same aggregate request; temporary upload remains an immediate target-independent command.
- Document temporary upload keeps the simplified Prompt 4.2 contract.
- No automated tests are part of this task.

## Organization UI rules
- Use `/api/master-data/organizations` only for Organization structural data.
- General Information uses `code`, `name`, `organizationType`, `parentOrganizationId`, `status`, `location`, `validFrom`, `validTo`, and `description`; `displayLabel` is the Organization name.
- Create displays server-owned `ACTIVE` without sending status. Edit sends only `ACTIVE` or `INACTIVE` with General Information; `DELETED` is never selectable.
- Code is Create-only. Parent is selectable on both Create and Edit and is submitted by the same Save command. Exclude the current Organization and its descendants. Inactive nodes remain visible, selectable, editable, searchable, and structurally eligible.
- Modal tab order is General Information, Subprocess, Risks, Controls, Regulations, Objectives, Policy, Documents. General Information and Documents are active; the intermediate relationship tabs are visible but disabled until their typed V2 flows are implemented.
- The List Report toolbar exposes only Create, View, and Delete.
- Keep the FCL tree/list/object-page flow, parent value help, selection, expanded state, RTL, and i18n behavior.
- Use the shared Document component in `PARENT_SAVE` mode with target type `ORG`; it emits serializable drafts and never performs a separate finalize command from this ObjectPage.
