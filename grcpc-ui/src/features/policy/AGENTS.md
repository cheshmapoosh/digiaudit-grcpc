# AGENTS.md - UI policy feature

## Scope
Applies to `src/features/policy`.

## Feature purpose
Policies are tree-based master data with policy groups and policy leaf nodes.

## Hierarchy rules
- `policyGroup` can contain child `policyGroup` nodes and `policy` nodes.
- `policy` is a leaf and must not expose child creation.
- When a `policy` leaf is selected, the main Create action remains enabled and uses that policy's parent `policyGroup` as the creation context; valid sibling children of that parent (`policyGroup` or `policy`) may be created with the parent preselected in the modal.
- Policy Version is currently a hidden technical concept and is not a structural tree node or visible modal tab.

## Rules
- Follow the Process/Regulation tree/FCL pattern.
- Keep typed Policy Group and Policy contracts aligned with backend DTOs; do not introduce a generic hierarchy model.
- Use the split-button creation pattern only for valid child types.
- Keep tree expansion/selection stable across CRUD and navigation.
- Put all visible text in `i18n/fa.policy.json` and `i18n/en.policy.json`.
- `communicationTiming` / Communication Timing has been removed from the V2 Policy model; do not expose or reintroduce it in UI drafts, API contracts, domain models, or revision payloads.
- Policy Group parent changes are performed through Edit/parent selection; do not add a separate Move button.
- The Policy Documents tab is the ordinary parent-save document surface for the Policy itself, using target `CENTRAL_POLICY`. It must support temporary file selection during Create and parent-save finalization on Save, and the same document-management UX during Edit. Do not require selecting or creating a Policy Version before Policy documents can be managed.
- Policy Group documents use target `CENTRAL_POLICY_GROUP` with the same parent-save UX.
- The backend guarantees one live technical Policy Version when a Policy is created/reactivated without one. That baseline is version 1 for a new Policy and is created as `PUBLISHED`/`ACTIVE` so future typed relationships can target an official version without exposing version workflow to the customer.
- Do not expose the Policy Version tab or mount `PolicyVersionEditor` until version management is explicitly brought back into scope.
- Scope/Control/Requirement relationship tabs remain visible but disabled until their typed V2 flows are implemented.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui` when an execution environment is available.
