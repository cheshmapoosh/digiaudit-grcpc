# Master Data V2 Legacy Deletion Map

## 1. Purpose and execution rule

This is an actionable inventory of legacy Master Data implementation evidence.

The database is greenfield, so no legacy data migration or schema upgrade path is created.

The codebase still needs planned removal of incompatible legacy code as each V2 vertical slice arrives.

No vertical slice may leave its own replaced legacy API or persistence path active for compatibility.

The final cleanup slice removes only residue that has no independent vertical-slice owner.

## 2. Classification vocabulary

`KEEP` means retain the implementation as-is because it is outside the V2 table boundary and compatible.

`KEEP_VISUAL_REPLACE_DATA_FLOW` means retain a useful UX pattern while replacing its model, API, storage, and state flow.

`REMAP` means preserve the business intent in a different V2 aggregate, typed relation, command, or query.

`REPLACE` means remove the incompatible implementation and deliver the named V2 replacement in the owning slice.

`DELETE` means remove the feature because it is prohibited or has no approved Master Data V2 replacement.

`DEFER_OUT_OF_SCOPE` means do not implement it in Master Data V2 and do not create a table, API, UI, or permission here.

## 3. Fast disposition summary

| Legacy family | V2 disposition | Owning later slice |
| --- | --- | --- |
| VARCHAR UUID persistence | REPLACE | Day-Zero foundation |
| Combined hierarchy tables | REPLACE | Central definitions |
| Generic assignments and links | REPLACE or REMAP | Central/Local Scope and Coverage |
| Direct Control–Regulation link | DELETE | Central Coverage |
| Generic Objective | REPLACE | Central definitions |
| JSON account-group relationships | REPLACE | Central definitions |
| Generic attachments and direct upload | REPLACE or DELETE | Document and revision integration |
| `tempSessionId` | REPLACE | Document and revision integration |
| Control steps and performance plans | DELETE | Central definitions / Control cleanup |
| KPI, KRI, assessment and workflow | DEFER_OUT_OF_SCOPE or DELETE | Relevant feature slice |
| FCL/tree/UI5/RTL interaction patterns | KEEP_VISUAL_REPLACE_DATA_FLOW | Every UI vertical slice |

## 4. Flyway migrations and legacy tables

### L01 — Legacy organization migration and `organization` table

- **Current path or object:** `grcpc-app/src/main/resources/db/migration/oracle/V1003__create_organization_table.sql`; legacy `organization` table.
- **Current responsibility:** Persists organization tree with `VARCHAR2(36 CHAR)` ids, status/type fields, and physical legacy schema history.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 IDs must be `RAW(16)`, lifecycle must be explicit soft delete/restore with optimistic locking, and Day-Zero cannot be a legacy upgrade path.
- **Target replacement:** B01 `organization` in the V2 Day-Zero catalog with raw UUIDs and revised lifecycle constraints.
- **Implementation phase that removes it:** Day-Zero foundation and Central definitions slice.

### L02 — Legacy combined regulation migration and `regulation` table

- **Current path or object:** `grcpc-app/src/main/resources/db/migration/oracle/V1004__create_regulation_table.sql`; legacy `regulation` table.
- **Current responsibility:** Stores regulation group, law, and requirement in one self-referential node table with a type discriminator.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 requires separate Regulation Group, Regulation, and Regulation Requirement entities and Requirement–Control Coverage.
- **Target replacement:** B08 `regulation_group`, B09 `regulation`, B10 `regulation_requirement`, and B23/B29 or local counterparts.
- **Implementation phase that removes it:** Central definitions, then Central Scope and Central Coverage slices.

### L03 — Main legacy master-data migration

- **Current path or object:** `grcpc-app/src/main/resources/db/migration/oracle/V1080__create_master_data_security_document_tables.sql`.
- **Current responsibility:** Creates combined process/risk/policy tables, legacy controls, assignments, generic attachments, and legacy ACL schema.
- **Classification:** REPLACE.
- **Reason it is incompatible:** It contains text UUIDs, combined node entities, generic attachments, legacy assignments, and legacy controls mixed in one migration.
- **Target replacement:** The full B01–B47 and T01 catalog, with cross-cutting security handled outside the Master Data table count.
- **Implementation phase that removes it:** Day-Zero foundation through Document and revision integration; no V2 install replays this migration.

### L04 — Organization-process-risk triple assignment migration

- **Current path or object:** `V1140__create_organization_process_risk_assignment.sql`; `organization_process_risk_assignment`.
- **Current responsibility:** Directly assigns a risk node to an organization and a process node with generic assignment type and validity.
- **Classification:** REPLACE.
- **Reason it is incompatible:** It bypasses Local Context, typed Local Scope, Central-origin validity, and same-context Local Coverage.
- **Target replacement:** B31 Local Context, B34 Local Risk Scope, and B39/B40 typed Local Coverage.
- **Implementation phase that removes it:** Local Context and Local Scope/Coverage slices.

### L05 — Generic organization-reference assignment migration

- **Current path or object:** `V1150__create_organization_reference_assignment.sql`; `organization_reference_assignment`.
- **Current responsibility:** Uses `reference_type` and `reference_id` to attach Control, Regulation, Policy, and formerly Objective to Organization.
- **Classification:** REPLACE.
- **Reason it is incompatible:** Generic target polymorphism is not allowed for Master Data assignment; V2 local data must live under Organization plus Subprocess Context.
- **Target replacement:** B31–B42 typed Local Context, Scope, Coverage, and Local Policy Scope tables.
- **Implementation phase that removes it:** Local Context, Local Scope/Coverage, and Local Policy Scope slices.

### L06 — Legacy process assignment migrations

- **Current path or object:** `V1153__create_process_objective_assignment.sql`, `V1154__create_process_account_group_assignment.sql`, `V1157__create_process_risk_assignment.sql`, and `V1158__create_process_regulation_assignment.sql`.
- **Current responsibility:** Creates process-node assignments to generic objective, account group, risk node, and regulation node.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 scopes are Subprocess-centered and typed; direct process-to-law and generic objective assignments are not approved.
- **Target replacement:** B19–B30 typed Central Scope, Classification, Coverage, and Central Policy Scope tables.
- **Implementation phase that removes it:** Central Scope and Central Coverage slices.

### L07 — Legacy control assignment migration

