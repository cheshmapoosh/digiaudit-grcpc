# AGENTS.md - grcpc-ui frontend instructions

## Scope
These instructions apply to `grcpc-ui`. Feature-specific instructions under `src/features/**/AGENTS.md` extend them.

## Architecture
- Use feature-based architecture under `src/features`.
- Keep route/page wrappers thin; domain logic should live in each feature's `service`, `state`, `infra`, `domain`, `utils`, and `components` folders.
- Follow the existing Organization/Process patterns for tree-based master data features.
- Export feature public API through `index.ts`.
- Keep app-wide routing/layout in `src/app`, `src/pages`, and `src/layout`.
- Put shared reusable components/utilities in `src/shared` only when they are genuinely cross-feature.
- Organization, Process, Subprocess, and Document business-date editors share the UI5 Persian-calendar DatePicker while retaining Gregorian `yyyy-MM-dd` API values; invalid visible drafts remain visible and propagate to Save readiness and dirty state.

## UI and UX
- Use SAP UI5 Web Components for React first. Avoid custom widgets where a UI5 component already fits.
- Keep Persian as the default user-facing language and support RTL.
- Use i18n for all user-facing text. Do not hardcode labels, messages, button text, tab text, or menu text in components.
- Governance catalog Create forms show fixed ACTIVE with native ObjectStatus; status becomes editable only in an authorized Edit flow. Normalize Create drafts to ACTIVE and retain existing backend-owned Create contracts. Follow `grcpc-docs/master-data/accepted-corrections/2026-10-29-policy-modal-alignment.md` for the Policy form/picker alignment.
- Prefer existing FCL/list-report/object-page patterns for master-detail pages.
- Preserve tree expansion and selected node state during navigation, refresh, create, edit, and delete flows.
- Main-tree drag-and-drop selects the dragged source after success or failure and after canonical row/version refresh. No-op or rejected drop commands also select the source without a write. Use each tree's normal controlled selection path, preserving checked rows and expanded branches; do not manipulate native selection or dispatch synthetic clicks.
- General Information, parent/owner, invalid visible dates, and Document draft state must feed one SPA-navigation and hard-unload guard; never synchronize form state during render.
- Prompt 5.10 target ObjectPages send one aggregate mutation request. Do not chain Parent, Move, Document Create, Document Version, or Document Metadata APIs from the Browser.
- Avoid large inline style objects. Prefer feature CSS or reusable classes, except for small dynamic values.

## TypeScript and state
- Avoid `any`. Model API data with feature domain types and schemas.
- Keep API calls inside `infra/*.api.repo.ts` and route them through `service`/`state` where the feature already uses that pattern.
- Keep Zustand state actions predictable and avoid synchronous `setState` in effects when it triggers lint errors.
- Keep API base paths aligned with backend controllers.

## Verification
- Preferred checks:
```bash
npm run lint
npm run build
```
- If only changing copy/i18n, still ensure JSON is valid and referenced keys exist in both `fa` and `en` resources where the feature uses both.
------------------------------------------------------------------------

## UI5 Component Compliance

For all frontend implementation follow:

`UI5_COMPONENT_GUIDE.md`

## Mandatory Rules

-   SAP UI5 Web Components React has priority.
-   Before creating HTML elements or custom React components, check UI5
    equivalent.
-   Do not replace UI5 components with custom CSS/widgets.
-   Use semantic UI5 components for status, navigation, actions,
    selection and dialogs.

## Required Mapping

-   Status -\> ObjectStatus
-   Semantic labels -\> Tag
-   Navigation -\> Link
-   Row actions -\> ActionSheet/Menu
-   Actions -\> Button
-   Selection -\> Checkbox/List/Table
-   Dialogs -\> Dialog
-   Dates -\> DatePicker
-   Layout -\> FlexBox/Grid/Toolbar

Any exception requires documented UI5 limitation.

## Agent Instruction

Before completing UI work verify that all visible interactive elements
use UI5 components when available.

## Accepted Central reference Assignment UI

- Follow `grcpc-docs/master-data/accepted-corrections/2026-10-27-central-reference-assignments.md`. Four typed Assignment families use owner-local drafts and one existing catalog Save; inverse lists are read-only owner links.
- No Coverage manager/inverse component may mount in this phase. Retain shared Scope components, including CoverageInverseTable in Control Objective Scope, and preserve Coverage backend APIs/data.
- Pending Assignment selections and invalid visible date drafts join owner dirty/navigation protection and Save readiness. No PROCESS/Organization permission, Scope selector or Coverage label belongs to these central Assignments.

## Governance modal relationship drafts

- Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-governance-modal-relations.md`. Main modal Save owns every editable relation collection. Use the shared presentational CatalogRelationTable/Toolbar/Status/Date and CatalogTableViewport; keep domain state/payloads typed in each owning feature. Internal deleted pools preserve occupied IDs without Deleted filters/Restore UI.
- Local Organization drafts, both B1 surfaces, O1 and G1 retain real lifecycle and metadata; no standalone relation write mounts in the modal. Preserve the explicit Documents/temporary-upload and structural Import exceptions. Keep all table drafts through tab changes and reconcile canonical response deltas before optional refresh.
- The 2026-10-29 owner correction removes the per-row Documents column from all Governance relationship tabs, including its now-unreachable inline Document panels and state. Preserve each catalog's main Documents tab, existing Document data/APIs, relation drafts and main Save readiness.
- The Control Objective modal omits the extra Local Control Objective Scope reverse panel below its tabs, including in View. Keep its typed tabs and Organization-owned Local data/APIs intact. Main catalog submit buttons use the common Save label rather than Submit.
- Risk–Control Objective permissions depend on both the current identity and profile state; recompute after profile loading/refresh, without bypassing the existing CONTROL + RISK read rules or allowing writes to inactive profiles. Root may view this tab whenever a valid profile is selected.
- The subsequent 2026-10-29 owner correction removes navigation from all Governance tab references: names/codes, contributing sources and inverse references render as plain text. Do not open another catalog route/modal from a tab row or remount PolicyReferenceView. Preserve explicit Select dialogs, lifecycle actions, drafts, permission checks and main catalog View entry points. See `grcpc-docs/master-data/accepted-corrections/2026-10-29-governance-tab-references.md`.
- Follow the later `grcpc-docs/master-data/accepted-corrections/2026-10-29-governance-compact-tabs.md`: relationship tables show at most Code/Name/Status/Valid From/Valid To; typed supplementary fields move to the selected row's inline Form, retaining existing editors and Save ownership. Governance forms use CatalogFormGrid: choose three columns on wide screens when the equivalent two-column layout exceeds three rows, accounting for wide fields/date pairs; short forms retain two. This supersedes fixed two-column group-form rules only when that row budget is exceeded. Native UI5 Compact styling remains unchanged.

- The later `grcpc-docs/master-data/accepted-corrections/2026-10-28-regulation-requirement-aggregate.md` replaces the Regulation Requirements tab's Import exception with parent-owned CREATE/lifecycle drafts. Excel is enabled in Edit; confirmation stages only and main Save persists. The latest correction removes View and its nested dialog; the blue Excel action replaces Select in the same full-width toolbar as Organization Subprocesses. Shared `modal-layout.css` owns Governance widths; no feature/inline viewport widths.
