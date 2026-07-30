# Master Data V2 Implementation Contract

## 1. Status and purpose

This contract is binding on every later Master Data V2 implementation task.

It is a greenfield contract, not an incremental modernization contract.

It translates the approved authority order into implementation constraints.

It also records the known points where the current repository is legacy evidence rather than a target pattern.

The contract applies to database migrations, backend code, APIs, UI behavior, documents, and cleanup work.

It does not authorize changes in this Phase 1 documentation task.

## 2. Authority order

The `GRC Master Data Conceptual Model` is authoritative for business meaning.

Its concepts include Central Blueprint, Local Context, Effective View, Business Revision, and shared Document concepts.

The `GRC Master Data Final Logical Model` is authoritative for final entities, relationships, Scope, Coverage, Local Context, Policy Scope, Document, and Business Revision.

The `GRC Master Data Physical Design Reference` is authoritative for Oracle data types, sizes, constraints, indexes, Flyway Day-Zero rules, MinIO rules, and the single temporary-upload table.

The customer UI DOCX files are authoritative only for customer-facing interaction intent that stays inside the approved model.

Current source code is implementation evidence only.

When current source or a customer document conflicts with the approved models, the approved models win.

The three named model documents were not physically present under `grcpc-docs/master-data/` during this review.

Their titles and the explicit approved rules supplied for this task are therefore recorded as the authority baseline.

No absent-model detail is treated as a confirmed legacy requirement.

## 3. Greenfield database boundary

Master Data V2 starts with a fresh Oracle database.

Flyway Day-Zero creates the complete V2 schema in dependency order.

There is no legacy data migration.

There is no legacy schema upgrade path.

There is no compatibility view.

There is no compatibility API.

There is no dual write.

There is no shadow copy of legacy entities.

There is no fallback from V2 reads to legacy tables.

Every later vertical slice must remove the legacy implementation it replaces.

The new database must be deployable without any old Master Data migration being executed.

The Day-Zero migration set must be internally coherent rather than an accumulation of incremental repair scripts.

## 4. Physical platform rules

The design must be compatible with Oracle Database 19c.

Every V2 UUID primary key and UUID foreign key is stored as `RAW(16)`.

The backend generates UUID values before persistence.

The API serializes UUIDs in canonical text form only at the boundary.

No V2 business UUID is stored as `VARCHAR2(36)`.

Flyway is the owner of the schema.

Hibernate must run with `ddl-auto=validate`.

Hibernate must not create, alter, or drop V2 tables.

Oracle constraints and indexes are part of the physical contract, not optional Hibernate hints.

Business-key uniqueness must include soft-deleted records.

That rule prevents a deleted code from being silently reused for another business identity.

## 5. Exact table boundary

Master Data V2 has exactly 47 business tables.

Master Data V2 has exactly one technical temporary-upload table named `document_temp_upload`.

The redesign scope therefore contains exactly 48 physical tables.

No additional Master Data table may be introduced for convenience.

No generic assignment table may be introduced.

No generic relationship table may be introduced.

No generic scope table with target-type and target-id polymorphism may be introduced.

No generic coverage table with target-type and target-id polymorphism may be introduced.

New persistence is allowed only when it is an approved catalog table in [table-catalog.md](table-catalog.md).

Read-only Effective, Diagnostic, Roll-up, and Policy Applicability results are queries, not tables.

## 6. Explicit exclusions

There are no Master Data audit tables.

There are no Master Data monitoring tables.

There are no Master Data workflow tables.

There are no Master Data job tables.

There are no Master Data scheduler tables.

There is no Master Data outbox.

There is no Master Data cache table.

There are no materialized derived-result tables.

KPI is not Master Data V2 functionality.

KRI is not Master Data V2 functionality.

Risk assessment results are not Master Data V2 functionality.

Likelihood, impact, and risk score are not Master Data V2 attributes.

Control test results are not Master Data V2 functionality.

Control effectiveness results are not Master Data V2 functionality.

Policy approval workflow is not Master Data V2 functionality.

Performance plans are not Master Data V2 functionality.

## 7. Entity identity and lifecycle