- **Current path or object:** `V1155__create_control_assignment.sql`; `control_assignment`; historical `process_control_assignment` copy.
- **Current responsibility:** Mixes Central Control definition with Subprocess assignment, owner, test plan, operation, and validity state.
- **Classification:** REPLACE.
- **Reason it is incompatible:** A Central Control must be independent of Organization and Subprocess assignment, and V2 uses typed scope/coverage rather than a combined control assignment.
- **Target replacement:** B04 Control, B20 Central Control Scope, B32 Local Control Scope, and B26/B28/B30/B38/B40/B42 typed relations.
- **Implementation phase that removes it:** Central Scope then Local Scope/Coverage slices.

### L08 — Legacy control-tab migrations

- **Current path or object:** `V1156__create_control_assignment_tabs.sql`; `control_step`, link tables, `control_document`, and `control_performance_plan`.
- **Current responsibility:** Adds tab-specific child persistence beneath legacy control assignments.
- **Classification:** REPLACE.
- **Reason it is incompatible:** It mixes excluded test/planning functionality, direct regulation links, copied target snapshots, and attachment metadata with Master Data.
- **Target replacement:** Typed coverage tables and Document/Document Version/Document Link only where explicitly approved.
- **Implementation phase that removes it:** Central Coverage, Document and revision integration, and Control cleanup slices.

### L09 — Legacy temporary-upload migrations

- **Current path or object:** `V1151__add_temp_document_attachment_fields.sql`, `V1152__add_document_attachment_title.sql`, and `V1159__create_document_temp_upload.sql`.
- **Current responsibility:** Retrofits temporary sessions and mutable title into generic attachments, then moves TEMP rows to a separate session-based upload table.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 has one `document_temp_upload` table but uses backend-issued `tempUploadId`, one-time consumption, and no generic final attachment.
- **Target replacement:** T01 `document_temp_upload` plus B43–B45 Document, immutable Version, and controlled Link.
- **Implementation phase that removes it:** Document and revision integration slice.

### L10 — Generic objective-organization migration and data migration

- **Current path or object:** `V1160__create_objective_organization_assignment.sql` and `V1161__migrate_objective_organization_assignments.sql`.
- **Current responsibility:** Creates direct generic Objective-to-Organization assignments and migrates legacy reference rows into them.
- **Classification:** DELETE.
- **Reason it is incompatible:** Generic Objective conflicts with approved Control Objective and a fresh V2 database has no legacy data migration.
- **Target replacement:** B05 Control Objective plus typed Central/Local Scope, Classification, and Coverage only where model-supported.
- **Implementation phase that removes it:** Central definitions and Local Scope/Coverage slices.

### L11 — Legacy Flyway permission seed migrations

- **Current path or object:** `V1070__seed_master_data_business_permissions.sql`, related `V10xx` common permission seeds, and document permission rows.
- **Current responsibility:** Seeds broad legacy feature and generic document permissions.
- **Classification:** REMAP.
- **Reason it is incompatible:** V2 commands need typed permission boundaries and resource authorization, not legacy endpoint-shaped permissions alone.
- **Target replacement:** V2 permission vocabulary seeded after command/resource names are finalized; no permission table is added to Master Data catalog.
- **Implementation phase that removes it:** Day-Zero foundation and Security/API cleanup slices.

## 5. Backend entities, enums, repositories, services, controllers, DTOs, and mappers

### L12 — Current Organization entity and generic CRUD stack

- **Current path or object:** `modules/organization/domain/entity/OrganizationEntity.java`, `OrganizationRepository.java`, `OrganizationService.java`, `OrganizationController.java`, DTOs and mappers under `modules/organization/api`.
- **Current responsibility:** Provides organization tree CRUD, physical deletion, and legacy status update endpoints.
- **Classification:** REPLACE.
- **Reason it is incompatible:** It uses text UUID persistence, lacks the V2 lifecycle/revision contract, and exposes generic CRUD responses without required version/revision fields.
- **Target replacement:** V2 Organization aggregate commands and read DTOs backed by B01 and Business Revision.
- **Implementation phase that removes it:** Central definitions slice.

### L13 — Organization process-assignment stack

- **Current path or object:** `OrganizationProcessAssignmentEntity.java`, `OrganizationProcessAssignmentRepository.java`, service/controller/DTO/mapper siblings under `modules/organization`.
- **Current responsibility:** Assigns any `process_node` to Organization with `scope`, `owner`, or `participant` type.
- **Classification:** REMAP.
- **Reason it is incompatible:** V2 Local Context requires an actual Subprocess, matching Central Blueprint, explicit local lifecycle, and no generic assignment role.
- **Target replacement:** Local Context command API backed by B31.
- **Implementation phase that removes it:** Local Context slice.

### L14 — Organization process-relationship stack

- **Current path or object:** `OrganizationProcessRiskAssignmentEntity.java`, `OrganizationProcessRelationshipService.java`, and `OrganizationProcessRelationshipController.java`.
- **Current responsibility:** Adds risks under a selected organization/process assignment.
- **Classification:** REPLACE.
- **Reason it is incompatible:** It is a triple assignment outside typed Local Scope/Coverage and does not enforce Central-origin validity containment.
- **Target replacement:** Local Risk Scope plus Local Control Objective/Control Risk Coverage commands.
- **Implementation phase that removes it:** Local Scope and Local Coverage slice.

### L15 — Organization generic reference stack

- **Current path or object:** `OrganizationReferenceAssignmentEntity.java`, repository/service/controller/DTO/mapper siblings under `modules/organization`.
- **Current responsibility:** Applies string-discriminated Control, Regulation, and Policy references directly to Organization.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 allows no generic assignment target and local facts have one Organization–Subprocess Context parent.
- **Target replacement:** Typed Local Control/Requirement/Account Group scopes, coverage, and Local Policy Scope.
- **Implementation phase that removes it:** Local Scope/Coverage and Local Policy Scope slices.

### L16 — Combined Process/Subprocess entity stack

- **Current path or object:** `modules/masterdata/process/domain/entity/ProcessNodeEntity.java`, `ProcessNodeRepository.java`, `ProcessService.java`, `ProcessController.java`, `ProcessNodeRequest.java`, `ProcessNodeResponse.java`, and `ProcessMapper.java`.
- **Current responsibility:** Persists both Process and Subprocess in `process_node` using `nodeType` and a self-parent relationship.
- **Classification:** REPLACE.
- **Reason it is incompatible:** The approved model physically separates Process and Subprocess and Local Context is anchored specifically to Subprocess.
- **Target replacement:** B02 Process and B03 Subprocess aggregates plus a combined tree read DTO where UI needs one tree.
- **Implementation phase that removes it:** Central definitions slice.

