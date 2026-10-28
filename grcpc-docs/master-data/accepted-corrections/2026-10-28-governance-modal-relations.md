# Governance modal relationship drafts — 2026-10-28

This is the project owner's accepted execution contract in
[the implementation prompt](../prompts/2026-10-28-governance-modal-relations-unification-fa.md).
It supersedes the earlier independent Local/Organization Objective tab writers,
Owner row Undo, two-state Owner/Global Control links, and chained modal
Update/Move/Lifecycle saves. Historical decisions remain historical evidence.

The later [Organization Risk selection correction](2026-10-28-organization-risk-selection.md)
replaces only the Risk-tab Context/source picker with an Organization-wide Local
table and exact Central Scope selection under this Organization's connected
Subprocesses. It preserves the typed aggregate, historical sources and all other
Local surfaces described here.

The subsequent [Organization Scope selection correction](2026-10-28-organization-scope-selection.md)
extends the same connected-Subprocess pattern to Controls, Control Objectives
and Regulations (the existing Local Requirement Scopes), retaining each typed
collection, metadata and aggregate transaction.

## UI ownership

The subsequent [Regulation Requirement aggregate correction](2026-10-28-regulation-requirement-aggregate.md)
supersedes this document's independent Import and read-only structural Requirement
exception only in the Regulation Requirements tab. Excel stages fresh children,
the blue Excel action replaces Select without a nested View, and main Regulation
Save owns child lifecycle.

The main catalog modal owns General Information, typed structural parent,
all its editable relationship drafts, and its existing parent-save Document
drafts. Relationship tables have one native UI5 multi-selection toolbar:
Select, Activate, Inactivate and Delete. SearchDialog confirmation only stages
choices. View/inverse/projection/structural-child tables do not gain write
authority. The Documents UX, immediate temporary upload and existing Local-row
standalone Documents retain their contracts. Coverage managers remain unmounted.

Persisted ACTIVE and INACTIVE relationships remain visible. Persisted DELETED
rows are an internal occupied-pair lookup only. Pending changes are semantic
Information statuses; a pending Delete remains visible until commit. Reselecting
an occupied deleted pair restores its original ID and retained metadata.
Removing a new/restored draft emits no Delete. Lifecycle batches operate only
on selected eligible rows whose final state changes, and returning metadata and
status to the baseline removes the draft. Filters are Not selected, Active and
Inactive; pending/invalid-date rows stay reviewable. Pickers are additive,
multi-select and preserve hierarchy ancestry. Structural parent pickers remain
single-select and follow the existing required/root rules.

Native Dialog header/footer slots and a shared measured table budget cap the
actual catalog hosts at 70vh/70dvh without imposing a fixed height. Visible
tables divide the remaining space and scroll on both axes. Tab/context changes
retain draft state. Main Edit/Save retain the valid active tab. Pending pickers,
invalid raw dates and Document changes participate in readiness and the
existing navigation/unload/discard protection.

## Closed typed Organization aggregate

CreateOrganizationRequest and UpdateOrganizationRequest retain `subprocesses`
and add eight explicit collections: `localControlScopeChanges`,
`localRiskScopeChanges`, `localControlObjectiveScopeChanges`,
`localRequirementScopeChanges`, `localOrganizationPolicyChanges`,
`localContextPolicyChanges`, `localControlPolicyChanges` and
`localRequirementPolicyChanges`. `organizationObjectiveChanges` joins the same
Organization Save. Null/empty collections mean no changes.

`contextRef` identifies one existing Context or the Subprocess of a Context
create/restore in this same request. `controlScopeRef` and
`requirementScopeRef` identify one existing exact Local Scope or one typed
Context/definition pair created/restored in the request. Only the server
allocates persistence UUIDs. Source and exact Central reference remain immutable
on persisted Local Scopes. The concrete Local services retain their typed
validation, authorization, validity containment and dependency rules; prepare
and apply are MANDATORY transaction participants. An internal, closed typed
deletion plan distinguishes dependency families and never permits a hidden
cascade or a UUID in another table to exempt a dependency.

