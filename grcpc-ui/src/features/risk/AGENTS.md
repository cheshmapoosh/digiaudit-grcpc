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
- Current Risk Template modal activates only General Information and Documents; Risk and Control Center remain visible but disabled.
- Do not add KRI, summary, response-pattern, trigger, effect, assessment, likelihood, impact, score, Scope, Coverage, or relationship persistence/UI in this feature without a later approved design decision.

## UI rules
- Use SAP UI5 components first, especially `Tree`/`TreeItemCustom` for the hierarchy and UI5 FCL/Dialog/form controls for surrounding UX.
- Follow the Organization tree/FCL behavior and the dedicated Control modal/list patterns.
- Put all visible text in `i18n/fa.risk.json` and `i18n/en.risk.json`.
- Keep Persian default RTL behavior and the shared Persian date picker.

## Verification
- Do not create or run automated tests for the current Master Data V2 implementation sequence.
- Non-test verification may use `npm run lint` and `npm run build` from `grcpc-ui` when execution is available.