Every mutable business entity has an immutable UUID identity.

Every mutable business entity has a business key where the logical model defines one.

Business codes are normalized and compared according to the cataloged unique constraint.

Lifecycle state is explicit in normal columns.

Soft delete is explicit through lifecycle columns such as `deleted_at`, `deleted_by`, and an applicable status.

Restore is an explicit business command.

Delete is never implemented by hidden `@SQLDelete` behavior.

Repository methods must not conceal lifecycle transitions behind JPA annotations.

Purging is limited to the defined document-version lifecycle and is never a generic entity delete shortcut.

Every mutable entity carries optimistic-lock field `version NUMBER(19)`.

Updates, status changes, deletes, and restores require the current version.

## 8. Central definitions

Central definitions are independent from Organization.

Organization must not be a required parent or partition key for Central definitions.

Process and Subprocess are distinct physical entities.

The UI may render Process and Subprocess together in one tree.

Risk Category and Risk Template are distinct physical entities.

Policy Group, Policy, and Policy Version are distinct physical entities.

Regulation Group, Regulation, and Regulation Requirement are distinct physical entities.

Control Objective replaces any incompatible generic Objective usage within Master Data V2.

Central definitions may be referenced by typed Central scope relations.

Central definition changes do not physically mutate Local data.

Central definition deletion must protect valid dependent scope and document links according to the business command.

## 9. Central Blueprint rules

The Central Blueprint is the approved central configuration for a Subprocess.

Central Scope is typed and begins from a Central Subprocess Scope.

Each scope relation names its exact target entity in its own table and API command.

Central Coverage is typed and connects approved scope members within one Central Subprocess Scope.

Central Coverage must never span different Subprocesses.

The same-subprocess rule is enforced by composite foreign keys or an equally strong relational constraint.

Direct Control-to-Regulation coverage is prohibited.

Regulatory coverage is expressed through Regulation Requirement and Requirement-Control Coverage.

Central Policy Scope is separate from generic policy assignment.

Central Policy Scope references a Policy Version, never a mutable policy text snapshot.

Classification is explicit and typed; it is not encoded in a free-text relation type.

## 10. Local Context rules

Local data exists only inside an Organization plus Subprocess context.

`local_organization_subprocess_context` is the root of Local configuration.

The context uses a distinct Organization and Subprocess pair.

Local Scope is typed and belongs to exactly one Local Context.

Local Coverage is typed and connects members of exactly one Local Context.

Local Coverage must never span Local Contexts.

Local Policy Scope belongs to exactly one Local Context.

Local validity must fit inside the validity of its Central origin when an origin exists.

No central update physically inserts, updates, soft-deletes, restores, or reorders Local rows.

The user explicitly creates local data through Local business commands.

Effective and Diagnostic queries determine the impact of central change without mutating Local data.

## 11. Scope and coverage APIs

Core Scope and Coverage endpoints are use-case-oriented.

They are not generic table CRUD endpoints.

A command clearly identifies the typed scope or typed coverage it manages.

A command validates the enclosing Subprocess or Local Context before state changes.

A coverage command validates both ends before it creates the relationship.

Coverage commands reject cross-subprocess Central Coverage.

Coverage commands reject cross-context Local Coverage.

Coverage commands reject deleted, inactive, or invalid components as specified by the domain rule.

Each successful mutation returns the changed entity, revision identity, and new optimistic-lock version.

## 12. Business Revision ownership

The backend owns Business Revision creation.

One successful Business Command creates one Business Revision.

The backend owns the database transaction that contains the business change and its revision.

The frontend sends business commands only.

The frontend never creates Revision Content.

The frontend never supplies a revision sequence number.

The frontend never supplies before or after snapshots.

The frontend never controls transaction ordering.

Revision Content is the only approved controlled-polymorphic business record besides Document Link.

Revision Content is constrained to a closed allow-list of Master Data aggregate types.

Revision domain mismatch is rejected before persistence.

Missing Revision context is rejected before persistence.

An applied Business Revision is immutable.

## 13. Document and MinIO rules

Document creation begins with a temporary upload.

The technical `document_temp_upload` table records that temporary upload.

