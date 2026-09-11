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
- `Risks` is visible but disabled until the approved relationship scope is implemented.
- Prompt 7.5 adds a read-only `Controls` inverse tab for the exact Account Group node. Account Group Save never owns Control classification mutations.
- Prompt 7.6 adds a separate read-only `Control Objectives` inverse tab for the exact Account Group node. Account Group Save never owns Control Objective classification mutations.
- Do not restore legacy assertions, objectives, account ranges, or risk relationship persistence in this feature.
- Parent changes must reject self-parent and descendants and use the existing structural move API.
- Lifecycle editing is limited to ACTIVE / INACTIVE; DELETED is command-only.
- Put feature labels/messages in `i18n/fa.account-group.json` and `i18n/en.account-group.json`.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui` when verification is requested/available.
