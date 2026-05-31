# AGENTS.md - UI objective feature

## Scope
Applies to `src/features/objective`.

## Feature purpose
Objectives are hierarchical master data nodes. An objective can contain child objectives.

## Rules
- Follow the existing tree/FCL pattern from Process/Organization.
- API base path is `/api/objectives`; keep model/schema aligned with backend DTOs.
- Preserve node type `objective` and do not add new node types unless backend changes too.
- Keep tree expansion/selection stable across navigation and CRUD.
- Use i18n files `fa.objective.json` and `en.objective.json` for all visible text.
- Do not add drag-and-drop behavior unless explicitly requested.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
