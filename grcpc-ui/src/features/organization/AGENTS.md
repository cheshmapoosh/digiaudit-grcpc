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
- General Information uses `code`, `name`, controlled `organizationTypeId`, `parentOrganizationId`, `status`, `location`, `validFrom`, `validTo`, and `description`; `displayLabel` is the Organization name. Use the selected profile's Organization Type options and response `organizationTypeName`; the old enum is only a coarse compatibility field. The type ID joins the existing dirty/readiness/schema/aggregate Save flow.
- Create displays server-owned `ACTIVE` without sending status. Edit sends only `ACTIVE` or `INACTIVE` with General Information; `DELETED` is never selectable.
- Code is Create-only. Parent is selectable on both Create and Edit and is submitted by the same Save command. Exclude the current Organization and its descendants. Inactive nodes remain visible, selectable, editable, searchable, and structurally eligible.
- Organization can be a root: Remove Parent in the editable header or parent picker's footer clears only the draft; aggregate Save submits a null parent. No clearing in View/busy state and no separate Move request. The Organization modal has a 70dvh maximum; the Subprocess table reserves measured modal chrome and provides bounded two-axis scrolling. Draft activation/inactivation/deletion use explicit blue labels; mixed lifecycle selections stage only rows whose state changes.
- Modal tab order is General Information, Subprocess, Risks, Controls, Regulations, Control Objectives, Business Objectives, Policy, Owners, Documents. Subprocess drafts, General Information, owner Assignments and Organization Documents share the Organization aggregate Save. Other Local relationship editors retain their existing typed Local APIs.
- A Local Context is an explicit Organization/Subprocess relationship. Context and row deep links retain their IDs and list status in the URL. Local drafts participate in the modal's dirty navigation guard.
- Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-organization-subprocess-selection.md`: the Subprocess tab has a three-column Code/Name/Status table controlled by the modal's main Edit/Save, with no independent Edit/Save/Cancel/Undo/Restore. The searchable hierarchy picker only stages blue drafts. One Organization aggregate request saves Local Context changes atomically; reselecting deleted pairs restores the same ID to ACTIVE. Deleted rows are never displayed; the status filter offers Not selected, Active and Inactive only. Preserve drafts across tabs and retain the active tab on Organization Edit/Save. Create may also stage Subprocesses before the first Organization Save.
- The List Report toolbar exposes only Create, View, and Delete.
- Keep the FCL tree/list/object-page flow, parent value help, selection, expanded state, RTL, and i18n behavior.
- Use the shared Document component in `PARENT_SAVE` mode with target type `ORG`; it emits serializable drafts and never performs a separate finalize command from this ObjectPage.
- Owners use a native UI5 Table/TableSelectionMulti and searchable Dialog; keep CREATE_OR_RESTORE/DELETE changes in parent draft state, including assignment versions for Delete. Pending selection and changes join dirty/navigation protection and Save readiness. Remove the old scalar owner field from General Information. Only root and authorized profile admins edit owners; other Organization managers can view them. Eligibility is server-owned and profile-filtered.

- The accepted 2026-10-27 correction removes the four Local Coverage managers and all linked Coverage lists from this form. Coverage localSection deep links fall back to an authorized section of the same tab and clear invalid selections. Contexts, Scopes, Organization Objectives, Policy Scope and Documents remain.

## Main-page display ordering (2026-10-28)

Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-main-catalog-display-order.md`. The explicit owner approval supersedes earlier no-drag rules only on main Governance trees. Sibling-only native UI5 dragging saves independent display ranks under the existing hierarchy Guard and one CENTRAL Revision; new inserts appear first. Modals, value helps and relationship tabs keep their existing sorting and have no ordering provider.

## Unified modal relationship ownership

The accepted `grcpc-docs/master-data/accepted-corrections/2026-10-28-governance-modal-relations.md` supersedes the earlier independent Local tab APIs and Owner row Undo clauses above. OrganizationObjectPage owns L1–L9, B1 and O1 drafts/readiness; OrganizationLocalDraftWorkspace mounts concrete relationship tables without immediate writes. Create also supports pending Context and exact pending Local Scope references. The main Save sends one typed aggregate and merges canonical rows/tombstones. O1 uses real ACTIVE/INACTIVE/DELETED separately from user eligibility. Local-row standalone Documents retain their existing exception.

The later `grcpc-docs/master-data/accepted-corrections/2026-10-28-organization-risk-selection.md` makes the Risks tab one Organization-wide table with a Subprocess column and no Context/source-mode combo. New selection uses exact Central Risk Scopes only from this Organization's connected Subprocesses; the chosen leaf supplies its Context. Explicit pending L1 Contexts are supported, but this picker never creates a Context itself. Existing Local source/reference/ID and metadata are retained on restore; all drafts still use the main Organization Save. Other Local tabs keep their Context/target controls.

The subsequent `grcpc-docs/master-data/accepted-corrections/2026-10-28-organization-scope-selection.md` extends that same Organization-wide table and exact Scope selection pattern to Controls, Control Objectives and Regulations (the existing Requirement Scopes). Their Select actions do not require a Context combo. `OrganizationScopesTab`/`OrganizationScopesTable` retain Control owner/frequency/execution/test/note metadata, historical source/occupied pairs, pending L1 references, Documents and main aggregate Save. Policy Context/target controls remain as before.
