# AGENTS.md - UI master-data feature

## Scope
Applies to `src/features/master-data`.

## Feature purpose
Master Data is the hub page for navigating to organization, process, objectives, regulations, risks, account groups, and policies.

## Rules
- Keep the hub page presentation-focused; do not move individual feature logic here.
- Preserve Persian default labels and RTL layout.
- Use i18n keys for all visible menu/card titles and descriptions.
- Keep navigation targets aligned with each feature's `routes.tsx`.
- When adding/removing a master-data item, update side navigation/layout if needed.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
