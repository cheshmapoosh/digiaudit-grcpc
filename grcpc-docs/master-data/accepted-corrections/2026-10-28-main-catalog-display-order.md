# Main catalog display order — 2026-10-28

The project owner approved drag-and-drop sibling ordering on all main Governance
tree pages, with each newly inserted item first in its group. The approval
explicitly excludes modals, value helps, relationship tabs and dependent catalog
collections. It supersedes earlier no-drag rules only for these main trees.

## Scope and behavior

The nine main trees are Organization, Process/Subprocess, Control Group/Control,
Risk Category/Template, Regulation Group/Regulation/Requirement, Policy
Group/Policy, Account Group, Strategy/Objective and Global Control Group/Control.
Control Objectives is a flat list and receives no tree or new ordering gesture.
Read-only Control Scope occurrences beneath Subprocesses are not structural
children and never participate in reordering.

- Only Before/After between nodes with the same typed parent is accepted. Root
  siblings can be ordered. Dragging a branch changes its sibling position while
  retaining all descendants. Dropping On or into another group is rejected.
- Ordering is persisted within the selected profile and shared by its users.
  Existing catalog manage permission is required. View-only and inactive-profile
  sessions see the saved order; dragging is disabled. Search disables dragging
  to avoid ambiguous operations on a filtered set.
- Save occurs on drop, with no browser DOM manipulation or optimistic move.
  A failed Save retains the displayed order and reloads the current server order;
  a stale group produces a localized refresh/retry message. Selection, checkboxes
  and expanded branches retain their stable keys.
- The 2026-10-29 owner correction selects the dragged source on both success and
  failure, after canonical refresh, through the tree's normal controlled selection
  path. No-op/rejected drop commands also select the source without a write;
  checkbox selections and expanded branches retain their existing state.
- Successful or failed commands refresh the canonical catalog rows before the
  next operation. Pages caching a selected detail also refresh its version so a
  subsequent Edit/Delete does not use the version from before reordering.

## Persistence and default ordering

V1199 adds nullable, nonnegative `display_order NUMBER(19,0)` to sixteen existing
tables, with no new table, Guard key, Revision code or privilege. This is a
main-page presentation attribute, separate from existing `sort_order` fields used
by forms, API contracts and dependent collections. It is intentionally absent
from Create/Edit DTOs and from relationship/value-help ordering.

New inserts keep NULL. Main-page ordering is unranked rows by `created_at`
descending, then manually ranked rows by ascending display order, with stable
type/ID tie breakers. Thus each new insert is first without rewriting the manual
order of existing siblings. Existing unranked groups initially show newest first.
A drop assigns contiguous zero-based ranks to the entire current non-deleted
sibling set, across typed tables when the tree combines groups and leaves.
Deleted rows are excluded; inactive rows retain their place. Restore is not a
new insert and retains its stored presentation rank.

The closed registry maps exactly these tables to existing hierarchy keys:

| Hierarchy key | Tables |
| --- | --- |
| ORGANIZATION | organization |
| PROCESS | central_process, central_subprocess |
| CONTROL | central_control_group, central_control |
| RISK | central_risk_category, central_risk_template |
| REGULATION | central_regulation_group, central_regulation, central_regulation_requirement |
| POLICY | central_policy_group, central_policy |
| ACCOUNT_GROUP | central_account_group |
| OBJECTIVE | objective |
| GLOBAL_CONTROL | control_group, global_control |

## API and transaction contract

`GET /api/master-data/display-order/{catalog}` supplies typed IDs, typed parent,
rank, source version and creation time. The catalog is a closed server enum;
the API never accepts table/column names. Reads/writes require the selected
profile and the exact catalog's live view/manage authority, including existing
Reference compatibility for Organizations.

POST to the same route receives typed source/destination, BEFORE/AFTER and the
complete previously observed sibling sequence with versions. It rejects a
different parent, missing/deleted targets, duplicates, a changed sibling set,
stale versions and concurrent ordering changes. Empty/no-move commands write
nothing and create no Revision. The client skips such gestures.

The entry point uses `TransactionalMasterDataRevisionCoordinator.executeStructural`
with the registry's existing key. The existing dataset ADMINISTRATION lock is
acquired first, followed by the hierarchy Guard with PESSIMISTIC_WRITE, before
any hierarchy read or sibling validation. Exact catalog authorization is checked
again inside that protected transaction. The Guard is the authoritative hierarchy
protection; the observed sequence/version checks detect stale clients.

Only changed sibling ranks are written, with source version/audit updates and
one CENTRAL Business Revision. The dragged node is the primary content; additional
contents are stable by type/ID. A dragged node retaining its numeric rank is
still touched as the primary mutation. Existing typed entity codes are reused;
snapshots record this command's ordering state (typed ID/parent, rank, creation
time and source version), with DISPLAY_ORDER validation metadata. No full edit,
parent, Document or relationship Save is performed. Source rows, Guard, checks
and Revision commit or roll back on the same database transaction/connection.
There is no retry, lazy Guard creation, cascade, new relation or bulk hierarchy
mutex. JDBC writes assert the existing protected mutation contract and include
profile, lifecycle and version predicates. SQL identifiers come only from the
closed registry; user-supplied enum/IDs are matched against current profile rows.

## Delivery and verification

Deploy the bundled backend/UI with V1199. Existing migrations and generated UI
assets are not rewritten. The sixteen new nullable columns require no backfill;
existing creation times supply the initial order. The Master Data table count
does not change. The application/Flyway has not been run in this delivery.

Allowed verification is backend compile with `-Dskip.ui=true -Dmaven.test.skip=true`,
UI typecheck, lint and static inspection. No test files are created/edited/run,
and no browser, database, external service or real concurrent transaction is
used. Static inspection covers the Guard registry, protected transaction,
explicit profile predicates, complete sibling checks, mixed-node ordering and
provider isolation from modals/value helps/tabs. Compile and static inspection
do not prove Oracle migration execution or runtime concurrency.
