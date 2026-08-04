# AGENTS.md - UI document feature

## Scope
Applies to `src/features/document`.

## Feature purpose
Document is the shared Master Data V2 UI for:

`Temporary Upload -> Document -> Immutable Document Version -> typed Document Link`

## Rules
- Keep API calls inside `infra/document.api.repo.ts`.
- Use only `/api/master-data/document-temporary-uploads`, `/api/master-data/documents`, `/api/master-data/document-versions`, and `/api/master-data/document-links`.
- Temporary upload is target-independent. It accepts one file only and returns safe metadata plus `tempUploadId`.
- Do not use `tempSessionId`, browser-generated upload sessions, generic commit endpoints, generic target strings, or `/api/documents`.
- The shared component receives one approved `DocumentLinkTargetType` and a target ID or null from the owning feature.
- In `PARENT_SAVE` mode, temporary upload remains immediate, while finalization and metadata/version drafts are declarative input to the owning parent Save; no target ID is nested in those drafts.
- `Document Version` rows are immutable; adding a file creates a new version and link.
- Deleting from a target panel deletes the `Document Link`, not the document identity, version, or permanent object.
- `MASTERDATA_REVISION` is backend-only and must not be selectable or rendered as a normal browser target.
- Do not expose storage keys, bucket names, endpoints, permanent URLs, Revision Content, or object metadata in UI models.
- All editable Master Data business dates use the shared UI5 Persian DatePicker while retaining Gregorian ISO `yyyy-MM-dd` API values.
- Hide free-text Document Category until an approved controlled vocabulary exists; keep the nullable Backend-compatible response field unchanged.
- Document dirty state includes selected/uploading/staged/finalizing files, retryable failed finalization with a temporary upload, and unsaved metadata drafts.
- Parent General Information, hierarchy, and Document drafts use one aggregate browser Save. The component exposes dirty/uploading/valid/ready state, hides per-document Save/finalize controls, and clears consumed drafts only after aggregate success.

## Verification
- Run `npm run lint` and `npm run build` from `grcpc-ui`.