### L17 — Process generic assignment stacks

- **Current path or object:** `ProcessObjectiveAssignment*`, `ProcessAccountGroupAssignment*`, `ProcessRiskAssignment*`, and `ProcessRegulationAssignment*` entity/repository/service/controller/DTO/mapper families.
- **Current responsibility:** Provides table-oriented assignment endpoints below Process Node.
- **Classification:** REPLACE.
- **Reason it is incompatible:** All use generic assignment semantics; Objective is generic, Regulation is not requirement-level, and none enforce same-Subprocess Coverage.
- **Target replacement:** B19–B30 typed Central Scope/Classification/Coverage commands and reads.
- **Implementation phase that removes it:** Central Scope and Central Coverage slices.

### L18 — Legacy process-control assignment

- **Current path or object:** `process_control_assignment` created in `V1080`, copied by `V1155`, with no active dedicated Java entity.
- **Current responsibility:** Historic process-node to Control assignment source.
- **Classification:** DELETE.
- **Reason it is incompatible:** It is superseded legacy persistence and must not be resurrected for V2 compatibility.
- **Target replacement:** Central/Local typed Control Scope and Coverage where the approved use case requires them.
- **Implementation phase that removes it:** Central Scope slice.

### L19 — Central Control and legacy assignment stack

- **Current path or object:** `ControlEntity.java`, `ControlAssignmentEntity.java`, `ControlRepository.java`, `ControlAssignmentRepository.java`, `ControlService.java`, and `ControlAssignmentTabService.java`.
- **Current responsibility:** Manages Control definition and an assignment row with local operational/test attributes under a Subprocess.
- **Classification:** REPLACE.
- **Reason it is incompatible:** It mixes definition and local context, stores excluded testing/planning fields, and lacks required typed Scope/Coverage boundaries.
- **Target replacement:** B04 Control, B20/B32 scopes, and B26–B30/B38–B42 typed relations.
- **Implementation phase that removes it:** Central definitions, Central Scope, and Local Scope/Coverage slices.

### L20 — Control controller security gap

- **Current path or object:** `modules/masterdata/control/api/ControlController.java` and `ControlAssignmentTabController.java`.
- **Current responsibility:** Exposes control and tab operations; unlike many controllers it has no explicit `@PreAuthorize` use-case boundary.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 requires explicit business permission and resource authorization for every command and read API.
- **Target replacement:** Typed V2 Control/Scope/Coverage controllers with use-case authorization and standard errors.
- **Implementation phase that removes it:** Day-Zero foundation and Central definitions through Coverage slices.

### L21 — Direct Control–Regulation link

- **Current path or object:** `ControlRegulationLinkEntity.java`, `ControlRegulationLinkRepository.java`, `ControlAssignmentTabService.linkRegulation`, controller/DTO/mapper code, and legacy table `control_regulation_link`.
- **Current responsibility:** Links a Control Assignment directly to a Regulation or law.
- **Classification:** DELETE.
- **Reason it is incompatible:** Direct Control-to-Regulation is expressly prohibited by the approved model.
- **Target replacement:** B23 Central Requirement Scope plus B29 Central Requirement–Control Coverage and B35/B41 Local equivalents.
- **Implementation phase that removes it:** Central Coverage and Local Coverage slices.

### L22 — Control requirement link

- **Current path or object:** `ControlRequirementLinkEntity.java`, repository, `ControlAssignmentTabService.linkRequirement`, DTOs, mapper, and `control_requirement_link`.
- **Current responsibility:** Links a legacy Control Assignment to a Regulation Requirement and copies descriptive snapshots.
- **Classification:** REMAP.
- **Reason it is incompatible:** It is assignment-scoped, lacks typed Scope/locality checks, and stores copied mutable target data.
- **Target replacement:** B29 Central Requirement–Control Coverage and B41 Local Requirement–Control Coverage.
- **Implementation phase that removes it:** Central Coverage and Local Coverage slices.

### L23 — Control-risk link

- **Current path or object:** `ControlRiskLinkEntity.java`, repository, tab service/controller DTOs, and `control_risk_link`.
- **Current responsibility:** Links a Control Assignment to a risk node with copied code/title/source/organization values.
- **Classification:** REMAP.
- **Reason it is incompatible:** It cannot distinguish Central vs Local Coverage, does not enforce same scope/context, and includes stale copied snapshots.
- **Target replacement:** B28/B40 Control–Risk Coverage and B27/B39 Control Objective–Risk Coverage where applicable.
- **Implementation phase that removes it:** Central Coverage and Local Coverage slices.

### L24 — Control-account-group link

- **Current path or object:** `ControlAccountGroupLinkEntity.java`, repository, tab service/controller DTOs, and `control_account_group_link`.
- **Current responsibility:** Links a Control Assignment to an Account Group with copied descriptive data.
- **Classification:** REMAP.
- **Reason it is incompatible:** It lacks scope locality and revision behavior and behaves as a generic tab relation.
- **Target replacement:** B30 Central Control–Account Group Coverage and B42 Local equivalent.
- **Implementation phase that removes it:** Central Coverage and Local Coverage slices.

### L25 — Control steps

- **Current path or object:** `ControlStepEntity.java`, repository, `ControlAssignmentTabService`, controller DTOs, and `control_step`.
- **Current responsibility:** Stores test or operating steps, required documents, notes, and sensitivity beneath a Control Assignment.
- **Classification:** DELETE.
- **Reason it is incompatible:** Control steps are not an approved Master Data V2 entity, Scope, Coverage, Document Link, or read model.
- **Target replacement:** None within Master Data V2; documents may be linked only through approved Document Link use cases.
- **Implementation phase that removes it:** Central definitions / Control cleanup slice.

### L26 — Control performance plans

- **Current path or object:** `ControlPerformancePlanEntity.java`, repository, tab service/controller DTOs, and `control_performance_plan`.
- **Current responsibility:** Stores planned dates, owners, frequency, and statuses for performance tracking.
- **Classification:** DELETE.
- **Reason it is incompatible:** Performance planning is monitoring/job-like behavior and is explicitly outside Master Data V2.
- **Target replacement:** None in this redesign; no Monitoring, Job, or Scheduler table is created.
- **Implementation phase that removes it:** Central definitions / Control cleanup slice.

