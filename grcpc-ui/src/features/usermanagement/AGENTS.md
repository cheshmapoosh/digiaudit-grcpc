# AGENTS.md - UI usermanagement feature

## Scope
Applies to `src/features/usermanagement`.

## Feature purpose
User management handles users, roles, permissions, business permissions, assignments, and access-control pages.

## Rules
- Keep API calls inside `infra/usermanagement.api.repo.ts` and route them through service/state.
- Keep routes under `/access-control/users` and `/access-control/roles` aligned with `routes.tsx` and layout navigation.
- Do not display password hashes or sensitive fields.
- Keep user and role FCL pages consistent with list-report/object-page patterns.
- Use typed models/schemas for users, roles, assignments, permissions, and delegation concepts.
- Use i18n for visible labels/messages. If local feature i18n files are not present, add keys to the app locale resources used by this feature.
- Be careful with broad permission assignment UX; make destructive or privilege-escalating actions explicit.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
