# Master Data V2 API Conventions

## 1. Purpose and scope

These conventions are the shared API contract for all later Master Data V2 backend and frontend tasks.

They apply to command DTOs, read DTOs, errors, concurrency, resource authorization, document upload, and read models.

They prohibit a compatibility API for legacy Master Data endpoints.

They do not require a generic CRUD framework.

They define business commands owned by the Master Data application layer.

## 2. Base-path and naming convention

V2 endpoints use a new explicit Master Data V2 API namespace such as `/api/master-data/v2`.

The exact gateway prefix may follow repository routing conventions, but it must not alias a legacy endpoint path.

Resource nouns use plural kebab-case names.

Business actions use explicit command suffixes such as `:create`, `:update`, `:delete`, `:restore`, `:include`, `:exclude`, `:cover`, and `:uncover`.

No endpoint is named after a database table implementation detail.

No core Scope or Coverage endpoint accepts an arbitrary `targetType`, `referenceType`, `relationType`, or `targetId` field.

No core Scope or Coverage endpoint represents generic table CRUD.

## 3. Command and read DTO separation

Every creation use case has its own Create Command DTO.

Every update use case has its own Update Command DTO.

Create Command does not accept a caller-supplied entity UUID.

Update Command does not accept creation-only system fields.

Delete and restore each have their own command DTO.

Status change has its own command DTO where status is an approved lifecycle change.

Each API has a dedicated Read DTO for normal entity reads.

Effective reads use a separate Effective Read DTO.

Diagnostic reads use a separate Diagnostic DTO.

Read DTOs never expose JPA entities, MinIO credentials, database locators, raw snapshots, or internal authorization state.

Request DTOs never expose a persistence implementation abstraction.

## 4. Identifier, date, and timestamp formats

All UUIDs are canonical lowercase text UUIDs at the JSON boundary.

The backend converts UUID text to Oracle `RAW(16)` internally.

The frontend never sends Oracle RAW bytes or a database-specific UUID representation.

Business dates use ISO `YYYY-MM-DD` strings.

Technical timestamps use ISO-8601 strings with an offset or `Z`.

Date-time comparisons use the backend clock and specified time zone rules; client clock is never authoritative.

Absent optional dates are JSON `null`, not an empty string or sentinel date.

Date range validation occurs before any revision is created.

## 5. Standard mutation result

Every successful mutating Business Command returns HTTP 200 or 201 with the same minimum envelope.

```json
{
  "entityId": "018f62b9-2a7d-77c1-8f5f-7a4f44a90370",
  "revisionId": "018f62b9-2a7d-77c2-a2c6-e7c300be2e84",
  "version": 4
}
```

`entityId` identifies the primary aggregate or relation changed by the command.

`revisionId` identifies the backend-owned Business Revision created by that command.

`version` is the new optimistic-lock value of the changed mutable entity.

A compound command returns this envelope for its command root and may add a typed `affectedEntities` array with each id and version.

The response never accepts or echoes frontend-generated revision sequence, before snapshot, after snapshot, or transaction order.

## 6. Backend-owned Business Revision

The backend creates exactly one Business Revision for each successful Business Command.

The backend assigns revision sequence numbers.

The backend builds Revision Content from authoritative persisted state.

The backend owns the database transaction containing command mutation and revision writes.

The frontend never creates Revision Content.

The frontend never supplies Revision Content ids, aggregate types, snapshots, hashes, or sequences.

The frontend never asks the backend to execute a partial transaction ordering plan.

Business Revision read access, if exposed, is read-only and permission-bound.

Revision Content is not a generic external audit-log write API.

## 7. Optimistic locking

Update, status change, delete, restore, include, exclude, cover, uncover, and policy-scope lifecycle commands require `version`.

The required version is carried in the typed JSON command body.

The backend compares it against the aggregate's current `version` in the same transaction.

An absent version is a validation error, not an implicit overwrite request.

A mismatched version returns HTTP 409 `VERSION_CONFLICT`.

The version-conflict response includes a safe current version when resource authorization permits it.

The frontend must refresh or explicitly rebase user input; it may not silently retry an update with a newer version.

Create commands do not require a version because the backend creates identity and version zero/one state.

Immutable Document Version and immutable Revision records are not updated with a general optimistic-lock endpoint.

## 8. Safe idempotency

The client may send `Idempotency-Key` for create, include, cover, document-consume, and other retry-sensitive commands.

The key is scoped to authenticated actor, command type, and resource boundary.

The backend stores a request fingerprint with the Business Revision result when idempotency applies.

The same key and equivalent request return the originally created mutation result.

