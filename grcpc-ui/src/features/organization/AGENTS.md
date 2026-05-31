# AGENTS.md - UI organization feature

## Scope
Applies to `src/features/organization`.

## Feature purpose
Organization manages the organization tree plus process/risk/reference assignments shown in object-page tabs and dialogs.

## Rules
- Follow the existing FCL master-detail flow: list/tree on the start column and object page on the mid column.
- API base path is `/api/organizations`; assignment repositories must stay aligned with backend assignment endpoints.
- Preserve expanded tree items when selecting, viewing, editing, and returning from dialogs.
- Keep tabs, assignment dialogs, and summary panels using UI5 components.
- Use i18n for visible text. If the feature lacks local i18n files for a new label, add keys to the appropriate app/feature locale resources.
- Keep parent selection/value-help behavior separated in components such as `ParentValueHelpDialog`.
- Be careful when touching related states: organization, process assignment, process relationship, and reference assignment state are separate on purpose.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
