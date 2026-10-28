# Organization-wide Risk selection — 2026-10-28

The project owner requested a single Organization Risks table without a
Subprocess Context or source-mode combo. In the clarification, the owner chose
**only risks from Subprocesses already connected to that same Organization**.
Selecting a risk does not create or select another Organization/Subprocess
Context. This supersedes only the Risk-tab context/picker presentation in the
[modal relationship correction](2026-10-28-governance-modal-relations.md).

The subsequent [Organization Scope selection correction](2026-10-28-organization-scope-selection.md)
extends this same pattern to Controls, Control Objectives and Regulations
(Requirement Scopes), superseding the earlier requirement below to retain their
manual Context controls. This Risk implementation remains unchanged.

## Presentation and selection

- Existing Local Risk relationships from all of the Organization's current
  Contexts appear together, with a Subprocess column, Risk code/name, relationship
  lifecycle, historical source and validity. They remain editable through the
  main Organization Edit/Save. Persisted DELETED rows stay hidden.
- Select opens one additive native UI5 hierarchy picker. Its exact Central Risk
  Scope leaves are under Process/Subprocess ancestors. Only this Organization's
  connected, final ACTIVE Contexts and ACTIVE Subprocess/RiskTemplate/Scope
  endpoints supply new candidates. A RiskTemplate alone is not a destination.
  The chosen leaf supplies the Context and Subprocess automatically.
- Explicit L1 create/restore drafts already staged in this same Organization
  aggregate are also connected Contexts for this purpose. Their typed
  `contextRef.subprocessId` is retained, preserving Organization Create without
  an early Save. The Risk picker never stages L1 itself.
- Already occupied ACTIVE/INACTIVE pairs are excluded from new selection.
  A Risk under two connected Subprocesses is two distinct Context/Risk pairs.
  Selection keys preserve the exact Context and Central Scope identity.
- New Central choices stage `CREATE_OR_RESTORE` with
  `INHERITED_FROM_CENTRAL`, the exact Central Risk Scope ID and its validity.
  This picker no longer creates a fresh LOCAL_ADDED row from an unscoped
  RiskTemplate. The underlying model/API still supports LOCAL_ADDED; this is a
  narrower selection surface, not a schema or global business-rule rewrite.
- Existing historical LOCAL_ADDED and inherited rows remain Local Organization
  relationships. Their immutable source/reference is not inferred anew from
  whether they are currently selected. Internal Local candidates permit
  reselecting pending deletions and restoring eligible occupied deleted pairs
  using the same ID/version and retained metadata. Inherited restoration still
  needs its exact active old Central reference. Retained dates can be corrected
  in the pending row before Save if Central validity changed.

## State, security and persistence

Search/filter and tab changes retain drafts and selections. Pending rows and raw
invalid dates stay reviewable. Final INACTIVE Contexts remain visible, but cannot
receive new/restored/activated risks. Final DELETED Contexts allow only explicit
dependent deletion; orphan drafts remain visible and block Save until resolved.
Picker open, Local-row Document drafts and invalid dates join the main dirty and
readiness guards. Existing standalone Local Documents keep their contract.

All current/deleted Local rows are read through all pages for the selected
Organization's Contexts. Canonical deltas merge by highest version. Queries do
not fetch another Organization/Context based on an arbitrary deep link.
Central Scope reads are limited to the supplied connected Subprocess IDs;
eligibility additionally intersects active Local template options and the
current Process/Subprocess hierarchy. Reads require the existing
REFERENCE/PROCESS/RISK view permissions. The main Organization Save retains its
Organization manage and Local REFERENCE manage + PROCESS/RISK view checks.

No backend command, DTO, schema, migration or authority change is introduced.
The existing `localRiskScopeChanges` payload and
`ORGANIZATION → PROCESS → RISK` Guard union continue to run inside the protected
Organization aggregate transaction, with its linked LOCAL Revision. No immediate
relationship write, browser-created UUID, extra Context or CENTRAL mutation is
performed by selection.

## Source files and verification

- `OrganizationRisksTab.tsx`: scoped reads, canonical reconciliation, picker
  lifecycle and staging into the owner draft collection.
- `OrganizationRisksTable.tsx` / `organizationRisks.model.ts`: one controlled
  table, lifecycle/metadata drafts, Document exception and readiness.
- `organizationRiskSelection.ts` / `organizationRiskSelection.api.repo.ts`:
  closed candidate derivation, occupied-pair handling and exact scoped reads.
- `OrganizationLocalDraftWorkspace.tsx`: risk-only unified surface; the other
  seven Local surfaces keep their existing Context/target UX.

Verification is limited to UI typecheck, lint and static source/diff inspection.
`npm run typecheck` and `npm run lint` completed successfully, with no lint
warnings, and `git diff --check` passed. Backend compile was not repeated because
this follow-up changes no backend source or contract. Source review confirmed
the existing Guard/transaction path; no real concurrency verification ran.
No tests, MCP, app, browser, database, MinIO, Flyway or real concurrency execution
is permitted. No runtime UI or database behavior is claimed from source checks.
