# AGENTS.md - UI process feature

## Scope
Applies to `src/features/process`.

## Feature purpose
Process manages process/sub-process/control master data in a tree/FCL UI.

## Hierarchy rules
- `process` can contain child `process` and `subProcess` nodes.
- `subProcess` can contain `control` nodes.
- `control` is a leaf and must not expose child creation.

## Rules
- Treat this feature as the reference pattern for similar master-data features.
- API base path is `/api/processes`; keep model/schema aligned with backend DTOs.
- Preserve expanded tree items and selected item across navigation, create, edit, delete, and refresh.
- Use UI5 components for buttons, tree, bars, tabs, dialogs, and message strips.
- Put all visible text in `i18n/fa.process.json` and `i18n/en.process.json`.
- Keep process-specific fields and control-specific fields separated in UI logic.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
