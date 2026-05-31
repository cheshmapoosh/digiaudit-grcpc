# AGENTS.md - UI regulation feature

## Scope
Applies to `src/features/regulation`.

## Feature purpose
Regulation manages law groups, laws, and law requirements in a tree/FCL UI.

## Hierarchy rules
- `lawGroup` can contain child `lawGroup` nodes and `law` nodes.
- `law` can contain `lawRequirement` nodes.
- `lawRequirement` is a leaf and must not expose child creation or a requirements tab.

## Rules
- Follow the Process tree/FCL pattern, but do not add drag-and-drop.
- API base path is `/api/regulations`; keep model/schema aligned with backend DTOs.
- The requirements section/tab belongs to law nodes only, not to requirement nodes.
- Preserve expanded tree items and selected item across navigation, create, edit, delete, and refresh.
- Put all visible text in `i18n/fa.regulation.json` and `i18n/en.regulation.json`.
- Respect date/issuer/owner metadata already modeled for regulation nodes.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
