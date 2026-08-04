# Master Data V2 API Conventions

## 1. Purpose and authority

These conventions turn the approved Master Data V2 model into a stable API discipline for later Backend and UI tasks.

They follow the Final Logical Model §14–§16 and the Physical Design Reference §12–§18.

Authoritative source files: `GRC_Master_Data_Reference_Conceptual_Model_FA.docx`, `GRC_Master_Data_Logical_Model_Final_FA.docx`, and `GRC_Master_Data_Physical_Design_Reference_FA.docx`.

Exact route prefixes may be finalized with the UI use cases, but endpoint meaning, typed commands, ownership, DTO separation, errors, and security boundaries in this document are binding.

An endpoint must not expose a Legacy table merely because that table still exists before its vertical slice is removed.

## 2. API design rules

Use use-case-oriented endpoints.

Use typed Business Commands.

Use separate Create Commands.

Use separate Update Commands.

Use separate Read DTOs.

Use separate Effective Read DTOs.

Use separate Diagnostic DTOs.

Do not expose a generic table CRUD endpoint for core Scope or Coverage relations.

Do not accept a client-provided Unit of Work.

Do not accept client-created Revision Content.

Do not accept a client-created sequence number.

Do not accept client-provided before/after snapshots.

Do not accept a client-controlled transaction order.

Do not provide a compatibility API for Legacy generic assignments, generic attachments, direct Control–Regulation, or generic Objective.

## 3. Wire formats

| Concern | Convention |
| --- | --- |
| UUID | Canonical UUID text such as `550e8400-e29b-41d4-a716-446655440000`; Backend maps it to Oracle `RAW(16)`. |
| Business date | `YYYY-MM-DD`, mapped to `LocalDate` and Oracle `DATE`. |
| Technical timestamp | ISO-8601 offset timestamp, mapped to `Instant` and Oracle `TIMESTAMP(6) WITH TIME ZONE`. |
| Enum | Explicit uppercase controlled string; no ordinal transport. |
| Version | Integer JSON number mapped to optimistic-lock `NUMBER(19,0)`. |
| JSON snapshot | Server-owned only; never supplied by the Frontend. |
| Text | UTF-8 JSON; Persian/RTL values are preserved by normal i18n/UI presentation. |

API fields use lower camel case.

Database tables and columns use the approved lower snake_case vocabulary.

The API never leaks raw MinIO storage keys as permanent download URLs.

### Controlled wire and stored-code values

Closed Master Data code vocabularies are explicit uppercase strings, not Java ordinals.

