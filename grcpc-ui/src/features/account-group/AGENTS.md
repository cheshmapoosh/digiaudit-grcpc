# AGENTS.md - UI account-group feature

## Scope
Applies to `src/features/account-group`.

## Feature purpose
Account groups are hierarchical Master Data V2 definitions backed by `CentralAccountGroup`.

## Rules
- Follow the feature pattern used by Organization, Control, Control Objective, and Risk.
- Use the typed API base path `/api/master-data/central/account-groups` and keep commands aligned with backend DTOs.
- Use SAP UI5 components first; the primary hierarchy must use the UI5 `Tree` / `TreeItemCustom` pattern.
- Keep tree expansion and selection stable when creating, editing, deleting, moving, or viewing nodes.
- General Information contains code, title, parent, status, importance, reasonable assurance, validity dates, and description.
- `Documents` is active through `CENTRAL_ACCOUNT_GROUP` with Parent-Save behavior.
- `Risks` remains visible and disabled: there is no approved direct Risk–Account Group relationship, and Coverage must not be projected as one.
- Prompt 7.5 adds a read-only `Controls` inverse tab for the exact Account Group node. Account Group Save never owns Control classification mutations.
- Prompt 7.6 adds a separate read-only `Control Objectives` inverse tab for the exact Account Group node. Account Group Save never owns Control Objective classification mutations.
- Do not restore legacy assertions, objectives, account ranges, or risk relationship persistence in this feature.
- Parent changes reject self-parent and descendants and join the existing aggregate Update through typed `parentChange`. The modal sends General Information, parent, status, sortOrder and Documents in one request; it does not chain Update, Move and lifecycle writes.
- Lifecycle editing is limited to ACTIVE / INACTIVE; DELETED is command-only.
- Put feature labels/messages in `i18n/fa.account-group.json` and `i18n/en.account-group.json`.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui` when verification is requested/available.

## Main-page display ordering (2026-10-28)

Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-main-catalog-display-order.md`. The explicit owner approval supersedes earlier no-drag rules only on main Governance trees. Sibling-only native UI5 dragging saves independent display ranks under the existing hierarchy Guard and one CENTRAL Revision; new inserts appear first. Modals, value helps and relationship tabs keep their existing sorting and have no ordering provider.
