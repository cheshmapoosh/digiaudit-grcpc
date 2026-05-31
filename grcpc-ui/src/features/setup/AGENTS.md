# AGENTS.md - UI setup feature

## Scope
Applies to `src/features/setup`.

## Feature purpose
Setup handles first-run initialization and root administrator creation.

## Rules
- Keep API base path aligned with `/api/setup/status` and `/api/setup/initialize`.
- Do not persist root password in local storage/session storage.
- Validate forms through the existing schema/model pattern.
- Keep setup navigation compatible with `SetupGuard`, `AuthGuard`, and login flow.
- Use i18n for all visible setup labels/messages.
- Do not allow UI paths that imply re-initialization after setup is complete.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