The canonical stored/wire code source for controlled polymorphic values is [table-catalog.md](table-catalog.md#controlled-polymorphic-stored-code-vocabularies).

Revision Entity Type contains exactly 43 stored codes. Document Link Target Type contains exactly 41 stored codes.

The Browser never sends Revision Content, `RevisionEntityType`, Revision Content sequence numbers, snapshots, or Backend transaction ordering.

The Browser must not supply arbitrary `entityType`, Java class names, full table names, or unbounded polymorphic target strings.

Normal Document Link commands use a typed `DocumentLinkTargetType`.

Normal Document Link commands may select only approved catalog target codes for tables `01` through `40`, subject to command authorization and Backend target-existence validation.

`MASTERDATA_REVISION` is Backend-owned Revision metadata and is not an ordinary Browser-selectable Document Link target.

Unknown, unsupported, or context-forbidden target codes are rejected by the Backend.

API DTOs use closed typed values rather than unbounded strings for these vocabularies.

Stored-code renaming is a versioned compatibility change across API, Java mapping, and Oracle constraints; it is not treated as an internal refactor.

Internal Revision snapshots, Revision Content details, sequence allocation, persistence exceptions, and arbitrary polymorphic target resolution are never exposed as API contracts.

## 4. Standard command and response shapes

### Create command

A create command contains only the business input for one typed use case.

It does not contain `revisionId`.

It does not contain `revisionContent`.

It does not contain `sequenceNumber`.

It does not contain server snapshot fields.

It does not contain a final MinIO object key.

It does not contain an arbitrary generic target type for Scope/Coverage.

Example shape:

```json
{
  "code": "PROC-PAY",
  "title": "Payments",
  "parentProcessId": "550e8400-e29b-41d4-a716-446655440000",
  "validFrom": "2026-08-01"
}
```

### Update command

An update command contains the expected current `version` and only fields permitted to change for that type.

Example shape:

```json
{
  "version": 7,
  "title": "Payments and Settlements",
  "description": "Updated official definition",
  "validTo": null
}
```

### Standard mutation response

Every successful revision-controlled mutation response contains at least the following fields.

```json
{
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "revisionId": "c3c1d6a1-7e4e-4a58-a60e-2791ea803b8d",
  "version": 8
}
```

The response may additionally contain a typed summary, status, and stable read representation.

The response must not expose internal Revision Content ordering or snapshots unless an authorized revision-history read use case needs a safe read projection.

Document mutation responses are a Prompt 4.2 exception: they do not contain `revisionId`, do not require Revision Content, and return Document-specific IDs/versions plus any safe linked summary built from entities already available in the command transaction.

### Status, delete, and restore commands

Status changes, explicit delete, and explicit restore are separate typed commands.

Each requires `version`.

Delete sets the business record to `DELETED` through the command service.

Restore uses the same entity identity and a new Business Revision.

No endpoint hides deletion behind a generic HTTP delete that bypasses revision creation.

## 5. Revision and transaction boundary

The Backend owns `masterdata_revision`.

The Backend owns `masterdata_revision_content`.

The Backend determines whether a command is `CENTRAL` or `LOCAL`.

The Backend requires a Local command to be tied to exactly one Organization.

The Backend rejects Central and Local changes in one Business Command/Revision.

The Backend validates every intended content before applying any mutation.

The Backend performs impact analysis before apply when Central validity/dependency changes require it.

The Backend applies all related mutations in one transaction.

Any content failure rolls back the full transaction.

The Browser sends one compound Business Command for a multi-entity business action.

The Browser never chains separate mutation APIs to construct a Unit of Work.

Examples of compound command candidates are:

- create Local Control Scope and its initial typed Coverages;
- create a Central Scope and its permitted typed Coverage set;
- add a Document Link as part of the business command that creates its target;
- change a Central range after impact analysis and produce a discrete Local remediation revision only when a user explicitly commands it.

Applied revisions and snapshots are immutable.

Corrections are issued as compensating Business Commands, producing new revisions.

## 6. Endpoint families for structural and Central definition use cases

The following route shapes are conventions, not table-oriented generic CRUD contracts.

| Feature | Create/update command route examples | Read route examples | Notes |
| --- | --- | --- | --- |
| Organization | `POST /api/master-data/organizations`; `PATCH /api/master-data/organizations/{id}`; `POST /{id}/restore` | `GET /api/master-data/organizations`; `GET /{id}`; tree query | Organization hierarchy is structural and revision-controlled. |
| Process | `POST /api/master-data/central/processes`; `PATCH /central/processes/{id}`; move command | list/detail/tree query | Process hierarchy command validates cycles. |
| Subprocess | `POST /api/master-data/central/subprocesses`; `PATCH /central/subprocesses/{id}` | list/detail/combined process tree query | It is a distinct entity, not a process node type. |
| Control | `POST /api/master-data/central/controls`; typed update/status/restore commands | list/detail/value-help query | No direct regulation relation. |
| Control Objective | `POST /api/master-data/central/control-objectives`; typed update/status/restore commands | list/detail/value-help query | Never expose generic objective endpoints. |
| Risk Category/Template | typed category/tree and template commands | hierarchy/template query | Scope accepts Risk Template only. |
| Account Group | typed hierarchy commands | tree/value-help query | Classifications use separate typed commands. |
| Regulation Group/Regulation/Requirement | typed hierarchy commands | hierarchy/requirement query | Requirement is the scope/coverage endpoint. |
| Policy Group/Policy/Policy Version | typed group/policy/version commands | hierarchy/version query | Published content is immutable; publication workflow is external. |

Update, inactivate, delete, and restore paths can use command-style suffixes such as `/inactivate`, `/delete`, and `/restore` where that better expresses the UI use case.

No path may expose the internal legacy combined-table name as a V2 resource.

## 7. Typed Central Scope, Classification, Policy Scope, and Coverage APIs

Central scope commands are explicitly type-specific.

Examples:

```text
POST /api/master-data/central/subprocesses/{subprocessId}/control-scopes
POST /api/master-data/central/subprocesses/{subprocessId}/risk-scopes
POST /api/master-data/central/subprocesses/{subprocessId}/control-objective-scopes
POST /api/master-data/central/subprocesses/{subprocessId}/requirement-scopes
```

Each command receives the matching definition ID, validity input, and required version data for updates.

The Control Scope command alone may receive the documented recommendation-code fields.

No scope command accepts an arbitrary `definitionType` + `definitionId` pair.

Central classification commands are type-specific.

```text
POST /api/master-data/central/controls/{controlId}/account-groups/{accountGroupId}
POST /api/master-data/central/control-objectives/{controlObjectiveId}/account-groups/{accountGroupId}
```

Central Policy Scope commands are type-specific.

```text
POST /api/master-data/central/policy-versions/{policyVersionId}/subprocess-scopes
POST /api/master-data/central/policy-versions/{policyVersionId}/control-scope-links
POST /api/master-data/central/policy-versions/{policyVersionId}/requirement-scope-links
```

The final two routes accept an exact Central Scope ID, never a raw Control or Requirement ID.

Central Coverage commands are type-specific.

```text
POST /api/master-data/central/subprocesses/{subprocessId}/risk-control-coverages
POST /api/master-data/central/subprocesses/{subprocessId}/risk-control-objective-coverages
POST /api/master-data/central/subprocesses/{subprocessId}/control-control-objective-coverages
POST /api/master-data/central/subprocesses/{subprocessId}/requirement-control-coverages
```

Each coverage command names exactly the two typed Scope IDs expected by its endpoint.

The Backend verifies that each referenced scope belongs to `{subprocessId}`.

No generic `/relations` endpoint replaces these commands.

No direct `/controls/{id}/regulations/{id}` endpoint exists.

## 8. Typed Local Context, Scope, Coverage, and Policy Scope APIs

Create Local Context first.

```text
POST /api/master-data/local/organization-subprocess-scopes
```

Its create command contains `organizationId`, `subprocessId`, optional `contextNote`, and business validity input.

It never contains `sourceType`.

Typed Local Scope routes are grouped under the context:

```text
POST /api/master-data/local/organization-subprocess-scopes/{contextId}/control-scopes
POST /api/master-data/local/organization-subprocess-scopes/{contextId}/risk-scopes
POST /api/master-data/local/organization-subprocess-scopes/{contextId}/control-objective-scopes
POST /api/master-data/local/organization-subprocess-scopes/{contextId}/requirement-scopes
```

Each Local Scope command contains the exact Central definition ID.

Each contains `sourceType`.

An inherited command contains the matching typed Central Scope ID.

A local-added command omits that Central Scope ID.

The Backend validates matching definition, matching Subprocess, source/reference conditionality, and inherited validity subset.

Typed Local Coverage routes are also grouped under the context:

```text
POST /api/master-data/local/organization-subprocess-scopes/{contextId}/risk-control-coverages
POST /api/master-data/local/organization-subprocess-scopes/{contextId}/risk-control-objective-coverages
POST /api/master-data/local/organization-subprocess-scopes/{contextId}/control-control-objective-coverages
POST /api/master-data/local/organization-subprocess-scopes/{contextId}/requirement-control-coverages
```

Each command contains exactly the expected Local Scope IDs.

Each inherited command contains its matching typed Central Coverage ID.

Each local-added command omits the Central Coverage ID.

No Local Coverage payload carries a redundant `subprocessId`.

The Backend proves every endpoint belongs to `{contextId}`.

Local Policy Scope routes are type-specific:

```text
POST /api/master-data/local/organization-policy-scopes
POST /api/master-data/local/organization-subprocess-scopes/{contextId}/policy-scopes
POST /api/master-data/local/control-scopes/{localControlScopeId}/policy-scopes
POST /api/master-data/local/requirement-scopes/{localRequirementScopeId}/policy-scopes
```

The organization command carries `scopeAction` and `propagationMode`.

All Local Policy Scope commands reference exact `policyVersionId` values.

No Local Policy Scope API targets Risk or Control Objective.

## 9. Document and temporary-upload APIs

Temporary staging is separate from final document creation.

```text
POST /api/master-data/document-temporary-uploads
GET  /api/master-data/document-temporary-uploads/{tempUploadId}
```

The temporary-upload response returns a `tempUploadId` and allowed upload/staging information.

The final command that needs a file accepts `tempUploadId` in its typed business payload.

The final command does not call a generic upload-commit endpoint.

The final command does not accept `tempSessionId`.

The final command does not accept final `storageObjectKey`.

The temporary-upload row is inserted only after the temporary MinIO object upload, checksum calculation, and object verification succeed.

The temporary-upload response returns safe metadata only: `tempUploadId`, original filename, MIME type, file size, `uploadedAt`, `expiresAt`, and optimistic `version` when exposed by convention. It never returns bucket, endpoint, credentials, object key, upload status, Document Version ID, or consumed timestamp.

`uploadedAt` is successful upload completion time, and `expiresAt = uploadedAt + temporary TTL`.

Upload transport timeout and temporary-file expiry are separate concepts.

The Backend checks row existence, expiry, ownership/context, MinIO object presence, size, MIME metadata, and checksum before finalization.

The Backend creates the exact immutable `document_version`, copies file metadata from the temporary row, deletes the `document_temp_upload` row in the same transaction, and deletes the temporary MinIO object after successful commit.

Document command success must not depend on a secondary Summary query, a post-commit read, another controller call, or a UI refresh. Refresh failure after a successful mutation is a read synchronization issue, not a mutation failure.

Document identity and version APIs separate identity metadata from immutable file content.

```text
GET /api/master-data/documents/{documentId}
GET /api/master-data/documents/{documentId}/versions
GET /api/master-data/document-versions/{documentVersionId}
POST /api/master-data/document-versions/{documentVersionId}/download
```

The download use case performs resource authorization and returns a controlled stream or short-lived authorized download response.

It never returns a permanent MinIO URL.

Document Link commands use the closed `DocumentLinkTargetType` vocabulary from [table-catalog.md](table-catalog.md#document-link-target-type-stored-code-vocabulary), validated by Document Service.

Normal Browser-facing Document Link commands are limited to the approved catalog targets `01` through `40`; `MASTERDATA_REVISION` is reserved for Backend-owned same-revision metadata and is not shown as a normal user-selectable target.

Document Link must always name a precise Document Version.

No API command or response in this scope administers Retention Policy, Hold, purge eligibility, purge execution, purge failure, or permanent deletion.

## 10. Read APIs

Effective, Diagnostic, Roll-up, and Policy Applicability are query APIs only.

They do not expose create, update, delete, restore, or generic CRUD routes.

Every as-of query takes one common `evaluationDate` using `YYYY-MM-DD`.

If omitted by a current-state query, the server applies one documented current date consistently across the whole evaluation.

Example families:

```text
GET /api/master-data/effective/... ?evaluationDate=2026-08-01
GET /api/master-data/diagnostics/... ?evaluationDate=2026-08-01
GET /api/master-data/roll-up/... ?evaluationDate=2026-08-01
GET /api/master-data/policy-applicability/... ?evaluationDate=2026-08-01
```

An `EffectiveReadDto` returns the source entity/relationship projection, primary `effectiveStatus`, primary `effectiveStatusSource`, and the common evaluation date.

A `DiagnosticDto` returns all blockers, dependency path, source IDs, and the common evaluation date.

A Roll-up DTO retains `sourceOrganizationId`, `sourceSubprocessId`, and source relation IDs so data ownership is not obscured.

A Policy Applicability DTO returns the selected scope source, whether it is propagated, the decision/action, precedence basis, and evaluation date.

No read projection is materialized or cached for version one.

## 11. Pagination and sorting

Collection reads use explicit `page`, `size`, `sort`, and `direction` query parameters.

The Backend permits only a whitelist of sortable fields for each DTO.

The Backend applies a bounded server-side page size.

The response includes items and page metadata sufficient for List Report paging.

Tree reads may use a purpose-built tree DTO rather than page a flattened mixed Process/Subprocess persistence result.

Value Help reads use typed feature endpoints and stable sort defaults.

No pagination API accepts raw SQL, arbitrary database column names, or generic table names.

## 12. Optimistic locking and idempotency

Update, status change, delete, and restore commands require the current `version`.

The Backend returns `VERSION_CONFLICT` when the supplied version no longer matches.

The client refreshes the typed Read DTO and lets the user resolve the conflict; it does not retry a mutation with a different version silently.

Create commands use approved business-key uniqueness plus explicit inactive reactivation/deleted restore behavior for safe duplicate handling.

Structural Organization Create, Move, Delete, and Restore acquire the `ORGANIZATION` Guard. Structural Process and Subprocess Create, Move, Delete, and Restore acquire the shared `PROCESS` Guard. Acquisition occurs before revision-number allocation and fresh hierarchy reads. Ordinary Update, Activate, Inactivate, and reads remain unguarded.

Guard acquisition applies the configured JPA lock-timeout hint. Recognized lock acquisition/timeout failures return `HIERARCHY_BUSY` and are not retried automatically. A missing configured Guard row returns `HIERARCHY_GUARD_NOT_CONFIGURED` and fails the operation before source or Revision persistence.

Compound commands must be retried only when their preconditions can be evaluated safely inside one Backend transaction.

Temporary-upload finalization is safe against replay through a pessimistic write lock on the exact temporary row and deletion of that row on success.

A repeated finalization finds no temporary row or receives a safe already-finalized/not-found response rather than producing another Document Version.

An optional transport idempotency key may be supported only through an approved shared platform facility.

Master Data V2 must not add an idempotency table, Cache table, Outbox, or generic request log merely to implement retries.

## 13. Standard error response

All errors return a stable envelope.

```json
{
  "code": "CROSS_SUBPROCESS_COVERAGE",
  "message": "The referenced scopes do not belong to the requested subprocess.",
  "correlationId": "18a92c6e-5d06-4a0a-b0ca-5fcd0006f31d",
  "timestamp": "2026-07-30T14:00:00Z",
  "details": []
}
```

Validation errors add field-level information.

```json
{
  "code": "VALIDATION_FAILED",
  "message": "The command is invalid.",
  "correlationId": "18a92c6e-5d06-4a0a-b0ca-5fcd0006f31d",
  "timestamp": "2026-07-30T14:00:00Z",
  "details": [
    {
      "field": "validTo",
      "code": "DATE_RANGE_INVALID",
      "message": "validTo must be on or after validFrom."
    }
  ]
}
```

Do not disclose raw database constraint or table names, SQL, Oracle errors, lock syntax, internal persistence details, MinIO credentials, or internal object-storage paths in an error response.

## 14. Required domain error codes

| Code | HTTP class | When it is returned |
| --- | --- | --- |
| `DUPLICATE_RELATION` | 409 | A business key, typed Scope pair, Coverage pair, classification pair, policy target, or document link already exists. |
| `VERSION_CONFLICT` | 409 | Optimistic lock version does not match the current mutable record. |
| `HIERARCHY_BUSY` | 409 | The required Organization or Process hierarchy Guard could not be acquired within the configured timeout. |
| `HIERARCHY_GUARD_NOT_CONFIGURED` | 500 | A required seeded Guard row is absent; the operation fails closed without exposing persistence details. |
| `HIERARCHY_CYCLE` | 422 | A process, organization, risk category, account group, regulation group, or policy group move would create a cycle. |
| `INVALID_HIERARCHY_MOVE` | 422 | The requested structural destination is unchanged or otherwise not an allowed move. |
| `LOCAL_VALIDITY_OUTSIDE_CENTRAL_VALIDITY` | 422 | An inherited Local Scope/Coverage validity range is outside its current typed Central reference range. |
| `CROSS_SUBPROCESS_COVERAGE` | 422 | Central Coverage endpoints do not belong to the same Central Subprocess. |
| `CROSS_LOCAL_CONTEXT_COVERAGE` | 422 | Local Coverage endpoints do not belong to the requested Local Organization–Subprocess Context. |
| `REVISION_DOMAIN_MISMATCH` | 422 | A Central revision attempts Local content, a Local revision attempts Central content, or Local content uses a different Organization. |
| `MASTERDATA_REVISION_REQUIRED` | 409 | A protected source mutation is attempted without the Backend revision context. |
| `INVALID_TEMP_UPLOAD` | 422 | The temporary upload is not authorized, has an invalid object/checksum, or is not valid for the command. |
| `TEMPORARY_UPLOAD_NOT_FOUND` | 404 | The temporary upload row does not exist, including replay after successful finalization. |
| `TEMPORARY_UPLOAD_EXPIRED` | 410 | The temporary upload has passed `expiresAt`. |
| `POLICY_SCOPE_VALIDITY_CONFLICT` | 422 | A Policy Scope interval is incompatible with its Policy Version. |
| `FORBIDDEN` | 403 | The authenticated user lacks the feature or resource permission. |
| `NOT_FOUND` | 404 | The requested authorized resource is absent. |

## 15. Validation boundaries

Database constraints enforce single-row rules, unique business keys, safe enum values, date ordering, self-parent prevention, conditional source/reference shape, composite context rules, and required FK integrity.

Backend domain validation enforces hierarchy cycles, central/local domain separation, inherited definition/subprocess matching, inherited validity containment, authorization, impact analysis, and controlled polymorphic target validation.

The Frontend provides early field feedback only.

The Frontend does not become the final authority for validation.

The Frontend never computes Effective status as a substitute for the Backend query.

## 16. Permission and resource authorization

Every command requires feature action permission and resource authorization where the target belongs to an organization or controlled document target.

Central definition/relation commands require Central Master Data authorization.

Local commands require authorization for the exact Organization and Local Context.

Document upload, finalization, link, and secure download require document/resource authorization.

Diagnostic read access uses a distinct read-only permission.

Support users do not receive direct source-table database access as an API substitute.

Permissions are named and remapped per V2 vertical slice; Legacy permissions are removed with their old routes.

## 17. API completion criteria

An endpoint set is complete only when it uses actual approved entity vocabulary.

It must return revision-aware mutation results for revision-controlled features and Document-specific mutation results for Document commands.

It must require version where required.

It must prevent generic Scope/Coverage target routing.

It must prevent direct Control–Regulation operations.

It must prevent browser-owned Revision Content and transaction ordering.

It must use temporary upload before final Document Version creation.

It must not expose Retention Policy, Hold, purge, or permanent-deletion APIs.

It must protect downloads.

It must expose read-only Effective, Diagnostic, Roll-up, and Policy Applicability query APIs.

It must preserve KPI and KRI exclusions.