### L27 — Legacy `control_document`

- **Current path or object:** `ControlDocumentEntity.java`, `ControlDocumentRepository.java`, `ControlAssignmentTabService`, controller DTOs, and `control_document`.
- **Current responsibility:** Stores name, type, description, and file reference directly beneath a legacy Control Assignment.
- **Classification:** REPLACE.
- **Reason it is incompatible:** It is not a Document identity, immutable Document Version, controlled Document Link, or secure temporary-upload flow.
- **Target replacement:** B43 Document, B44 Document Version, B45 Document Link, and T01 temporary upload.
- **Implementation phase that removes it:** Document and revision integration slice.

### L28 — Combined Risk entity stack

- **Current path or object:** `RiskNodeEntity.java`, `RiskNodeRepository.java`, `RiskService.java`, `RiskController.java`, request/response DTOs, mapper, and risk effect converter.
- **Current responsibility:** Persists Risk Category and Risk Template in one `risk_node` table using `nodeType` and JSON-like effects conversion.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 separates Risk Category from Risk Template and excludes KRI, scores, assessment results, response patterns, and control-center outcomes.
- **Target replacement:** B06 Risk Category, B07 Risk Template, and typed Central/Local Scope/Coverage relations.
- **Implementation phase that removes it:** Central definitions then Central/Local Scope/Coverage slices.

### L29 — Risk enums and effect model

- **Current path or object:** `RiskEffectValue.java`, `RiskEffectListConverter.java`, `RiskNodeRequest.java`, risk enums and related client payload fields.
- **Current responsibility:** Models flexible effects and legacy risk template attributes inside the combined risk node.
- **Classification:** REMAP.
- **Reason it is incompatible:** Free-form effect structures must not become likelihood, impact, score, KRI, or assessment persistence in Master Data V2.
- **Target replacement:** Approved Risk Template descriptive summaries only; detailed effect representation requires a future approved logical model revision.
- **Implementation phase that removes it:** Central definitions / Risk cleanup slice.

### L30 — Generic Objective entity stack

- **Current path or object:** `ObjectiveNodeEntity.java`, `ObjectiveNodeRepository.java`, `ObjectiveService.java`, `ObjectiveController.java`, objective DTOs, mapper, and Objective Organization assignment stack.
- **Current responsibility:** Provides a generic hierarchical Objective master-data feature with direct organization assignments.
- **Classification:** REPLACE.
- **Reason it is incompatible:** Generic Objective must not remain where it conflicts with approved Control Objective; direct organization relationship is also outside Local Context.
- **Target replacement:** B05 Control Objective plus B21/B33 scope and B26/B38 classification as approved.
- **Implementation phase that removes it:** Central definitions slice, followed by Local Scope/Coverage cleanup.

### L31 — Combined Regulation entity stack

- **Current path or object:** `modules/regulation/domain/entity/RegulationEntity.java`, repository, service, controller, DTOs, mapper, and `RegulationNodeType`/`RegulationStatus` enums.
- **Current responsibility:** Persists group, law, and requirement as one hierarchy and exposes node CRUD/status operations.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 has three physical entities, typed requirement scope, and no direct Control–Regulation relation.
- **Target replacement:** B08–B10 plus B23/B29/B35/B41 commands and read DTOs.
- **Implementation phase that removes it:** Central definitions, Central Coverage, and Local Coverage slices.

### L32 — Combined Policy entity stack

- **Current path or object:** `PolicyNodeEntity.java`, `PolicyNodeRepository.java`, `PolicyService.java`, `PolicyController.java`, DTOs, mapper, and legacy policy status values.
- **Current responsibility:** Combines Policy Group and Policy, stores mutable string version, and exposes workflow-shaped status changes.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 separates Policy Group, Policy, and immutable Policy Version and excludes policy approval workflow.
- **Target replacement:** B11 Policy Group, B12 Policy, B13 immutable Policy Version, B25 Central Policy Scope, and B37 Local Policy Scope.
- **Implementation phase that removes it:** Central definitions, Central Policy Scope, and Local Policy Scope slices.

### L33 — Account-group JSON persistence stack

- **Current path or object:** `AccountGroupEntity.java`, `AccountGroupRepository.java`, `AccountGroupService.java`, `AccountGroupController.java`, mapper/DTOs, converters, and `AccountRangeValue`, `AccountGroupObjectiveValue`, `AccountGroupRiskValue`, `AccountGroupAssertionsValue`.
- **Current responsibility:** Stores account group hierarchy plus assertions, objectives, ranges, and risks in CLOB JSON/value-converter fields.
- **Classification:** REPLACE.
- **Reason it is incompatible:** JSON lacks relational integrity, typed target constraints, validity, revisions, and the required Control Objective replacement.
- **Target replacement:** B14 Account Group with B15 assertion, B16 account range, B17 Control Objective, and B18 Risk Template relations.
- **Implementation phase that removes it:** Central definitions / Account Group slice.

### L34 — Generic `document_attachment` entity stack

- **Current path or object:** `DocumentAttachmentEntity.java`, `DocumentAttachmentRepository.java`, `DocumentAttachmentService.java`, `DocumentAttachmentController.java`, attachment DTOs, mapper, and `document_attachment`.
- **Current responsibility:** Persists generic `targetType`/`targetId`, MinIO bucket/object values, direct final upload metadata, mutable title, and soft-ish attachment status.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 permits controlled polymorphism only in Document Link, requires immutable Document Version, and never exposes direct permanent-storage metadata.
- **Target replacement:** B43 Document, B44 immutable Document Version, B45 controlled Document Link, and secure download command.
- **Implementation phase that removes it:** Document and revision integration slice.

### L35 — Legacy `tempSessionId` temporary upload stack

- **Current path or object:** `DocumentTempUploadEntity.java`, `DocumentTempUploadRepository.java`, `DocumentCommitRequest.java`, `DocumentUploadPolicyResponse.java`, and `DocumentAttachmentService` temp/commit methods.
- **Current responsibility:** Accepts a client-generated `tempSessionId`, stores generic target hints, and commits a session separately into final attachments.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 uses backend-issued `tempUploadId`, no standalone generic commit, one-time consumption, and parent Business Command ownership.
- **Target replacement:** T01 with state/expiry/consumption facts; document-owning Create/Update commands consume the upload.
- **Implementation phase that removes it:** Document and revision integration slice.

