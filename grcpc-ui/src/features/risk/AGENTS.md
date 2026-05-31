# AGENTS.md - UI risk feature

## Scope
Applies to `src/features/risk`.

## Feature purpose
Risk manages risk categories and risk templates/patterns in a tree/FCL UI.

## Hierarchy rules
- `riskCategory` can contain child `riskCategory` nodes and `riskTemplate` nodes.
- `riskTemplate` is a leaf and must not expose child creation.

## Rules
- Follow the Process/Policy tree/FCL pattern.
- API base path is `/api/risks`; keep model/schema aligned with backend DTOs.
- Preserve expanded tree items and selected item across navigation, create, edit, delete, and refresh.
- Put all visible text in `i18n/fa.risk.json` and `i18n/en.risk.json`.
- Keep risk effects typed through `RiskEffect[]` and the schema; do not use untyped local objects.
- Respect risk-template fields such as company operation, risk type, causes, effects, and related counts.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