The protected outer Organization transaction first takes ADMINISTRATION, then
the complete lexical hierarchy union before any hierarchy reads. The base key
is ORGANIZATION; submitted families add PROCESS, CONTROL, RISK, REGULATION,
POLICY or OBJECTIVE as applicable. No new hierarchy key is introduced.
Endpoint locking precedes relationship locks: Organization, sorted Subprocesses,
Control, Risk Template, Control Objective, Requirement, then the other typed
Policy/Business Objective and exact Central Scope endpoints. IDs are ordered
within each type. Owner, Context, Scope and Policy pair rows are locked before
their mutations. The preflight locks are retained when nested prepares revisit
already-held endpoints.

Organization and O1 contents share the owner-first CENTRAL Revision. All changed
L1–L9 and B1 rows for that Organization share one LOCAL Revision linked by
`causedByRevisionId`. An empty effective Local plan creates no LOCAL Revision.
Both revisions, source versions, relationships and finalized Documents share
one commit/rollback. Local/O1 plans are prepared before relationship writes.
The CENTRAL coordinator persists and flushes its header before the prepared
LOCAL plan is applied, satisfying the immediate `caused_by_revision_id` FK;
the outer protected transaction and all locks remain open. Document finalization
uses the same transaction-bound prepared token after Local apply. Apply does
not create per-row revisions. Explicit dependent
deletes precede their parent deletes after complete plan validation. Existing
Coverage and Document dependencies remain authoritative. Canonical responses
include changed IDs/versions/metadata and deletion tombstones for reconciliation;
the UI merges deltas and does not render tombstones.

## B1, O1, G1 and parents

B1 remains one `organization_objective` family managed from both current
surfaces. Objective Create/Update accept explicit `organizationChanges`;
Organization uses `organizationObjectiveChanges`. Strategy cannot be assigned.
Objective is under one valid root Strategy; Strategy remains root-only. The
Objective transaction holds OBJECTIVE and ORGANIZATION, writes its CENTRAL
Revision and one linked LOCAL Revision per changed Organization in stable order.

O1 and G1 gain real INACTIVE lifecycle while retaining occupied-pair IDs,
versions and audit fields. Owner eligibility is separate from lifecycle:
only actual root/authorized selected-profile admins manage links; only ACTIVE
and currently eligible assignments confer effective ownership. Every non-DELETED
Owner link blocks Organization deletion. G1 uses explicit `regulationChanges`
and the existing GLOBAL_CONTROL/REGULATION Guard union and one owner-first
CENTRAL Revision. Neither family gains invented validity columns.

Account Group, Risk Category/Template, Regulation Group/Regulation/Requirement
and Policy Group Update now use nullable typed `parentChange`. Omitted means
retain; present null ID clears only a root-capable parent. New bundled clients
send explicit final parent/status/sortOrder. Each structural Update retains the
existing cycle, eligibility, version and dependency checks under its existing
Guard union, one final source mutation, Documents and one owner Revision content.
No modal chains Update, Move and Lifecycle requests.

Regulation Requirements remain structural children and read-only in their tab.
The later explicit owner correction in the current implementation prompt keeps
independent Excel Import in the Requirements tab of the stored Regulation's
modal. It supersedes the earlier create-menu relocation. Import uses that same
modal's Regulation, existing GOVERNANCE permission/status and draft protection,
and existing preview/template/command. Success refreshes the same Regulation
on the same tab. No Import is moved to the Requirement modal or create menu.

## Migration and delivery limits

V1202 is a forward migration that changes only the two lifecycle constraint
pairs for `organization_owner_assignment` and `global_control_regulation`.
It accepts ACTIVE/INACTIVE/DELETED and requires deletion metadata only for
DELETED. It changes no row values, UUID, profile, uniqueness, history, table,
stored Revision entity code or hierarchy registry. V1187/V1197/V1201 remain
untouched. Deploy the matching bundled backend/UI with this migration before
using INACTIVE for O1/G1.

Permitted verification is offline backend compile, UI typecheck, UI lint and
`git diff --check` plus source review. No tests are created/edited/run; no MCP,
external service, app, browser, MinIO, database, Flyway or real concurrency
verification is authorized. These checks do not prove Oracle DDL execution,
runtime layout or concurrent-transaction behavior. Final evidence is recorded in
the delivery coverage reports.