### L36 — Direct final upload and generic document endpoints

- **Current path or object:** `DocumentAttachmentController.java` endpoints `POST /api/documents`, `/temp`, `/commit`, title patch, delete, and download-url.
- **Current responsibility:** Provides direct final multipart upload, standalone temporary commit, mutable attachment metadata, generic delete, and presigned URL response.
- **Classification:** DELETE.
- **Reason it is incompatible:** Direct final upload and standalone generic commit violate the required temporary-upload-to-Business-Command flow.
- **Target replacement:** Use-case document commands, `tempUploadId` upload issuance, Document Version history, and authorized secure download.
- **Implementation phase that removes it:** Document and revision integration slice.

### L37 — MinIO configuration abstraction

- **Current path or object:** `modules/document/config/DocumentStorageConfig.java` and `MinioProperties.java`.
- **Current responsibility:** Keeps MinIO endpoint, credentials, bucket configuration, and client wiring behind a backend configuration boundary.
- **Classification:** KEEP.
- **Reason it is incompatible:** The abstraction itself is compatible; only generic attachment semantics and API exposure are incompatible.
- **Target replacement:** Reuse the configuration boundary behind V2 Document storage adapter without exposing bucket, object key, or credentials.
- **Implementation phase that removes it:** Document and revision integration slice retains and adapts it.

### L38 — Scheduled temp cleanup behavior

- **Current path or object:** `DocumentAttachmentService` scheduled cleanup and `GrcpcApiApplication` scheduling enablement.
- **Current responsibility:** Deletes expired temporary rows and MinIO objects under the legacy session flow.
- **Classification:** REMAP.
- **Reason it is incompatible:** Cleanup must operate only on T01 state/expiry and must not require a Master Data scheduler/job table or mutate documents.
- **Target replacement:** A bounded infrastructure cleanup process over `document_temp_upload` with explicit idempotent state transition.
- **Implementation phase that removes it:** Document and revision integration slice.

### L39 — Generic resource ACL stack

- **Current path or object:** `ResourceAclEntryEntity.java`, repository/service/controller/DTO/mapper, and `ResourceAuthorizationService.java`.
- **Current responsibility:** Implements cross-cutting user/role resource authorization using generic target types and deny-overrides-allow behavior.
- **Classification:** REMAP.
- **Reason it is incompatible:** Generic ACL is not a Master Data relation and its resource vocabulary must be bounded to V2 command/read resources.
- **Target replacement:** Reuse cross-cutting authorization service pattern with V2 resource authorization adapters; do not add an ACL table to B01–B47.
- **Implementation phase that removes it:** Day-Zero foundation and Security/API cleanup slice.

### L40 — Global audit stack

- **Current path or object:** `modules/audit/application/AuditService.java`, `AuditLogEntity.java`, and audit migrations.
- **Current responsibility:** Provides cross-cutting audit logging for current management operations.
- **Classification:** KEEP.
- **Reason it is incompatible:** It is outside Master Data scope, but Business Revision must not be confused with audit logging and no V2 audit table may be created.
- **Target replacement:** Retain only the approved cross-cutting audit integration if existing platform policy requires it; Business Revision remains a separate V2 business concept.
- **Implementation phase that removes it:** Day-Zero foundation documents the boundary; no deletion is owned by Master Data V2.

## 6. API, permissions, DTO, and mapper cleanup

### L41 — Legacy generic Master Data endpoints

- **Current path or object:** `/api/organizations`, `/api/processes`, `/api/risks`, `/api/objectives`, `/api/regulations`, `/api/policies`, and `/api/account-groups` controllers and API repositories.
- **Current responsibility:** Exposes list/get/create/update/delete/status-style generic CRUD for legacy aggregate shapes.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 needs separate create/update/read DTOs, required version mutations, Business Revision responses, and no compatibility API.
- **Target replacement:** Use-case-oriented V2 endpoints described in [api-conventions.md](api-conventions.md).
- **Implementation phase that removes it:** Each Central definition vertical slice removes its own legacy endpoint family.

### L42 — Legacy assignment endpoint families

- **Current path or object:** `/api/organization-process-assignments`, `/api/organization-reference-assignments`, `/api/organization-risk-assignments`, and `/api/process-*-assignments` controllers.
- **Current responsibility:** Performs generic POST/DELETE assignment operations with optional status, assignment type, and validity.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 prohibits generic assignment CRUD and requires typed Scope/Coverage command validation.
- **Target replacement:** Typed Central Scope/Coverage and Local Context/Scope/Coverage/Policy Scope APIs.
- **Implementation phase that removes it:** Central Scope/Coverage and Local Context/Scope/Coverage slices own their respective endpoints.

### L43 — Legacy control-tab endpoint family

- **Current path or object:** `/api/control-assignments/**`, `/api/control-structure`, `/api/controls`, and sub-process control creation/attachment endpoints.
- **Current responsibility:** Mixes central control, subprocess assignment, steps, links, documents, and performance plans in table-oriented routes.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 commands are aggregate/use-case oriented and cannot expose generic tab relation CRUD.
- **Target replacement:** V2 Control definition, typed Scope/Classification/Coverage, and Document commands.
- **Implementation phase that removes it:** Central definitions, Scope/Coverage, and Document integration slices.

### L44 — Legacy document DTOs and mappers

- **Current path or object:** `DocumentAttachmentResponse.java`, `DocumentCommitRequest.java`, `DocumentTitleUpdateRequest.java`, `DocumentDownloadUrlResponse.java`, `DocumentAttachmentMapper.java`.
- **Current responsibility:** Carries generic attachment/storage/session/title semantics across HTTP boundary.
- **Classification:** REPLACE.
- **Reason it is incompatible:** It permits frontend storage details, generic target mapping, title mutation of attachment rows, and standalone commit order.
- **Target replacement:** Temporary-upload, Document command, Document Version read, Document Link read, secure-download, and mutation-result DTO families.
- **Implementation phase that removes it:** Document and revision integration slice.

### L45 — Legacy DTO concurrency shape

- **Current path or object:** current request/response DTOs in organization, process, control, risk, regulation, policy, objective, account-group, and document APIs.
- **Current responsibility:** Carries mutable fields without a mandatory `version`, `revisionId`, command identity, or standard validation result.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 mandates optimistic locking and backend-owned revision response on every mutation.
- **Target replacement:** separate typed Create Command, Update Command, Read DTO, Effective DTO, Diagnostic DTO, and common mutation result.
- **Implementation phase that removes it:** Day-Zero foundation contract followed by each owning vertical slice.

