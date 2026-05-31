# AGENTS.md - backend document module

## Scope
Applies to the backend `document` module.

## Feature purpose
This module manages document attachments, temporary uploads, commit flow, metadata updates, deletion, and download URLs backed by storage configuration such as MinIO.

## Rules
- Keep storage details behind the application/config layer. Do not hardcode bucket names, endpoints, credentials, or local paths.
- Preserve the temporary attachment flow: upload policy/temp upload -> commit to target -> normal attachment lifecycle.
- Validate target type/id, title, filename, and content metadata before persisting.
- Avoid loading large file content into memory in application logic.
- Do not expose permanent private object URLs unless the design explicitly requires it; prefer controlled download-url behavior.
- Keep attachment metadata consistent with `DocumentAttachmentEntity` and response DTOs.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If API response shapes change, update `grcpc-ui/src/features/document` and run UI checks.
