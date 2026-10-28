# AGENTS.md - UI objective feature

## Scope
Applies to `src/features/objective`.

## Feature purpose
Strategies and objectives share the existing tree. Strategies are root categories without a parent strategy; an objective has exactly one root strategy parent and no children.

## Rules
- Follow the existing tree/FCL pattern from Process/Organization.
- API base path is `/api/objectives`; keep model/schema aligned with backend DTOs.
- Preserve node type `objective` and do not add new node types unless backend changes too.
- Keep tree expansion/selection stable across navigation and CRUD.
- Match the Regulation tree's item-type presentation: show Strategy/Objective as plain UI5 Text at the end of each row, beside the title, without a Tag or badge. Long titles truncate without hiding the item type.
- Enable Create Objective only when a root Strategy is selected, and prefill that Strategy as its structural parent. Create Strategy remains available regardless of selection and always creates a root with no parent.
- Follow `grcpc-docs/master-data/accepted-corrections/2026-10-27-objective-strategy-classification.md`: manage both kinds on the Objectives page; show strategy in create/edit/details. The Objectives list uses header search without a separate Strategy filter. Do not add a strategy column to Organization forms.
- Follow the superseding `grcpc-docs/master-data/accepted-corrections/2026-10-28-objective-strategy-corrections.md`: Strategy forms have only General Information and Documents tabs, with only code/name/description in General Information. Do not mount Organization assignment controls or load Organization options for Strategies. Business Objective selection uses `ObjectiveSelectionDialog`, preserving Strategy/Objective structure and allowing exactly one eligible Objective; Strategy nodes are never selectable.
- Use i18n files `fa.objective.json` and `en.objective.json` for all visible text.
- Do not add drag-and-drop behavior unless explicitly requested.

## Verification
- Run `npm run typecheck` and `npm run lint` from `grcpc-ui`; do not run tests, a browser or the application in this delivery.

## Main-page display ordering (2026-10-28)

Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-main-catalog-display-order.md`. The explicit owner approval supersedes earlier no-drag rules only on main Governance trees. Sibling-only native UI5 dragging saves independent display ranks under the existing hierarchy Guard and one CENTRAL Revision; new inserts appear first. Modals, value helps and relationship tabs keep their existing sorting and have no ordering provider.