### L46 — Legacy business-permission vocabulary

- **Current path or object:** `modules/usermanagement/domain/enums/BusinessPermissionCode.java` and current master-data/document permission mappings.
- **Current responsibility:** Supplies broad feature permissions such as process, control, and document management.
- **Classification:** REMAP.
- **Reason it is incompatible:** V2 command/read boundaries need typed actions and resource authorization rather than an inherited generic endpoint list.
- **Target replacement:** V2 permission codes for definitions, Central Scope/Coverage, Local Context/Scope/Coverage, documents, revisions, and read models.
- **Implementation phase that removes it:** Day-Zero foundation and Security/API cleanup slice.

## 7. Frontend routes, pages, components, stores, repositories, and i18n

### L47 — Master Data hub route and navigation

- **Current path or object:** `grcpc-ui/src/features/master-data/routes.tsx`, `MasterDataFeaturePage.tsx`, and `src/layout/MainLayout.tsx` master-data navigation group.
- **Current responsibility:** Provides seven master-data cards/routes and nav grouping for legacy features.
- **Classification:** REMAP.
- **Reason it is incompatible:** Current hub lacks Central Scope, Coverage, Local Context, Policy Scope, Effective, Diagnostic, Roll-up, Policy Applicability, and document-version entries.
- **Target replacement:** Expanded V2 navigation that retains Persian RTL/UI5 presentation and adds only approved V2 feature entries.
- **Implementation phase that removes it:** UI foundation and each V2 feature slice; obsolete generic Objective tile is removed in Central definitions UI slice.

### L48 — FCL shells and List Report patterns

- **Current path or object:** all `*FclShellPage.tsx` and `*ListReport.tsx` pages under organization, process, objective, risk, regulation, policy, and account-group features.
- **Current responsibility:** Provides FCL start/mid-column layout, list reports, search, selection, expanded tree state, UI5 controls, and RTL behavior.
- **Classification:** KEEP_VISUAL_REPLACE_DATA_FLOW.
- **Reason it is incompatible:** The visual architecture is compatible, but the shell is bound to legacy node, assignment, generic CRUD, and document APIs.
- **Target replacement:** Reuse visual patterns with V2 read DTOs, typed commands, version-aware mutation messages, and new pages for scopes/read models.
- **Implementation phase that removes it:** Every UI vertical slice replaces the feature's data flow while retaining compatible presentation code.

### L49 — Organization UI model and generic stores

- **Current path or object:** `features/organization/domain/organization.*`, `infra/organization*.api.repo.ts`, `service/organization.service.ts`, and `state/organization*.state.ts`.
- **Current responsibility:** Holds generic Organization CRUD and separate stores for process, relationship, reference, and objective assignments.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 Local state must start at one Local Context and has no generic organization-reference or generic objective assignment.
- **Target replacement:** V2 Organization store plus Local Context/Scope/Coverage/Policy Scope repositories and state.
- **Implementation phase that removes it:** Organization/Central definitions UI slice then Local Context and Local Scope/Coverage UI slices.

### L50 — Organization object page tabs and wizard

- **Current path or object:** `features/organization/pages/OrganizationObjectPage.tsx` and related tab/dialog components.
- **Current responsibility:** Renders direct Subprocess, Risk, Control, Regulation, Policy, Objective, Owner, Document, KPI, KRI, Performance, and Risk Appetite tabs.
- **Classification:** KEEP_VISUAL_REPLACE_DATA_FLOW.
- **Reason it is incompatible:** Direct assignments and excluded KPI/KRI/risk-appetite/performance tabs do not fit V2 Local Context and typed relation design.
- **Target replacement:** Retain the multi-step selection/list visual flow as Local Context followed by typed Local Scope/Coverage/Policy Scope; use V2 Document UI.
- **Implementation phase that removes it:** Local Context and Local Scope/Coverage UI slices remove each legacy tab as its replacement arrives.

### L51 — Process UI combined persistence flow

- **Current path or object:** `features/process/domain/process.model.ts`, schema, API repo, factory, service, state, and `ProcessObjectPage.tsx`.
- **Current responsibility:** Treats Process and SubProcess as one `ProcessNode` with `nodeType` and generic CRUD.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 physically separates Process and Subprocess and provides no compatibility API.
- **Target replacement:** Separate Process/Subprocess commands and a combined tree read projection for familiar visual navigation.
- **Implementation phase that removes it:** Central definitions UI slice.

### L52 — Process tree and control tree components

- **Current path or object:** `ProcessTree.tsx`, `ProcessControlTree.tsx`, `ProcessCreateMenu.tsx`, and `ProcessSummaryPanel.tsx`.
- **Current responsibility:** Renders the familiar process → subprocess → control tree and create menu.
- **Classification:** KEEP_VISUAL_REPLACE_DATA_FLOW.
- **Reason it is incompatible:** It assumes a combined persistence graph and control assignment row.
- **Target replacement:** Keep expansion/selection/tree rendering but populate it with V2 read DTOs over separate central definitions and typed scope status.
- **Implementation phase that removes it:** Central definitions and Central Scope UI slices.

### L53 — Process direct-assignment tabs

- **Current path or object:** `ProcessObjectivesTab.tsx`, `ProcessAccountGroupsTab.tsx`, `ProcessRisksTab.tsx`, `ProcessRegulationsTab.tsx`, their API repositories/services/models.
- **Current responsibility:** Adds/removes direct generic Process relationships with assignment-type values.
- **Classification:** REPLACE.
- **Reason it is incompatible:** Scope must be typed and Subprocess-centered; generic Objective and direct regulation assignment are prohibited.
- **Target replacement:** Central Scope and Central Coverage pages/tabs with typed value help limited to the selected Subprocess Scope.
- **Implementation phase that removes it:** Central Scope and Central Coverage UI slices.

### L54 — Nested Control route and create flow

