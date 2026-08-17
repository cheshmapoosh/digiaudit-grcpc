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
- Present the hub as a modern responsive tile/card surface inspired by the customer Master Data launcher rather than as a plain list.
- Keep the launcher visually restrained and enterprise-oriented: neutral tile surfaces, strong borders, modest corner radii, no decorative gradients, and no broad per-tile color washes.
- Use distinct but light/pastel UI5 icon accents only inside the icon treatment; keep tile bodies and interaction surfaces neutral so the page still feels solid and enterprise-oriented.
- Do not display section item-count badges on the Master Data hub.
- Do not display a textual `Open` / `ورود` action inside each tile; the tile itself is the navigation affordance and may retain a subtle directional icon.
- Do not use image assets or hard-coded customer screenshots as navigation icons; use UI5 icons and SAP theme variables so light/dark themes remain compatible.
- Tiles must remain keyboard accessible, expose visible hover/focus affordances, preserve the item description, and collapse to a single-column layout on narrow screens.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
