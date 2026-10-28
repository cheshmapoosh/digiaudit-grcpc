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
- A saved Requirement exposes a read-only Controls Assignment inverse tab with GOVERNANCE and CONTROL read authority. Regulation Group and Regulation never expose this relationship. Mutation belongs only to the Control aggregate Save; no PROCESS permission is required.
- The Requirement modal does not mount the extra Local Requirement assignment reverse list below its tab panels. Organization Local Requirement assignments remain managed and visible from their Organization tab; their data/API and the distinct Controls Assignment inverse tab retain their contracts.
- Create submenus always show Group, Regulation, and Requirement; contextual rules disable invalid item types instead of removing them from the menu.
- Preserve expanded tree items and selected item across navigation, create, edit, delete, and refresh.
- Put all visible text in `i18n/fa.regulation.json` and `i18n/en.regulation.json`.
- Keep list-page error MessageStrips compact; the tree/list body owns the flexible grid row and errors must never stretch to fill it.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui` when an execution environment is available.

## Main-page display ordering (2026-10-28)

The later `grcpc-docs/master-data/accepted-corrections/2026-10-28-regulation-requirement-aggregate.md` owns Requirement-tab behavior: batch lifecycle and Excel fresh CREATE drafts join main Regulation Save, and Import never calls commit from this modal. The latest owner correction removes View and all nested Requirement-view logic; blue Excel replaces Select in the same full-width shared toolbar as Organization Subprocesses, with filter/search/lifecycle aligned left in Persian RTL. Existing/pending codes reject duplicates with every status. Canonical children merge before optional refresh; pending state joins dirty/readiness. All three Regulation dialog types inherit the common Governance width rule.

Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-main-catalog-display-order.md`. The explicit owner approval supersedes earlier no-drag rules only on main Governance trees. Sibling-only native UI5 dragging saves independent display ranks under the existing hierarchy Guard and one CENTRAL Revision; new inserts appear first. Modals, value helps and relationship tabs keep their existing sorting and have no ordering provider.