- **Current path or object:** `ProcessesFclShellPage.tsx`, nested route `/processes/control-assignments/:controlAssignmentId`, `ControlApiRepo`, and control creation dialogs.
- **Current responsibility:** Creates a Control and a Subprocess assignment together, or attaches an existing control to a legacy assignment.
- **Classification:** REPLACE.
- **Reason it is incompatible:** It conflates Central definition and scope/local state and does not return V2 revision/version results.
- **Target replacement:** Central Control creation plus explicit typed Central/Local Scope commands; a compound command is allowed only when it represents one approved business use case.
- **Implementation phase that removes it:** Central definitions and Central/Local Scope UI slices.

### L55 — Control object page and tab components

- **Current path or object:** `features/process` control object-page components such as `ControlObjectPage.tsx`, `ControlStepsTab.tsx`, `ControlRegulationsTab.tsx`, `ControlRequirementsTab.tsx`, `ControlRisksTab.tsx`, `ControlAccountGroupsTab.tsx`, and `ControlPerformancePlanTab.tsx`.
- **Current responsibility:** Renders general control details and legacy tab CRUD for steps, regulation, requirement, risk, account group, documents, and plan.
- **Classification:** REPLACE.
- **Reason it is incompatible:** Multiple tabs are excluded or link by generic legacy assignment without scope/context validation.
- **Target replacement:** Retain only compatible form/list visuals for typed Classification/Coverage and V2 Documents; delete steps, direct regulation, and performance plan tabs.
- **Implementation phase that removes it:** Central Coverage, Local Coverage, Document, and Control cleanup UI slices.

### L56 — Manual UUID fallback in Control link UI

- **Current path or object:** `features/process` control link tab/dialog component `ControlLinkTab.tsx` and related helpers.
- **Current responsibility:** Allows manually entering a reference UUID when a typed picker is unavailable.
- **Classification:** DELETE.
- **Reason it is incompatible:** V2 APIs require typed command input and server-side locality validation; arbitrary UUID entry bypasses safe Value Help constraints.
- **Target replacement:** Filtered typed Value Help components backed by Central Scope or Local Context read endpoints.
- **Implementation phase that removes it:** Central Coverage and Local Coverage UI slices.

### L57 — Generic Objective UI feature

- **Current path or object:** all files under `grcpc-ui/src/features/objective/`, its `/objectives` route, tree, FCL shell, state, API repository, and translations.
- **Current responsibility:** Implements generic Objective hierarchy, strategy/class fields, organization assignment, and generic document target.
- **Classification:** DELETE.
- **Reason it is incompatible:** Generic Objective must not remain when it conflicts with Control Objective; no compatibility route is allowed.
- **Target replacement:** A distinct Control Objective Central-definition UI with scope/classification views where approved.
- **Implementation phase that removes it:** Central definitions UI slice.

### L58 — Risk UI feature

- **Current path or object:** `features/risk/domain/risk.*`, API repo, state, pages, `RiskTree.tsx`, `RiskSummaryPanel.tsx`, and risk i18n files.
- **Current responsibility:** Presents a combined Risk Category/Risk Template tree plus KRI and assessment-adjacent placeholder tabs.
- **Classification:** KEEP_VISUAL_REPLACE_DATA_FLOW.
- **Reason it is incompatible:** V2 separates category/template persistence and excludes KRI, scores, assessment results, response patterns, and control-center result flows.
- **Target replacement:** Preserve tree/list/object-page visual pattern with split entity APIs/read projection; remove excluded tabs and fields.
- **Implementation phase that removes it:** Central definitions / Risk UI slice.

### L59 — Regulation UI feature

- **Current path or object:** `features/regulation/domain/regulation.*`, API repo, state, pages, `RegulationTree.tsx`, and `RegulationRequirementsSummaryTab.tsx`.
- **Current responsibility:** Presents one Group/Law/Requirement node tree and nested requirement management.
- **Classification:** KEEP_VISUAL_REPLACE_DATA_FLOW.
- **Reason it is incompatible:** Legacy node persistence and direct relationship flows are incompatible, while the tree/requirement visual behavior is useful.
- **Target replacement:** Separate entities with a combined read-only hierarchy tree and typed Requirement–Control Coverage selection.
- **Implementation phase that removes it:** Central definitions and Central Coverage UI slices.

### L60 — Policy UI feature and workflow tabs

- **Current path or object:** `features/policy/domain/policy.*`, API repo, state, pages, `PolicyTree.tsx`, `CreatePolicySplitButton.tsx`, and policy tabs.
- **Current responsibility:** Combines Policy Group/Policy, exposes mutable version/status, and presents scope/risk/control/source/role/review-approval tabs.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 separates Policy and immutable Policy Version, has real Central/Local Policy Scope, and excludes approval workflow and generic scope targets.
- **Target replacement:** Preserve tree/FCL visual pattern with V2 Policy/Version data flows; add typed policy-scope tabs and remove workflow/test tabs.
- **Implementation phase that removes it:** Central definitions, Central Policy Scope, and Local Policy Scope UI slices.

### L61 — Account Group UI feature

- **Current path or object:** `features/account-group/domain/accountGroup.*`, API repo, state, pages, `AccountGroupTree.tsx`, and `AccountGroupObjectPage.tsx`.
- **Current responsibility:** Edits JSON-shaped assertions, objectives, account ranges, and risks and renders some relationship tabs as placeholders.
- **Classification:** KEEP_VISUAL_REPLACE_DATA_FLOW.
- **Reason it is incompatible:** V2 uses normalized typed relations and replaces generic Objective with Control Objective.
- **Target replacement:** Retain tree/list/object-page visual flow and replace arrays with typed normalized relation commands/read DTOs.
- **Implementation phase that removes it:** Central definitions / Account Group UI slice.

### L62 — Generic Document UI state and API repository

- **Current path or object:** `features/document/domain/document.model.ts`, `infra/document.api.repo.ts`, `state/document-attachment.state.ts`, and `DocumentAttachmentsManager.tsx`/`DocumentAttachmentsTab.tsx`.
- **Current responsibility:** Uses generic target type/id, client-generated `tempSessionId`, direct final upload, generic commit, mutable title, delete, and raw download URL handling.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 requires backend-issued `tempUploadId`, parent command consumption, immutable Document Version, controlled Document Link, and secure download.
- **Target replacement:** V2 document domain model/repositories/state retaining file selection, progress, size validation, error, and list presentation only.
- **Implementation phase that removes it:** Document and revision integration UI slice.

### L63 — Unused document panel

