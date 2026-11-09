# AGENTS.md - UI Risk feature

## Scope
Applies to `src/features/risk`.

## Feature purpose
Risk manages the Master Data V2 `CentralRiskCategory` hierarchy and leaf `CentralRiskTemplate` catalog in one combined tree/FCL experience.

## Hierarchy rules
- A Risk Category may contain child Risk Categories and Risk Templates.
- A Risk Template is always a leaf and never becomes a parent.
- When a Risk Template is selected, create context resolves to its parent Risk Category.
- With no selected Risk Category context, only a root Risk Category may be created.
- Preserve expanded tree items and selection across normal selection, create, edit, delete, and refresh operations.

## V2 scope rules
- API bases are `/api/master-data/central/risk-categories` and `/api/master-data/central/risk-templates`.
- Keep category and template DTO/state types feature-specific; do not reuse the generic Central Catalog definition model.
- Risk Template `riskType` is required and is limited to `COMPANY` and `OPERATION`.
- Current Risk Category modal activates only General Information and Documents.
- The Risk Template modal has separate Controls and Control Objectives tabs for saved templates with CONTROL and RISK read access. In Edit, users with both manage permissions may stage Select, Activate, Inactivate and Delete. The main Risk Template Save persists these drafts with General Information and Documents. View remains read-only.
- Do not add KRI, summary, response-pattern, trigger, effect, assessment, likelihood, impact, score, or Scope mutation. Existing Coverage APIs remain, but no Coverage UI mounts in this phase. Risk Category exposes no Assignment UI.

## UI rules
- Use SAP UI5 components first, especially `Tree`/`TreeItemCustom` for the hierarchy and UI5 FCL/Dialog/form controls for surrounding UX.
- Follow the Organization tree/FCL behavior and the dedicated Control modal/list patterns.
- Put all visible text in `i18n/fa.risk.json` and `i18n/en.risk.json`.
- Keep Persian default RTL behavior and the shared Persian date picker.

## Verification
- Do not create or run automated tests for the current Master Data V2 implementation sequence.
- Non-test verification may use `npm run lint` and `npm run build` from `grcpc-ui` when execution is available.

## Main-page display ordering (2026-10-28)

Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-main-catalog-display-order.md`. The explicit owner approval supersedes earlier no-drag rules only on main Governance trees. Sibling-only native UI5 dragging saves independent display ranks under the existing hierarchy Guard and one CENTRAL Revision; new inserts appear first. Modals, value helps and relationship tabs keep their existing sorting and have no ordering provider.
