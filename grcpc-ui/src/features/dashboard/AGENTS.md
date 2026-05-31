# AGENTS.md - UI dashboard feature

## Scope
Applies to `src/features/dashboard`.

## Feature purpose
Dashboard is the post-login landing feature for overview cards and navigation summaries.

## Rules
- Keep dashboard pages thin and presentation-focused.
- Use UI5 components and shared layout conventions.
- Do not hardcode user-facing Persian/English text; add i18n keys if text becomes configurable or repeated.
- Avoid embedding feature business logic directly in dashboard cards; delegate to the owning feature or service.
- Keep route `/dashboard` stable unless `AppRouter` and navigation are updated together.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