The same key and different request return HTTP 409 `IDEMPOTENCY_KEY_REUSED`.

Idempotency never turns an optimistic-lock failure into success.

Idempotency never lets a temporary upload be consumed by two different Business Commands.

GET and HEAD reads are naturally idempotent and require no idempotency key.

## 9. Definition command shape

Definition APIs use explicit aggregate commands.

Examples include `POST /organizations:create`, `POST /processes:create`, and `POST /control-objectives:create`, with final route spelling documented in the implementation slice.

An implementation may use `POST /organizations` for a dedicated Create Organization Command only when its DTO and semantics remain command-specific.

An update is explicitly `POST /organizations/{id}:update` or an equivalent documented update command, not a loose table patch.

Delete is explicitly `POST /organizations/{id}:delete` and includes version.

Restore is explicitly `POST /organizations/{id}:restore` and includes version.

Hierarchy move commands name the business action and validate cycles.

Separate Process and Subprocess APIs remain separate even when a combined tree read endpoint is provided.

Separate Risk Category/Risk Template, Regulation Group/Regulation/Requirement, and Policy Group/Policy/Policy Version APIs remain separate.

No Generic Objective V2 endpoint is defined.

## 10. Typed Central Scope APIs

Central Scope starts at a Central Subprocess Scope.

Create a Central Blueprint through a command such as `POST /central-subprocess-scopes:create`.

Include a Control through a typed command such as `POST /central-subprocess-scopes/{scopeId}/controls:include`.

Include a Control Objective through `.../control-objectives:include`.

Include a Risk Template through `.../risk-templates:include`.

Include a Regulation Requirement through `.../regulation-requirements:include`.

Include an Account Group through `.../account-groups:include`.

Each command accepts the exact typed id, validity, note, and expected version of its owning aggregate where required.

No command accepts a generic target type or a legacy `scope|owner|participant` assignment type.

Read endpoints may return a combined Central Blueprint DTO for UI navigation, but mutation endpoints remain typed.

## 11. Typed Central Classification and Coverage APIs

Classify a scoped Control under a scoped Control Objective through a command such as `POST /central-subprocess-scopes/{scopeId}/control-classifications:create`.

Cover a Control Objective with a Risk Template through `.../control-objective-risk-coverages:create`.

Cover a Control with a Risk Template through `.../control-risk-coverages:create`.

Cover a Regulation Requirement with a Control through `.../requirement-control-coverages:create`.

Cover a Control with an Account Group through `.../control-account-group-coverages:create`.

Each coverage command requires the enclosing `centralSubprocessScopeId` and exact typed member ids.

The backend verifies both member rows are in that same scope before mutation.

The backend verifies coverage validity lies within its member validity intersection.

Direct Control-to-Regulation command names and payloads do not exist.

There is no generic `/coverages` endpoint that receives `sourceType` and `targetType` from the frontend.

## 12. Central and Local Policy Scope APIs

Central Policy Scope command binds one immutable `policyVersionId` to one `centralSubprocessScopeId`.

It accepts validity, applicability note, and expected version of the scope command root.

It does not accept policy workflow approval flags, people-target arrays, survey results, role result records, or generic target types.

Local Policy Scope command binds one Central Policy Scope origin to one Local Context.

It verifies the Central Policy Scope belongs to the Local Context's Central Blueprint.

It verifies local validity is contained within Central Policy Scope validity.

Policy Version content is never updated through Policy Scope APIs.

Policy Applicability is read-only and is not a Policy Scope mutation endpoint.

## 13. Local Context APIs

Create Local Context through a command such as `POST /local-organization-subprocess-contexts:create`.

The command accepts `organizationId`, `subprocessId`, matching `centralSubprocessScopeId`, business validity, descriptive fields, and idempotency key when appropriate.

The backend checks that Central Scope belongs to that exact Subprocess.

The backend rejects a generic Process id where a Subprocess id is required.

The read DTO exposes Central Blueprint summary for navigation but does not treat it as mutable copied data.

Delete and restore context commands require version and protect active local dependents according to business rules.

There is no `/organization-process-assignments` V2 compatibility endpoint.

## 14. Typed Local Scope APIs

Local Scope commands are namespaced under a Local Context.

Examples are `POST /local-contexts/{contextId}/controls:include`, `.../control-objectives:include`, `.../risk-templates:include`, `.../regulation-requirements:include`, and `.../account-groups:include`.

Each command accepts the corresponding typed Central Scope origin id.

The backend verifies origin scope matches the context Central Blueprint.

The backend verifies Local validity is within Central origin validity.

