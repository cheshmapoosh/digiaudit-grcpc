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

## UI and UX
- Use SAP UI5 Web Components for React first. Avoid custom widgets where a UI5 component already fits.
- Keep Persian as the default user-facing language and support RTL.
- Use i18n for all user-facing text. Do not hardcode labels, messages, button text, tab text, or menu text in components.
- Prefer existing FCL/list-report/object-page patterns for master-detail pages.
- Preserve tree expansion and selected node state during navigation, refresh, create, edit, and delete flows.
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
