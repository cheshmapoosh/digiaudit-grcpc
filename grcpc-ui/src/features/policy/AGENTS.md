# AGENTS.md - UI policy feature

## Scope
Applies to `src/features/policy`.

## Feature purpose
Policies are tree-based master data with policy groups and policy leaf nodes.

## Hierarchy rules
- `policyGroup` can contain child `policyGroup` nodes and `policy` nodes.
- `policy` is a leaf and must not expose child creation.

## Rules
- Follow the Process/Regulation tree/FCL pattern.
- API base path is `/api/policies`; keep model/schema aligned with backend DTOs.
- Use the split-button creation pattern only for valid child types.
- Keep tree expansion/selection stable across CRUD and navigation.
- Put all visible text in `i18n/fa.policy.json` and `i18n/en.policy.json`.
- Respect policy-specific fields such as category, kind, version, review dates, communication method, and evaluation confirmation.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
