# AGENTS.md - UI account-group feature

## Scope
Applies to `src/features/account-group`.

## Feature purpose
Account groups are tree-based master data and can include assertions, objectives, account ranges, and risks.

## Rules
- Follow the feature pattern: `domain`, `infra`, `service`, `state`, `components`, `pages`, `utils`, `i18n`.
- API base path is `/api/account-groups`; keep it aligned with backend DTOs.
- Keep tree expansion/selection stable when creating, editing, deleting, or viewing nodes.
- Use UI5 components and the existing FCL/list-report/object-page style.
- Put all labels/messages in `i18n/fa.account-group.json` and `i18n/en.account-group.json`.
- Keep value-list editing for assertions/objectives/account ranges/risks typed through `accountGroup.model.ts` and `accountGroup.schema.ts`.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