The command returns the Local Scope entity id, Business Revision id, and new version.

No Local Scope endpoint accepts a direct Control, Risk, Regulation, Policy, or Account Group id without a typed Central Scope origin.

No Local Scope endpoint accepts a generic reference type.

## 15. Typed Local Classification and Coverage APIs

Local Classification command uses typed Local Control Scope and Local Control Objective Scope ids.

Local Control Objective–Risk Coverage command uses typed Local Objective Scope and Local Risk Scope ids.

Local Control–Risk Coverage command uses typed Local Control Scope and Local Risk Scope ids.

Local Requirement–Control Coverage command uses typed Local Requirement Scope and Local Control Scope ids.

Local Control–Account Group Coverage command uses typed Local Control Scope and Local Account Group Scope ids.

Every command includes `localContextId` in the path or body as a verified ownership boundary.

Every command verifies both members belong to the same Local Context.

Every command verifies member validity intersection and Central-origin containment.

Cross-context coverage returns HTTP 422 `CROSS_LOCAL_CONTEXT_COVERAGE`.

There is no generic `organization-reference-assignment` or generic `organization-risk-assignment` V2 endpoint.

## 16. Document temporary-upload API

Document upload begins with an authorized temporary-upload initiation command.

The temporary-upload response returns backend-issued `tempUploadId`, allowed media constraints, maximum size, expiry timestamp, and an upload mechanism limited to the temporary object.

A short-lived temporary upload URL may be returned when MinIO direct upload is used.

That temporary URL is never a permanent final-document URL.

The response never includes MinIO credentials.

The response never includes final bucket/object metadata.

The frontend does not create `tempSessionId`.

The frontend does not call a generic `/documents/commit` API.

The frontend supplies `tempUploadId` only to a documented parent Business Command.

The parent command validates ownership, expiry, state, checksum, content metadata, and intended document/link target.

## 17. Document creation, versioning, linking, and download

Document identity is created by a use-case command, usually as part of an owning aggregate command.

Adding a file creates an immutable Document Version.

Linking a file creates a controlled Document Link to an allowed aggregate type.

Changing file content always creates a new Document Version; it never mutates the old version.

Changing a document link requires version-aware command semantics.

Deleting a document link is explicit and may be restored where its lifecycle allows it.

Purging a Document Version is a dedicated authorized retention command, not a generic delete.

Downloading uses an endpoint such as `GET /documents/versions/{documentVersionId}/download`.

The backend authorizes the caller against the linked resource before streaming bytes or issuing a short-lived controlled download.

The download response never exposes permanent MinIO URLs, bucket name, credentials, or storage locator.

If a version is purged, download returns HTTP 410 `DOCUMENT_VERSION_PURGED`.

## 18. Effective, Diagnostic, Roll-up, and Policy Applicability reads

Effective query endpoints are read-only.

Diagnostic query endpoints are read-only.

Roll-up query endpoints are read-only.

Policy Applicability query endpoints are read-only.

Every one of those query families accepts `evaluationDate` in `YYYY-MM-DD` format.

Effective reads return resolved facts and provenance summaries without allowing mutation.

Diagnostic reads return explanations of inclusion, exclusion, origin, validity, and Local/ Central precedence without creating revision content.

Roll-up reads return aggregation over the requested approved hierarchy boundary without storing materialized results.

Policy Applicability reads return applicable immutable Policy Version references and explanation without invoking approval workflow.

These endpoints never refresh cache tables, emit side-effect mutations, or auto-create Local Scope.

## 19. Pagination, filtering, and sorting

Collection reads accept `page` and `size` parameters.

`page` is zero-based unless a later API-wide convention explicitly supersedes it.

`size` has a documented maximum to prevent accidental unbounded reads.

Sorting accepts a finite allow-list of logical fields and direction, for example `sort=code,asc`.

The API does not accept arbitrary SQL/JPQL property paths as sort values.

Filters use typed query parameters such as `status`, `includeDeleted`, `parentId`, `subprocessId`, `contextId`, and `evaluationDate` where appropriate.

Read DTOs return page metadata: `items`, `page`, `size`, `totalItems`, and `totalPages`.

Tree projection endpoints may be unpaged only when bounded by a permission-checked hierarchy root and implementation-defined limit.

## 20. Standard error response

Every error response uses a stable envelope.

```json
{
  "code": "VERSION_CONFLICT",
  "messageKey": "masterData.error.versionConflict",
  "message": "The record changed before your update was applied.",
  "correlationId": "018f62bd-1297-7934-906c-f74aedca55a2",
  "fieldErrors": [],
  "details": {
    "entityId": "018f62b9-2a7d-77c1-8f5f-7a4f44a90370",
    "currentVersion": 4
  }
}
```

