# Governance catalog selection and actions — 2026-10-28

The ten Governance launcher catalogs share UI5 row checkboxes and a common
minimum width for text action buttons in lists, summaries and object editors.
`CatalogActionButton` keeps native UI5 heights, themes and icon-only sizing.
Summary actions use the same centered native UI5 footer as object editors.
The authorized width exception is recorded in `grcpc-ui/UI5_COMPONENT_GUIDE.md`.

Checkbox selection is independent of the row used by View, Create context and
the summary panel. It persists through search and tree expansion. Process-tree
Control Scope occurrences remain read-only projections and are not structural
deletion targets. Control Objectives use the same checkboxes in their flat list.
The shared row forwards UI5's injected `slot` to its outer FlexBox, including
when no deletion target is available. TreeItemCustom supplies its `content` slot
through the React wrapper; discarding that slot hides the row's label and
checkbox even when list data has loaded.

Delete with checked rows shows the count and an explicit confirmation listing
their codes and names. Only checked records are submitted, deepest descendants
first. Every record uses its existing typed deletion API and expected version.
There is no automatic descendant selection, cascade, dependency removal or retry.
Results show the successful count and each failed item; undeleted items stay
checked and lists refresh after completion. A clear-selection action is available.
Delete without checked rows retains the existing single-row workflow.

## Hierarchy boundary and guarded entry points

These are the existing Delete/lifecycle entry points reused by the UI, not new
server batch commands. Guards remain owned by the backend:

| Catalog / entry point | Existing hierarchy Guard keys |
| --- | --- |
| `OrganizationService.delete` | `ORGANIZATION` |
| `ProcessService.deleteProcess`, `deleteSubprocess` | Shared `PROCESS` |
| `CentralControlGroupCommandService.delete` | `CONTROL` |
| `CentralControlCommandService.delete` | `ACCOUNT_GROUP`, `CONTROL`, `REGULATION`, `RISK` |
| `CentralControlObjectiveCommandService.delete` | `ACCOUNT_GROUP`, `CONTROL`, `RISK`; targeted Control Objective lock, no new hierarchy |
| `CentralRiskCategoryCommandService.delete` | `RISK` |
| `CentralRiskTemplateCommandService.delete` | `CONTROL`, `RISK` |
| Regulation Group and Regulation Delete/lifecycle | `REGULATION` |
| `CentralRegulationRequirementCommandService.delete` | `CONTROL`, `REGULATION` |
| Policy Group and Policy Delete/lifecycle | `POLICY` |
| `CentralAccountGroupCommandService.delete` | `ACCOUNT_GROUP` |
| `ObjectiveService.delete` (Strategy and Objective) | `OBJECTIVE` |
| `ControlGroupService.delete`, `GlobalControlService.delete` | `GLOBAL_CONTROL` |

Each record is a separate existing server transaction. The UI selection is not an
atomic batch: independent successful deletions remain applied if another record
fails. `TransactionalMasterDataRevisionCoordinator.executeStructural` retains
lexically ordered Guard acquisition before the business callback, hierarchy and
dependency validation, source mutation and Business Revision persistence within
one Spring transaction. `JpaMasterDataHierarchyGuard` uses `PESSIMISTIC_WRITE`.
The browser's depth ordering is only a submission order; server validation is
authoritative, including when another user changes the hierarchy.

## Verification and impact

- `npm run typecheck` and `npm run lint` both passed from `grcpc-ui`.
- `git diff --check` passed.
- Static inspection covered the reused lifecycle Guard declarations, coordinator
  transaction boundary and JPA Guard acquisition. No backend code changed.
- No automated tests, application/browser session, database connection, Flyway
  execution or real concurrent-transaction verification was performed, as
  required by the current delivery restrictions. Static checks do not establish
  runtime concurrency or visual correctness.
- No migration, API contract or deployment configuration change is required.
