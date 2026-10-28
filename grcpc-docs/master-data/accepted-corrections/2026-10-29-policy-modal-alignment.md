# Policy modal alignment and active Create status — 2026-10-29

The project owner requested fixed ACTIVE status in catalog Create modals,
Organization-style Policy General Information layout and Policy relationship
toolbars/pickers consistent with Organization Subprocess selection.

## Create and form layout

- Policy Group and Policy Create show a native Positive ObjectStatus ACTIVE,
  with no editable status control. Initial values, baseline and submitted Create
  drafts normalize ACTIVE even if an inactive record was previously supplied.
  The Policy page also explicitly submits ACTIVE for Create. Edit lifecycle
  controls and existing View values retain their previous behavior.
- Organization, Process/Subprocess, Account Group, Control/Control Group,
  Control Objective, Risk and Regulation-family status fields use the same
  fixed ACTIVE presentation in Create. Objective/Strategy and Global Control
  forms already have no Create status editor and retain their minimal forms.
  This is a bundled UI correction; existing backend API contracts are unchanged.
- Policy General Information uses the existing `modalThreeColumnGrid` and
  `modalDateRange` layout from Organization: three columns on wide screens,
  two on medium screens and one on narrow screens. The review date and paired
  validity dates keep their existing editors and dirty/invalid state. Policy
  Group retains the common compact two-column group layout. Feature-local form
  grid/date breakpoint rules no longer compete with the common layout.

## Relationship toolbar and selection

The four Policy relationship tabs supply their typed title to the same
`CatalogRelationToolbar` used by Organization Subprocesses. Its full-width
layout and title auto-margin align filters, search and actions to the left in
Persian RTL. No theme, native control size or shadow styling is overridden.

The options APIs and tab-to-kind mapping were already distinct. The misleading
common dialog came from a generic title and showing every Process branch in
the Control/Requirement pickers. `policySelectionHierarchy.ts` retains only
ancestors belonging to typed options. Each kind has its own translated title,
search name and hint, and mounts the shared native
`HierarchyMultiSelectionDialog` only while open, with a kind-specific key.

- Subprocess choices are `subprocessId` leaves under Process ancestors.
- Organization choices retain `organizationId` and existing eligible-parent
  selection; hierarchy eligibility is not narrowed to leaf organizations.
- Control choices remain exact `centralControlScopeId` leaves beneath their
  Process/Subprocess and Control Group display context.
- Requirement choices remain exact `centralRequirementScopeId` leaves beneath
  Process/Subprocess and Regulation display context.

Display ancestors do not introduce new active-status eligibility rules.
Occupied choices are labelled and cannot be added twice. Confirm requires a
nonempty selection whose IDs are still eligible. Search and confirmation use
the same native UI5 pattern as Organization Subprocesses. Pending pickers/raw
invalid dates continue to participate in the main Policy dirty/readiness guard.
Drafts persist across tab changes; no immediate relation writer is introduced.

Canonical rows reconcile by endpoint/highest version. Batch lifecycle acts on
visible selected rows. New relationship dates start at the intersection of
Policy and destination validity; historical restores retain their dates,
including null, and pending-delete cancellation retains prior metadata drafts.
An invalid interval remains visible and blocks Save until resolved.

## Persistence and verification boundary

The four concrete Policy Scope payloads, endpoint identities, permissions,
Documents and one Policy aggregate Save/CENTRAL Revision remain unchanged.
The existing Guard union still uses POLICY plus PROCESS, ORGANIZATION, CONTROL
and REGULATION as required, acquired lexically before hierarchy reads inside
the same protected aggregate transaction. No backend code, schema, migration or
new Guard is introduced; concurrency is reviewed from source only.

Verification is UI typecheck, lint and static source/diff review. No tests,
app/browser, database/Flyway, MCP/external services or real concurrency execution
are permitted. Backend compile is not repeated for these frontend-only edits.

`npm run typecheck`, full `npm run lint`, focused feature lint and
`git diff --check` completed successfully. Independent source review confirmed
Create/Edit separation, typed picker identities, retained tab/draft state,
historical date restoration and unchanged main Save ownership. No runtime UI
or real concurrent-transaction verification was performed.
