# AGENTS.md - Backend Document V2 module

## Scope
Applies to `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/document`.

## Document V2 model
- The approved Master Data V2 Document flow is:
  `Temporary Upload -> final Business Command -> Document -> immutable Document Version -> typed Document Link`.
- The only mapped tables in this module are:
  `document`, `document_version`, `document_link`, and `document_temp_upload`.
- `document_temp_upload` is technical, target-independent, and not revisionable.
- A temporary row is created only after MinIO upload, checksum calculation, and object verification succeed.
- A temporary row has no persisted status; row existence means the verified temporary object is waiting for explicit user confirmation.
- Successful finalization deletes the temporary database row in the Document transaction.
- Successful finalization deletes the temporary object after the database transaction commits.
- Document commands use direct Spring-managed transactions and do not use Business Revision.
- Parent aggregate Create/Update may invoke Document commands inside the already-open parent transaction; Document still creates no Revision Content of its own.
- Aggregate finalization preflights every temporary upload before the parent Oracle mutation and then validates all document/version/metadata drafts before applying any Document mutation.
- Lock temporary-upload and existing-document rows in stable UUID order. A failed aggregate retains temporary rows/objects and removes only permanent objects created by the failed attempt.
- Document commands build success responses from in-transaction entities; command success must not depend on a secondary read query.
- `DocumentVersionEntity` represents an immutable finalized file identity. Never overwrite an existing version file row.
- `DocumentLinkTargetType` is a closed stored vocabulary. Browser requests must not select `MASTERDATA_REVISION`.

## Prohibited legacy and excluded concepts
- Do not reintroduce `DocumentAttachmentEntity`, `tempSessionId`, a generic commit endpoint, direct final upload, or `/api/documents` compatibility routes.
- Do not add an application scheduler for temporary cleanup; successful finalization already deletes the temporary object after commit, while abandoned expired uploads need a separately approved maintenance design.
- Do not add Retention, Hold, purge, Job, Scheduler, Outbox, or generic target-table behavior without a new explicit approved design decision.

## Verification
- For Prompt 4, do not create, modify, or run automated tests.
- Use static checks and `./mvnw -DskipTests -Dskip.ui=true clean package` when backend verification is requested.
