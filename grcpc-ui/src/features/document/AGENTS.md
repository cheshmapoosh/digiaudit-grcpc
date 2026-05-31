# AGENTS.md - UI document feature

## Scope
Applies to `src/features/document`.

## Feature purpose
Document manages attachment metadata and upload/download flows used by other features.

## Rules
- Keep API calls inside `infra/document.api.repo.ts`.
- Keep backend API base path aligned with `/api/documents`.
- Preserve temporary upload and commit flow when used by modals or tabs in other features.
- Do not expose storage credentials or assume direct permanent object URLs in UI code.
- Model attachment metadata in `domain/document.model.ts` before using it in state.
- Reusable attachment UI should go to shared/components only when multiple features need the same component.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
