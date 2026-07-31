# AGENTS.md - Backend Document V2 module

## Scope
Applies to `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/document`.

## Document V2 model
- The approved Master Data V2 Document flow is:
  `Temporary Upload -> final Business Command -> Document -> immutable Document Version -> typed Document Link`.
- The only mapped tables in this module are:
  `document`, `document_version`, `document_link`, and `document_temp_upload`.
- `document_temp_upload` is technical, target-independent, retained after consumption, and not revisionable.
- Final Document persistence is controlled by `MasterDataRevisionCoordinator`; do not create a second revision from a Document participant.
- `DocumentVersionEntity` represents an immutable finalized file identity. Never overwrite an existing version file row.
- `DocumentLinkTargetType` is a closed stored vocabulary. Browser requests must not select `MASTERDATA_REVISION`.

## Prohibited legacy and excluded concepts
- Do not reintroduce `DocumentAttachmentEntity`, `tempSessionId`, a generic commit endpoint, direct final upload, or `/api/documents` compatibility routes.
- Do not add an application scheduler for temporary cleanup; temporary object cleanup belongs to MinIO lifecycle configuration.
- Do not add Retention, Hold, purge, Job, Scheduler, Outbox, or generic target-table behavior without a new explicit approved design decision.

## Verification
- For Prompt 4, do not create, modify, or run automated tests.
- Use static checks and `./mvnw -DskipTests -Dskip.ui=true package` when backend verification is requested.
