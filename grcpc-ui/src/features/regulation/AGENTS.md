# AGENTS.md - UI regulation feature

## Scope
Applies to `src/features/regulation`.

## Feature purpose
Regulation manages law groups, laws, and law requirements in a tree/FCL UI.

## Hierarchy rules
- `lawGroup` can contain child `lawGroup` nodes and `law` nodes.
- `law` can contain `lawRequirement` nodes.
- `lawRequirement` is a leaf and must not expose structural child creation or a requirements tab.
- When a `lawRequirement` leaf is selected, Create remains available for another requirement by using the selected requirement's parent law as the create context; the new requirement is therefore a sibling, not a child of the selected requirement.

## Rules
- Follow the Process tree/FCL pattern, but do not add drag-and-drop.
- Keep typed V2 API/model contracts aligned with backend DTOs.
- The requirements section/tab belongs to law nodes only, not to requirement nodes.
- Create submenus always show Group, Regulation, and Requirement; contextual rules disable invalid item types instead of removing them from the menu.
- Preserve expanded tree items and selected item across navigation, create, edit, delete, and refresh.
- Put all visible text in `i18n/fa.regulation.json` and `i18n/en.regulation.json`.
- Keep list-page error MessageStrips compact; the tree/list body owns the flexible grid row and errors must never stretch to fill it.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui` when an execution environment is available.
