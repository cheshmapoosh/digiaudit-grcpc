# AGENTS.md - UI auth feature

## Scope
Applies to `src/features/auth`.

## Feature purpose
Auth handles login-related UI state, current-user loading, and auth API calls.

## Rules
- Keep auth API calls inside `infra/auth.api.repo.ts` and route behavior through `service`/`state`.
- Do not store raw passwords beyond the immediate login request.
- Do not log credentials or full auth responses if they may contain sensitive data.
- Keep `/api/auth/me` behavior aligned with the backend auth controller.
- Coordinate changes with guards under `src/app/guards` and layout logout/menu behavior.
- User-facing text must use i18n where the surrounding file already uses translation.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
