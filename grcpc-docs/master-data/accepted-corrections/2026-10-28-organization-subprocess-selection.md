# Organization Subprocess draft table — 2026-10-28

The project owner's latest follow-up supersedes both immediate persistence on
selection and the earlier choice of independent tab Edit/Save.
The Organization Subprocess tab is a native UI5 table with exactly three business
columns: Code, Name and relationship Status. Selection is staged locally; the
Organization modal's main Edit/Save owns these drafts together with General
Information, Owners and Documents. The Subprocess table has no separate Edit,
Save, Cancel, Undo or Restore button.

## UI and navigation

- The modal's Edit enables the table actions without changing the selected tab. Select opens the
  searchable Process/Subprocess hierarchy using native Dialog, HeaderSearch,
  Tree and CheckBox. Process ancestors cannot select. Only active Subprocesses
  not already present in the current/draft table can be selected.
- The picker performs reads only and returns selected definitions. It never calls
  a mutation API. Confirming adds one draft per selected Subprocess. The table
  loads all pages of current and deleted contexts to preserve occupied identity.
- Draft rows use ObjectStatus Information (native blue). After successful modal
  Save, canonical ACTIVE relationships use Positive (green), INACTIVE uses None,
  and persisted DELETED is never displayed. Pending changes use the explicit
  labels پیش‌نویس فعال, پیش‌نویس غیرفعال and پیش‌نویس حذف. Pending deletion
  remains a blue draft row until modal Save; the committed deleted row then disappears.
  Draft status is never a database lifecycle value.
- The table's status filter has only Not selected (انتخاب نشده), Active and
  Inactive. Not selected applies no status restriction to current rows; Deleted
  is not an option. Deleted contexts are read internally only to identify a
  reselected occupied pair. They appear only if explicitly reselected as a new
  restore draft; no saved Deleted row is displayed.
- Selection of a persisted deleted pair stages restoration, carrying its original
  context ID/version. Save restores that same row to ACTIVE, retaining its notes,
  validity and history. Existing active/inactive pairs cannot be added twice.
- Activate/Inactivate/Delete stage changes for checked rows. Reselecting a
  pending deletion cancels it. Removing an unsaved new/restored row removes only
  its client draft. Delete of
  a persisted row is logical and its normal dependency rules still apply.
- Mixed active/inactive selections permit either lifecycle action whenever at
  least one eligible row needs it. Apply only actual target-state changes;
  unchanged rows retain their saved status and receive no draft or mutation.
  Returning a draft to its original saved state removes that lifecycle draft.
- The Organization modal grows only to 70% of the viewport. A measured table
  viewport reserves the actual header, tabs, actions, messages and footer height,
  then scrolls rows vertically. ResizeObserver handles responsive wrapping and
  tab visibility; the same frame supports overflow on both axes, with UI5 Table
  Scroll mode retaining native horizontal column scrolling. On very short
  screens, UI5's native content scrolling keeps the surrounding controls usable.
- The modal's Save sends subprocesses in the same Organization aggregate request;
  there is no browser sequence of Organization and Local mutation requests.
  Successful Save returns to view on the same tab with committed state.
  Modal Cancel uses the existing discard guard. Error/stale/dependency
  failures retain drafts. Existing notes/validity are not edited by this table.
- Local drafts remain mounted when switching Organization tabs and participate in
  existing dirty/navigation/unload protection and enable the main Save even if
  only Subprocess relationships changed. Pending picker confirmation blocks Save.
- Organization-level Edit and successful Create/Update preserve the selected tab
  in the URL. Existing-object Edit/Save also preserve Local deep-link parameters;
  changing the target Organization does not carry another Organization's IDs.
- Organization Create also accepts staged Subprocesses, saving the Organization
  before creating its Local Contexts inside the same transaction. Other Local relationship tabs retain
  their existing editor and independent Save; no display-order provider mounts
  in this table or its search dialog.

## Aggregate Save and concurrency

Organization Create/Update accepts a subprocesses array containing subprocessId,
operation, and contextId/version for existing rows. Null/empty is a no-op.
Operations are CREATE_OR_RESTORE, ACTIVATE, INACTIVATE and DELETE. The response
contains a subprocesses result with the LOCAL revisionId and canonical changed
rows, including deleted rows for authoritative reconciliation only. Neither the
table nor its picker calls the independent Local mutation endpoints.

OrganizationService.create/update are the outer Spring transaction boundary.
LocalContextService.prepareOrganizationSave and saveSubprocesses retain
REFERENCE manage + PROCESS view and selected-profile protection in addition to
the Organization aggregate's ORGANIZATION manage authority. The existing ADMINISTRATION row is locked before
business reads. ORGANIZATION then PROCESS Guards are acquired lexically with
PESSIMISTIC_WRITE before hierarchy reads; the coordinator receives the same union
and the LOCAL Organization domain. The full union is acquired before the first
Organization aggregate hierarchy read, including on Create. Organization is row-locked first, then all
Subprocess endpoints in canonical UUID order, then occupied contexts. The full
batch is checked before its first write: distinct IDs, ownership, endpoint
eligibility, occupied-pair identity/version, transitions and deletion dependencies.

New relationships create existing local_organization_subprocess_scope rows;
restoration reuses deleted rows and clears deletion audit fields through the
existing entity operation. Each changed relationship contributes the appropriate
CREATE/RESTORE/ACTIVATE/INACTIVATE/DELETE content to one LOCAL Business Revision,
linked by causedByRevisionId to the Organization's CENTRAL Revision. Central and
Local contents remain in separate revisions. Both revisions, Organization,
Owners, Documents and Local Contexts commit in the same outer Spring transaction;
coordinator calls use REQUIRED and do not start independent transactions.
Any failure rolls the whole aggregate back. No
physical delete, hidden cascade, child Scope creation, parent change, retry,
new table, stored code or migration is introduced.

## Verification

Backend compile with -Dskip.ui=true -Dmaven.test.skip=true, UI typecheck, UI lint
and diff/static inspection are the permitted checks. Source inspection covers
read-only selection, blue draft mapping, status transitions, stable restored ID,
profile predicates, Guard/row-lock order, atomic Revision and URL tab retention.
No tests are created/edited/run, and no application, browser, database, Flyway or
real concurrent transaction is run under the delivery restrictions. Compile and
source review do not prove runtime UI or concurrency behavior. Deploy the bundled
backend/UI; no migration or configuration change is added by this correction.
