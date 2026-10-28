# Organization-wide Control, Control Objective and Requirement selection — 2026-10-28

The project owner extended the accepted [Organization Risk selection pattern](2026-10-28-organization-risk-selection.md)
to the Organization Controls tab and to Regulations and Control Objectives if
they shared the same manual Context restriction. All three use that restriction.
This correction replaces their Context/source-mode controls with one table per
tab, across the same Organization's connected Subprocesses. Policy target
selection and the existing Risk implementation keep their current contracts.

## Display and selection

- Controls, Control Objectives and Regulations each show one Local Scope table
  with a Subprocess column. The Regulations tab continues to own existing
  **Requirement** Scopes; it does not create a direct Organization/Regulation
  relationship or select a Regulation as a substitute for its Requirements.
- Select is visible in Create/Edit without first selecting a Context. It is
  disabled while reads or required Control metadata are unavailable, or when
  no connected final ACTIVE Context exists. With no Context, the table explains
  that Subprocesses must first be selected in the Subprocesses tab.
- One additive native UI5 hierarchy picker groups Local occupied pairs and new
  Central candidates, with Process/Subprocess ancestors. Only leaves select.
  The selected row supplies the exact Context and Central Scope automatically.
- New candidates are exact ACTIVE Central Control, Control Objective or
  Requirement Scopes from this Organization's connected final ACTIVE Contexts,
  intersected with ACTIVE Subprocesses and active typed definition options.
  No Scope read is issued for an unconnected Subprocess. A definition without
  that Central Scope is not a new candidate in these three pickers.
- Explicit pending L1 create/restore drafts count as connected Contexts in the
  same aggregate, using `contextRef.subprocessId`. Selection never creates L1
  implicitly, never writes immediately and never fabricates a persisted ID.
- A definition under two Subprocesses is two distinct Context/definition pairs.
  Current occupied pairs and pending new selections cannot be added twice.
  Reselecting a pending deletion cancels it and retains pending metadata.
  Eligible deleted pairs restore the same ID/version and historical source and
  reference. Historical `LOCAL_ADDED` rows remain restorable without a new
  Central reference; inherited rows require their exact active old reference.

## Drafts and metadata

Lifecycle batches, blue draft statuses, status/search filters, pinned pending
and invalid-date rows, retained tab state and canonical delta reconciliation
follow the existing Risk tab. The main Organization Save owns all three typed
collections. New/restored draft deletion removes the draft; returning to the
persisted metadata and status removes the effective change.

Control retains actual owner, frequency, execution method, test method, local
note and validity dates. Fresh values remain null unless the user supplies
them, matching the existing backend contract; Central recommendations are not
silently copied. Restore and Update retain all metadata. Control options are
loaded only in editable Controls; read-only labels use existing translations
and persisted owner names. Invalid raw dates, pending picker selection and
Local-row Document drafts join the main readiness and navigation guards.
Standalone Local Documents retain their existing explicit exception.

Source/reference identity stays immutable. Pending inherited changes validate
the known Central status and validity bounds; retained dates can be corrected
before Save. Final INACTIVE Contexts stay visible but cannot receive new,
restored or activated Scopes. Final DELETED Contexts permit explicit dependent
deletion only; dangling drafts remain reviewable and block Save.

## API, security and transaction boundary

No backend source, database schema, migration or permission changes are needed.
The existing typed `localControlScopeChanges`,
`localControlObjectiveScopeChanges` and `localRequirementScopeChanges` remain
the aggregate payloads. Reads require REFERENCE/PROCESS and CONTROL or
GOVERNANCE view as appropriate; writes retain Organization manage and REFERENCE
manage plus the corresponding view permissions.

Existing lexical Guard unions remain Control `CONTROL → ORGANIZATION → PROCESS`,
Control Objective `ORGANIZATION → PROCESS`, and Requirement
`ORGANIZATION → PROCESS → REGULATION`. Organization Create/Update acquires the
union before hierarchy reads; prepare, source mutation, CENTRAL/linked LOCAL
Revisions, Local apply and parent-save Documents remain inside one outer
protected transaction. No Control Objective Guard or immediate relation writer
is introduced. Concurrency was reviewed from source only.

## Source and verification

`OrganizationScopesTab.tsx` owns scoped reads and picker staging;
`OrganizationScopesTable.tsx` owns the controlled table and Control metadata.
The closed three-family `organizationScopes.model.ts`,
`organizationScopeSelection.ts` and `organizationScopeSelection.api.repo.ts`
adapt the existing concrete types and APIs. `OrganizationLocalDraftWorkspace`
keeps visited tables mounted and routes all drafts to the Organization Save.

Only UI typecheck, lint and static source/diff review are permitted. No tests,
MCP, app, browser, database, MinIO, Flyway or real concurrency execution is part
of this delivery. No runtime behavior is claimed from static verification.

`npm run typecheck`, `npm run lint` and `git diff --check` completed successfully.
Backend compile was not repeated because this correction changes no backend
source or contract. The existing Guard/transaction paths were reviewed from
source; no real concurrency or runtime UI verification was performed.