- **Current path or object:** `grcpc-ui/src/features/document/components/DocumentAttachmentsPanel.tsx`.
- **Current responsibility:** Defines an attachment presentation component that current source search shows is not used by active UI flows.
- **Classification:** DELETE.
- **Reason it is incompatible:** It would preserve the generic attachment concept and creates dead code after V2 document integration.
- **Target replacement:** None; active V2 Document Version history components own their rendering responsibilities.
- **Implementation phase that removes it:** Document and revision integration UI slice.

### L64 — Frontend mutation and optimistic-lock behavior

- **Current path or object:** feature API repositories, services, factories, and Zustand state under organization, process, objective, risk, regulation, policy, account-group, document, and controls.
- **Current responsibility:** Sends generic bodies without required version or command id and usually treats a mutable entity response as the mutation result.
- **Classification:** REPLACE.
- **Reason it is incompatible:** V2 requires version on mutation, revision-aware response, explicit restore, standardized conflicts, and backend-owned command ordering.
- **Target replacement:** Shared mutation-result handling plus typed feature command repositories and conflict UI.
- **Implementation phase that removes it:** UI foundation followed by each owning vertical slice.

### L65 — Current translation registration gap

- **Current path or object:** `grcpc-ui/src/i18n/i18n.ts` and feature `i18n/fa.*.json` / `i18n/en.*.json` files.
- **Current responsibility:** Registers process/control/document/objective/organization packs while risk/regulation/policy/account-group packs exist but are not registered.
- **Classification:** REMAP.
- **Reason it is incompatible:** V2 needs both Persian and English keys for new scopes/read-model/document-version UX and must remove keys for deleted legacy features.
- **Target replacement:** Register active V2 packs, retain Persian RTL as default, and delete dead Objective/KPI/KRI/workflow keys in the owning UI slice.
- **Implementation phase that removes it:** UI foundation and each feature UI slice.

### L66 — Current route and permission cleanup

- **Current path or object:** `AppRouter.tsx`, feature `routes.tsx` files, `MainLayout.tsx`, and business-permission-gated navigation code.
- **Current responsibility:** Keeps legacy routes visible or reachable after feature data flows change.
- **Classification:** REPLACE.
- **Reason it is incompatible:** No compatibility route, dead permission, dead menu entry, or generic Objective route may remain after its V2 replacement.
- **Target replacement:** V2 route/permission map aligned with final command/read boundaries and resource authorization.
- **Implementation phase that removes it:** Each vertical slice removes its own route/menu/permission residue; final cleanup verifies none remain.

## 8. Explicit out-of-scope and prohibited features

### L67 — KPI UI and backend concept

- **Current path or object:** KPI appears in customer Organization mock-up tabs; source contains no implemented Master Data KPI entity, table, controller, or route.
- **Current responsibility:** Customer-facing placeholder requirement only.
- **Classification:** DEFER_OUT_OF_SCOPE.
- **Reason it is incompatible:** KPI is explicitly not part of Master Data V2.
- **Target replacement:** None in Master Data V2; no database object, backend API, UI feature, i18n key, or permission is created.
- **Implementation phase that removes it:** Organization UI slice removes any visible legacy KPI placeholder/menu reference.

### L68 — KRI UI and backend concept

- **Current path or object:** KRI appears in customer Organization and Risk Category mock-ups; source contains no implemented Master Data KRI entity, table, controller, or route.
- **Current responsibility:** Customer-facing placeholder/template requirement only.
- **Classification:** DEFER_OUT_OF_SCOPE.
- **Reason it is incompatible:** KRI is explicitly not part of Master Data V2.
- **Target replacement:** None in Master Data V2; no database object, backend API, UI feature, i18n key, or permission is created.
- **Implementation phase that removes it:** Risk and Organization UI slices remove visible KRI placeholder/menu references.

### L69 — Risk assessment, likelihood, impact, and score

- **Current path or object:** customer risk/organization mock-ups show analysis-style content; current backend source has no approved result table in Master Data scope.
- **Current responsibility:** Legacy/customer interaction intent outside the approved Master Data boundary.
- **Classification:** DEFER_OUT_OF_SCOPE.
- **Reason it is incompatible:** V2 permits Risk Template definitions and typed coverage, not risk assessment outcomes or scoring.
- **Target replacement:** None in Master Data V2; descriptive Risk Template cause/effect summaries remain only where cataloged.
- **Implementation phase that removes it:** Risk and Organization UI slices omit/remove these controls.

### L70 — Control test results and effectiveness

- **Current path or object:** customer Control/Policy mock-ups and legacy control test fields in entities/controllers.
- **Current responsibility:** Describes testing method/plan/effectiveness-oriented behavior beneath controls.
- **Classification:** DEFER_OUT_OF_SCOPE.
- **Reason it is incompatible:** Test results and control effectiveness are not Master Data V2 functionality.
- **Target replacement:** None in Master Data V2; no test-result or effectiveness table/API/UI is created.
- **Implementation phase that removes it:** Control and Policy UI slices remove/omit the related tabs and fields.

### L71 — Policy approval workflow

- **Current path or object:** customer policy Save/Send for Review/Submit for Approval controls and legacy policy status values such as draft/underReview/pendingApproval/approved.
- **Current responsibility:** Models workflow-like policy review and approval behavior.
- **Classification:** DELETE.
- **Reason it is incompatible:** V2 has immutable Policy Version but explicitly has no Policy approval workflow.
- **Target replacement:** Policy Version creation/supersede/retire commands without workflow tables, queue, tasks, or approval state machine.
- **Implementation phase that removes it:** Central definitions / Policy UI slice.

## 9. Slice-owned removal commitment

Central definitions removes combined entity/table/controller/DTO/repository/UI flows for Process/Subprocess, Risk Category/Risk Template, Regulation hierarchy, Policy hierarchy, generic Objective, and Account Group JSON.

Central Scope removes legacy process assignment and `process_control_assignment` concepts.

Central Coverage removes direct Control–Regulation and remaps requirement/control, risk/control, and account-group/control legacy links.

Local Context removes Organization–Process assignment implementation.

Local Scope/Coverage/Policy Scope removes organization reference, organization-process-risk, and direct local assignment flows.

Document and revision integration removes generic attachment targets, direct final upload, `tempSessionId`, standalone commit, `control_document`, and legacy document UI state.

Each frontend slice removes the route, page tab, component, store, API repository, and i18n keys that only served the replaced backend behavior.

The final full-stack cleanup is a verification pass, not a place to postpone every deletion.