The API exposes a backend-owned `tempUploadId`, not a client-generated session identifier.

A Business Command consumes the temporary upload while creating or appending a Document Version.

One temporary upload is consumed at most once.

An expired temporary upload cannot be consumed.

An invalid temporary upload cannot be consumed.

The final Document is a business entity.

Document Version is immutable after creation.

Document Link is the only approved document-target polymorphism.

Document Link uses a closed, typed allow-list and resource authorization.

The API never exposes a permanent MinIO object URL.

Secure download is authorized by the backend and produces a short-lived controlled response or URL.

There is no distributed transaction between Oracle and MinIO.

The implementation must use an explicit compensating or recoverable state transition when storage and database steps do not both complete.

Direct final upload into an arbitrary business target is prohibited.

## 14. Read-model rules

Effective is a read-only computed view for an `evaluationDate`.

Diagnostic is a read-only explanation of Effective resolution for the same `evaluationDate`.

Roll-up is a read-only aggregation query.

Policy Applicability is a read-only query.

These results are never command targets.

They have no materialized table.

They do not create revisions when queried.

They do not mutate Central or Local state when queried.

Their source data is limited to approved Central, Local, Policy Scope, validity, lifecycle, and document facts.

## 15. Architecture and code quality

Master Data business logic lives inside the Master Data domain and application layers.

Controllers remain thin adapters.

Repositories persist aggregates and typed relations without embedding business workflow.

DTOs remain API-boundary objects and must not become persistence models.

There must be no unnecessary duplicate domain model and JPA model.

There must be no generic abstraction without multiple proven use cases.

There must be no business logic hidden in UI stores or API repositories.

There must be no Master Data business logic in unrelated organization, document, audit, monitoring, or workflow modules.

Clean Code is required: clear naming, single-purpose commands, explicit validation, and focused tests.

Clean Architecture is required: domain rules do not depend on HTTP, React, MinIO SDK details, or JPA controller DTOs.

The delivery must be production-grade, including authorization, concurrency, error mapping, database constraints, and validation.

## 16. Security boundary

Business permission checks occur at use-case boundaries.

Resource authorization is checked for Central and Local reads and mutations when the security model requires it.

Document upload, consume, link, version, delete, restore, and download operations are separately authorized.

Authorization must not rely solely on a target type supplied by the client.

The backend resolves authoritative resource identity before authorization.

No response exposes storage credentials, permanent object keys where unnecessary, or permanent MinIO URLs.

## 17. Existing repository instruction conflicts

`grcpc-app/AGENTS.md` requires versioned Flyway migrations and Oracle compatibility; that is compatible with Day-Zero, provided later work creates a new coherent V2 migration set rather than edits an applied migration.

The current `application.yml` preference for UUID JDBC type `VARCHAR` conflicts with the V2 `RAW(16)` requirement and must be changed only in a later implementation slice.

The document-module instruction to preserve `DocumentAttachmentEntity` and its generic attachment lifecycle conflicts with V2 Document, Document Version, Document Link, and `tempUploadId`; the V2 contract overrides that legacy shape.

The organization and process instructions preserve current assignment endpoints and tree models; V2 preserves the useful UI tree behavior but replaces generic and legacy assignment APIs with typed Scope and Coverage commands.

The current regulation instruction preserves one tree table and old node types; V2 physically separates Regulation Group, Regulation, and Regulation Requirement.

The current policy instruction describes legacy lifecycle states including approval; V2 has immutable Policy Version but no policy approval workflow feature.

The backend instruction to audit sensitive operations remains compatible only through the existing cross-domain audit facility; it does not authorize adding Master Data audit tables.

The UI instructions to preserve FCL, tree expansion, selection, RTL, UI5, and i18n are compatible and remain binding where they do not recreate the legacy data flow.

## 18. Implementation handoff rule

Every later prompt must cite this contract and the matching sections of the table catalog, API conventions, dependency map, legacy deletion map, UI compatibility map, and acceptance checklist.

No later task may broaden the table boundary merely because a legacy screen has an unsupported field or tab.

Any requirement outside this contract must be classified as out of scope or must first receive an approved logical-model revision.
