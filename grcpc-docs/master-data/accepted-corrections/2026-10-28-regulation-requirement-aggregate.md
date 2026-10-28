# Regulation Requirement drafts and uniform dialog widths — 2026-10-28

The latest explicit owner request supersedes the independent Import/read-only
Requirement exception in the [governance modal contract](2026-10-28-governance-modal-relations.md).
Excel remains in the Regulation Requirements tab, is enabled in Edit and stages
fresh active child drafts. Only main Regulation Save persists them. The legacy
Import commit endpoint remains compatible, but this modal never calls it.

## Width and Requirements toolbar

Governance/Control catalog detail, editor, parent-selection, hierarchy and Import
dialogs share one `modal-layout.css` host rule: 90vw, or
96vw up to 720px, with the existing 70vh/70dvh maximum height. Content fills the
host without a separate viewport width/minimum. The conflicting global 72rem
rule and feature/inline width overrides are removed. Native confirmations and
unrelated management sizing retain their scope.

The owner's subsequent correction removes the View action and its nested
Requirement dialog, preview-only form props, fetch and blocking state entirely.
An Emphasized blue Import from Excel action replaces Select in the shared
`CatalogRelationToolbar`. Filter, search and lifecycle actions use the same
single full-width toolbar as Organization Subprocesses, aligned to the left
in Persian RTL. View mode has no row-selection checkboxes; Edit retains them
for lifecycle batches. Excel remains permission checked and is enabled in Edit.

## Child drafts and Excel

Requirement remains a structural catalog child with a required Regulation.
There is no new link table, detached Requirement, implicit re-parenting or
cascade. Edit exposes batch Activate, Inactivate and Delete on eligible selected
rows whose state changes. Drafts use blue semantic statuses and remain visible
through filtering/search. Returning to the stored status removes the draft;
deleting a fresh row removes its CREATE. Saved DELETED rows stay hidden. Delete
is the existing soft deletion of the child, with existing dependency checks.
Dates remain read-only here, matching the Organization Subprocess table.

File selection, template, full server preview, issue paging, confirmation and
cancellation remain. Preview uses `draft=true` and repeated `reservedCodes`.
Duplicates within the file, pending drafts or any ACTIVE/INACTIVE/DELETED
Requirement of this profile reject Import, including codes under another law.
Import never restores/reactivates an occupied code. Confirmation stages only
normalized CREATE rows as active drafts and closes Import; there is no commit
or database refresh before the main Save. Multiple batches share pending codes.
Import-open and dirty/invalid drafts join the main readiness and
navigation guard. Tab changes retain drafts and the current tab.

Regulation Create/Update accepts typed optional `requirementChanges` with CREATE,
UPDATE, ACTIVATE, INACTIVATE and DELETE. The UI uses CREATE and lifecycle; existing
changes require real ID/version and the same Regulation. IDs for new children
are server-generated. Save revalidates code/title/description/sort/date rules,
duplicates, versions, lifecycle, profile, parent and delete dependencies before
mutation. Preview does not bypass final validation. An INACTIVE law remains a
valid structural parent, as before; a DELETED parent is rejected.

The response contains canonical changed `requirements`, including deletion
tombstones. UI merges ID/highest-version deltas before optional refresh; refresh
failure never turns a committed mutation into failed Save. Server IDs/versions
replace imported drafts while the tab remains selected.

## Guard, transaction and verification

POST/PATCH `/api/master-data/central/regulations` acquires `CONTROL → REGULATION`
lexically before hierarchy reads when children change; otherwise it retains
`REGULATION`. REGULATION protects Group/Regulation/Requirement and CONTROL
protects existing Requirement Assignment dependency writers. No new Guard exists.
`RegulationRequirementAggregateService` prepare/apply requires the coordinator's
transaction and guards. Complete child validation precedes source mutation;
parent flush precedes child insert to satisfy the immediate FK. Parent/children,
Documents and one owner-first CENTRAL Revision commit or roll back together.
No LOCAL Revision, independent child command, new table or migration is added.
Oracle IN lookups are chunked at 1000 values.

Verification is offline Java 21 compile with `-Dskip.ui=true -Dmaven.test.skip=true`,
UI typecheck/lint and static source/diff review only. Tests, MCP, app/browser,
database/Flyway, external services and real concurrency execution remain
prohibited. No runtime behavior is claimed from static verification.

Offline Java 21 compilation completed successfully for 702 sources with UI and
tests skipped. `npm run typecheck`, full `npm run lint`, focused final-file lint
and `git diff --check` also completed successfully. Independent source review
covered profile filters, sorted guard/row locks, duplicate and dependency
checks, parent-first persistence, shared Revision/rollback and modal draft
retention. No database migration, runtime UI or concurrent transaction was run.