`code` is a stable machine-readable code.

`messageKey` is an i18n key suitable for frontend translation.

`message` is safe human-readable fallback text and contains no secret, bucket, object locator, or internal stack trace.

`correlationId` links authorized diagnostics and server logs.

`fieldErrors` is used for command validation failures.

`details` contains only safe, authorized structured facts.

## 21. Validation response

Validation failures return HTTP 422 unless a syntax/media/shape error belongs to HTTP 400.

Each field error includes `field`, `code`, `messageKey`, and optional safe `rejectedValue`.

Cross-field errors use a named command-level field such as `_command`.

Database uniqueness exceptions are translated to a stable business error rather than returned as raw Oracle messages.

Validation is performed in the application layer and reinforced by database constraints.

The frontend may prevalidate for usability but the backend is authoritative.

## 22. Required domain error catalog

| HTTP | Code | Required behavior |
| --- | --- | --- |
| 409 | `DUPLICATE_BUSINESS_KEY` | Reject code or natural-key reuse, including reuse after soft delete. |
| 409 | `VERSION_CONFLICT` | Reject stale mutation version. |
| 422 | `HIERARCHY_CYCLE` | Reject a hierarchy move or create that would create a cycle. |
| 422 | `LOCAL_VALIDITY_OUTSIDE_CENTRAL_VALIDITY` | Reject Local Scope/Coverage validity outside its Central origin. |
| 422 | `CROSS_SUBPROCESS_COVERAGE` | Reject Central Coverage whose members belong to different Subprocess Scopes. |
| 422 | `CROSS_LOCAL_CONTEXT_COVERAGE` | Reject Local Coverage whose members belong to different Local Contexts. |
| 422 | `REVISION_DOMAIN_MISMATCH` | Reject an internal revision-content aggregate/domain mismatch. |
| 422 | `REVISION_CONTEXT_REQUIRED` | Reject a mutation path that cannot establish its required backend revision context. |
| 410 | `DOCUMENT_VERSION_PURGED` | Reject download/read of a purged Document Version. |
| 422 | `INVALID_TEMP_UPLOAD` | Reject unknown, unauthorized, corrupt, or metadata-invalid temporary upload. |
| 410 | `TEMP_UPLOAD_EXPIRED` | Reject temporary upload after expiry. |
| 409 | `TEMP_UPLOAD_ALREADY_CONSUMED` | Reject consumption by a different successful command. |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Reject one idempotency key with a different command fingerprint. |
| 403 | `FORBIDDEN` | Reject a caller without required business permission or resource authorization. |
| 404 | `NOT_FOUND` | Do not disclose unavailable resources to unauthorized callers. |

## 23. Permission and resource authorization boundaries

Every command checks a business permission appropriate to its aggregate and action.

Every resource-specific mutation checks authorization for the actual resolved resource.

Central Blueprint commands check permission on the Central Scope and selected Central definitions.

Local commands check permission on Organization, Local Context, and selected local resources as the authorization model requires.

Document commands check upload/consume/link/version/download rights and the target resource boundary.

Read models check access to the requested Organization/Subprocess/Context results before resolving effective data.

The backend does not authorize a request merely because a frontend-visible menu item was enabled.

The frontend uses permissions to hide unavailable actions but treats backend authorization as final.

## 24. Prohibited API shapes

There is no V2 generic endpoint for `/assignments`.

There is no V2 generic endpoint for `/relations`.

There is no V2 generic endpoint for `/attachments` with arbitrary target type/id.

There is no direct final multipart `/documents` upload endpoint.

There is no V2 `/documents/commit` session endpoint.

There is no frontend endpoint for Revision Content creation.

There is no KPI or KRI Master Data endpoint.

There is no risk assessment, likelihood, impact, score, control test result, control effectiveness, workflow, monitoring, job, scheduler, cache, or outbox endpoint within Master Data V2.

There is no direct Control–Regulation link endpoint.

## 25. Contract verification requirements

Every OpenAPI or API test added later must show required mutation `version` fields.

Every mutation test must assert `entityId`, `revisionId`, and `version` in the success response.

Every Scope/Coverage test must assert typed command shape and locality validation.

Every document test must assert `tempUploadId` one-time consumption and no permanent storage data in API payloads.

Every read-model test must assert that the endpoint is read-only and accepts `evaluationDate`.

Every UI API repository test or schema test must reject legacy generic attachment and assignment payload shapes.
