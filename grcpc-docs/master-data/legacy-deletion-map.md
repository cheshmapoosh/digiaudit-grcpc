# Master Data V2 Legacy Deletion Map

## Purpose and reading rule

This is an actionable inventory of current Legacy Master Data and Document implementation evidence.

It maps each Legacy responsibility to an actual approved Master Data V2 entity or use case.

The Final Logical Model controls the target structure.

Authoritative source files for targets: `GRC_Master_Data_Reference_Conceptual_Model_FA.docx`, `GRC_Master_Data_Logical_Model_Final_FA.docx`, and `GRC_Master_Data_Physical_Design_Reference_FA.docx`.

The Physical Design Reference controls the final Oracle/MinIO behavior.

Current source paths identify what a later implementation slice must replace or remove; they do not authorize preserving the old model.

Every item classified `REPLACE` or `DELETE` is owned by a named vertical slice.

No item is deferred merely to avoid cleanup.

## Classification legend

| Classification | Meaning in this map |
| --- | --- |
| `KEEP` | Preserve the capability because it is compatible; adjust only as a normal dependency of the owning slice. |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain the useful visual or interaction pattern, but replace its endpoint, DTO, state, and persistence flow. |
| `REMAP` | Preserve a narrow responsibility, re-pointed to an exact approved entity or typed use case. |
| `REPLACE` | Replace the Legacy implementation entirely with the approved V2 structure/use case in the listed slice. |
| `DELETE` | Remove the Legacy item because it has no approved V2 counterpart. |
| `DEFER_OUT_OF_SCOPE` | Do not implement it in Master Data V2; it belongs to a separately governed module or does not exist in current Master Data source. |

## Vertical-slice ownership key

| Phase | Later vertical slice | Accountability |
| --- | --- | --- |
| P2 | Foundation and Day-Zero schema | Final Oracle/Flyway conventions, common lifecycle, UUID mapping, revision guard. |
| P3 | Organization and Process/Subprocess | Structural trees and Local Context entry point. |
| P4 | Central catalog | All Central definitions, policy/version, and typed classification foundations. |
| P5 | Central relation | Central Scope, Central Policy Scope, and Central Coverage. |
| P6 | Local relation | Local Context, Local Scope, Local Coverage, and Local Policy Scope. |
| P7 | Document and Revision | Retention, document/version/hold/link, temporary upload, business revision integration. |
| P8 | Read models and UI integration | Effective/Diagnostic/Roll-up/Policy Applicability and V2 data-flow UI wiring. |
| P9 | Slice-close cleanup | Remove unused routes, permissions, DTOs, entities, services, stores, and i18n keys left by the owning slice. |

## A. Flyway and current physical tables

All entries in this section are Legacy-removal decisions.

| Classification | Current migration/table/path | Current responsibility | Incompatibility with V2 | Approved target replacement | Removal phase |
| --- | --- | --- | --- | --- | --- |
| `REMAP` | `V1003__create_organization_table.sql` / `organization` | Current organization definition/tree | Organization remains approved, but must adopt Day-Zero RAW UUID/lifecycle/validity/revision contract. | Approved `organization`. | P2–P3 |
| `REPLACE` | `V1080__create_master_data_security_document_tables.sql` / `process_node` | Combined Process/Subprocess table with node type | Final model uses separate `central_process` and `central_subprocess`; only Subprocess scopes/coverage. | `central_process`, `central_subprocess`. | P3 |
| `REPLACE` | `V1080` / `control` | Current central-like control definition | Current flow is tied to generic assignments and legacy tabs. | `central_control` plus typed scopes/coverage in P5/P6. | P4 |
| `DELETE` | `V1080` / `process_control_assignment` | Older process-control joining table | Logical Model identifies it as a Legacy orphan; core V2 forbids generic assignments. | None; typed Central/Local control scope and coverage use cases. | P5 |
| `REPLACE` | `V1080` / `risk_node` | Combined Risk Category and Risk Template | Final model separates hierarchy category from scopeable template. | `central_risk_category`, `central_risk_template`. | P4 |
| `DELETE` | `V1080` / `objective_node` | Generic objective hierarchy | V2 recognizes Control Objective only; generic objective conflicts with approved vocabulary. | No generic target; compatible control-purpose fields are recreated only as `central_control_objective`. | P4 |
| `REPLACE` | `V1004__create_regulation_table.sql`, `V1080` / `regulation` | Combined Regulation Group, Regulation, Requirement persistence | Final model requires three typed tables and Requirement as atomic endpoint. | `central_regulation_group`, `central_regulation`, `central_regulation_requirement`. | P4 |
| `REPLACE` | `V1080` / `policy_node` | Combined Policy Group/Policy with mutable version/workflow behavior | Final model separates group, policy identity, and immutable published Policy Version; workflow is excluded. | `central_policy_group`, `central_policy`, `central_policy_version`. | P4 |
| `REPLACE` | `V1080` / `account_group` | Account Group with JSON relation payloads | Final model retains hierarchy but eliminates undocumented multi-value JSON relation modeling. | `central_account_group`, plus exact Control/Objective classifications. | P4–P5 |
| `REPLACE` | `V1080` / `organization_process_assignment` | Organization to arbitrary legacy Process Node | Local data must be Organization + exact Subprocess, not generic process assignment. | `local_organization_subprocess_scope`. | P3–P6 |
| `REPLACE` | `V1140__create_organization_process_risk_assignment.sql` / `organization_process_risk_assignment` | Organization + Process + Risk assignment | Generic relation lacks approved typed scope/context/coverage invariants. | Typed Local Risk Scope and typed Local Coverage under `local_organization_subprocess_scope`. | P6 |
| `DELETE` | `V1150__create_organization_reference_assignment.sql` / `organization_reference_assignment` | Generic Organization-to-Control/Regulation/Policy relationship | Generic targets are prohibited in core local relations. | None; each approved relation becomes a typed Local Scope, Local Coverage, or Local Policy Scope command. | P6 |
| `DELETE` | `V1153__create_process_objective_assignment.sql` / `process_objective_assignment` | Generic Process-to-Objective assignment | Generic objectives and Process (rather than Subprocess) attachment are invalid. | `central_subprocess_control_objective_scope` where the actual meaning is a Control Objective scope. | P5 |
| `DELETE` | `V1154__create_process_account_group_assignment.sql` / `process_account_group_assignment` | Process-to-Account Group assignment | No Subprocess/Process Account Group Scope exists in final model. | None; direct Control/Objective classification only when applicable. | P5 |
| `REPLACE` | `V1155__create_control_assignment.sql` / `control_assignment` | Control assignment to a process context | V2 needs Central/Local typed Control Scope, not a generic assignment. | `central_subprocess_control_scope` and `local_subprocess_control_scope`. | P5–P6 |
| `DELETE` | `V1156__create_control_assignment_tabs.sql` / `control_step` | Control execution steps | Control steps are not an approved Master Data entity. | None. | P5 |
| `DELETE` | `V1156` / `control_performance_plan` | Control performance planning | Monitoring/performance planning is excluded. | None. | P5 |
| `DELETE` | `V1156` / `control_regulation_link` | Direct Control-to-Regulation link | Direct relation is explicitly forbidden. | None; Requirement–Control Coverage is the only compliance connection. | P5 |
| `REPLACE` | `V1156` / `control_requirement_link` | Current Control-to-Requirement link | It is not scoped/context-bound and lacks typed Coverage invariants. | `central_subprocess_requirement_control_coverage` and `local_subprocess_requirement_control_coverage`. | P5–P6 |
| `REPLACE` | `V1156` / `control_risk_link` | Current Control-to-Risk link | It lacks Central/Local typed Scope endpoints and context guarantees. | `central_subprocess_risk_control_coverage` and `local_subprocess_risk_control_coverage`. | P5–P6 |
| `REPLACE` | `V1156` / `control_account_group_link` | Control-to-Account Group link | Final relation is Central classification with final name/constraints. | `central_control_account_group`. | P5 |
| `DELETE` | `V1156` / `control_document` | Control-assignment-specific document relation | V2 shares Document Version links across approved targets. | `document`, `document_version`, `document_link`. | P7 |
| `DELETE` | `V1157__create_process_risk_assignment.sql` / `process_risk_assignment` | Process-to-Risk assignment | Scope must be Subprocess-to-Risk Template and typed. | None; use Central/Local Risk Scope when business meaning exists. | P5–P6 |
| `DELETE` | `V1158__create_process_regulation_assignment.sql` / `process_regulation_assignment` | Process-to-Regulation assignment | Regulation itself is not a Scope endpoint; Requirement is. | None; use Requirement Scope/Coverage where applicable. | P5 |
| `REPLACE` | `V1159__create_document_temp_upload.sql` / `document_temp_upload` | Session-oriented temporary upload tracking | Final name survives, but final fields, status, one-time consumption, object-key, checksum, and authorization rules differ. | Approved technical `document_temp_upload`. | P7 |
| `DELETE` | `V1160__create_objective_organization_assignment.sql`, `V1161__extend_objective_organization_assignment.sql` / `objective_organization_assignment` | Generic Objective-to-Organization relation | Generic objective is removed and local application requires Organization + Subprocess context. | None; do not map to a generic organization relation. | P4–P6 |
| `DELETE` | `V1080` / `document_attachment` | File and generic attachment target in one table | Final document identity, immutable version, hold, retention, and controlled link are separate. | `document_retention_policy`, `document`, `document_version`, `document_hold`, `document_link`. | P7 |

### Flyway rewrite guard

P2 replaces the Master Data and Document Day-Zero baseline only when an authorized implementation task begins.

P2 does not add a migration chain that drops or alters a deployed Legacy database.

P2 does not copy or transform Legacy data.

P2 does not create compatibility views for any table in this inventory.

P2 leaves unrelated module migrations outside the V2 rewrite.

## B. Backend entities, enums, repositories, services, controllers, DTOs, and mappers

All rows below name current source evidence and the slice that must remove or replace it.

| Classification | Current path or object | Current responsibility | Incompatibility | Target replacement/use case | Removal phase |
| --- | --- | --- | --- | --- | --- |
| `REPLACE` | `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/masterdata/process/domain/entity/ProcessNodeEntity.java` | Combined Process/Subprocess entity | Conflicts with two approved final tables. | Separate `central_process` and `central_subprocess` entities/repositories/commands. | P3 |
| `DELETE` | `modules/masterdata/process/**/ProcessNodeType*` | Distinguishes Process/Subprocess inside one table | Final type boundary is structural, not enum-only. | None after separate entities are live. | P3 |
| `REPLACE` | `modules/masterdata/process/**/Process*Repository*`, `Process*Service*`, `Process*Controller*` | CRUD and generic assignment flow for process nodes | Scope/Coverage require exact typed Subprocess use cases. | Process-tree query plus typed scope/coverage command services. | P3–P5 |
| `REPLACE` | `modules/masterdata/control/**/ControlEntity.java` | Legacy control persistence | Must lose generic assignment and prohibited direct relation behavior. | `central_control` entity and Central/Local scope commands. | P4–P6 |
| `DELETE` | `modules/masterdata/control/**/ProcessControlAssignment*` | Legacy process-control mapping | Generic assignment has no approved V2 target. | None. | P5 |
| `REPLACE` | `modules/masterdata/control/**/ControlAssignment*` | Legacy control local/context abstraction | Must split typed Control Scope and typed Coverage use cases. | Central/Local Control Scope plus coverage commands. | P5–P6 |
| `DELETE` | `modules/masterdata/control/**/ControlStep*` | Execution-step tab persistence/API | Not Master Data V2. | None. | P5 |
| `DELETE` | `modules/masterdata/control/**/ControlPerformancePlan*` | Performance plan persistence/API | Monitoring/performance planning excluded. | None. | P5 |
| `DELETE` | `modules/masterdata/control/**/ControlRegulationLink*` | Direct regulation linkage | Explicitly prohibited. | None. | P5 |
| `REPLACE` | `modules/masterdata/control/**/ControlRequirementLink*` | Requirement link tab API | Must become typed Requirement–Control Coverage with Scope/context validation. | Central/Local Requirement–Control Coverage commands. | P5–P6 |
| `REPLACE` | `modules/masterdata/control/**/ControlRiskLink*` | Risk link tab API | Must become typed Risk–Control Coverage. | Central/Local Risk–Control Coverage commands. | P5–P6 |
| `REPLACE` | `modules/masterdata/control/**/ControlAccountGroupLink*` | Control Account Group association | Final classification has exact table/use case. | `central_control_account_group`. | P5 |
| `DELETE` | `modules/masterdata/control/**/ControlDocument*` | Control-specific document association | Document links must be shared and version-specific. | `document_link` use case. | P7 |
| `REPLACE` | `modules/masterdata/objective/**` | Generic objective entities, enums, repositories, services, controllers, DTOs, mappers | Generic Objective conflicts with Control Objective-only model. | New Control Objective capability based on `central_control_objective`; no generic tree. | P4 |
| `REPLACE` | `modules/masterdata/risk/**` | Combined category/template tree and APIs | Must split risk category from scopeable risk template. | `central_risk_category`, `central_risk_template`, typed scope APIs. | P4–P5 |
| `REPLACE` | `modules/regulation/**` | Combined regulation hierarchy and APIs | Requires Group → Regulation → Requirement typed persistence. | Three approved regulation tables and Requirement scope/coverage use cases. | P4–P5 |
| `REPLACE` | `modules/masterdata/policy/**` | Combined policy tree, mutable content/status/workflow-oriented APIs | Requires Group → Policy → Policy Version and no approval workflow persistence. | Approved policy/version tables and typed policy-scope commands. | P4–P6 |
| `REPLACE` | `modules/masterdata/accountgroup/**` | Account Group JSON relationship handling | Final relationship structures are typed or absent. | `central_account_group`, `central_control_account_group`, `central_control_objective_account_group`. | P4–P5 |
| `REMAP` | `modules/organization/**/Organization*` | Organization entity, API, tree service, repository | Structural Organization remains but needs V2 lifecycle/RAW UUID/revision boundary. | Approved `organization` commands/queries. | P2–P3 |
| `DELETE` | `modules/organization/**/OrganizationProcessAssignment*` | Generic Organization-process assignment entity/service/controller/repository | Local parent is exact Organization+Subprocess Scope. | None after `local_organization_subprocess_scope` is live. | P6 |
| `DELETE` | `modules/organization/**/OrganizationProcessRiskAssignment*` | Generic organization/process/risk relationship | Local risk applicability must use typed Local Scope/Coverage. | None. | P6 |
| `DELETE` | `modules/organization/**/OrganizationReferenceAssignment*` | Generic reference-type assignment | Generic local relations are prohibited. | None. | P6 |
| `DELETE` | `modules/organization/**/ObjectiveOrganizationAssignment*` | Generic objective-to-organization relationship | Generic objective has no V2 counterpart. | None. | P4–P6 |
| `REPLACE` | `modules/document/domain/entity/DocumentAttachmentEntity.java` and repository/mapper | Generic attachment metadata and target | Lacks Document/Version/Hold/Retention/controlled link separation. | V2 Document aggregate persistence. | P7 |
| `REPLACE` | `modules/document/domain/entity/DocumentTempUploadEntity.java` and repository | Temporary upload entity | Keep table name but replace session/target/consume semantics with Physical Design. | V2 `document_temp_upload` entity. | P7 |
| `REPLACE` | `modules/document/application/DocumentAttachmentService.java` | Direct final upload, generic target binding, commit flow, scheduled cleanup | Violates final command-owned upload/version/link and no scheduler infrastructure. | Document command service with one-time `tempUploadId` consumption and MinIO lifecycle cleanup. | P7 |
| `REPLACE` | `modules/document/api/DocumentAttachmentController.java` | `/api/documents` direct final upload and generic attachment endpoints | Final API is use-case-oriented, secure, and version-specific. | Typed Document/temporary-upload endpoints. | P7 |
| `KEEP` | `modules/document/config/MinioProperties.java`, `DocumentStorageConfig.java` | MinIO client/configuration boundary | MinIO remains the approved object store. | Keep configuration capability; change only needed bucket/key conventions in P7. | P7 |
| `KEEP` | `modules/securityacl/**/ResourceAuthorizationService*` | Resource authorization capability | V2 still needs permission/resource authorization. | Keep capability; remap resource/action vocabulary per slice. | P2–P9 |
| `REPLACE` | `V1070__seed_master_data_business_permissions.sql`, `V1090__seed_regulation_and_organization_business_permissions.sql` | Legacy Master Data permission seeds | Names/actions map to old generic features. | Typed V2 permissions and separate Diagnostic read permission. | P2–P9 |
| `REPLACE` | DTOs/mappers under `modules/masterdata/**`, `modules/organization/**`, `modules/document/**` | Table-oriented generic request/response mapping | Final API requires command/read/effective/diagnostic separation. | Typed command DTOs, read DTOs, effective DTOs, diagnostic DTOs. | P3–P8 |
| `DELETE` | Legacy generic relation enums in process/control/organization modules | `targetType`, `referenceType`, assignment/relation kind routing | Core Scope/Coverage cannot use generic relation polymorphism. | None; use fixed endpoint-specific command DTOs. | P5–P6 |
| `REMAP` | `grcpc-app/src/main/resources/application.yml` UUID preference | Current UUID JDBC preference is `VARCHAR` | Physical Design requires Oracle `RAW(16)`. | Oracle UUID mapping in P2. | P2 |

### Backend cleanup requirements

P3 removes the combined Process/Subprocess entity, repository, mapper, service, controller, DTOs, and permissions it replaces.

P4 removes generic Objective and combined Risk/Regulation/Policy source paths as their separate Central catalog capabilities go live.

P5 removes each generic Central relationship endpoint in the same slice that introduces its typed Scope/Coverage equivalent.

P6 removes each generic Organization assignment and local relation in the same slice that introduces Local Context and typed Local relations.

P7 removes generic attachment, direct-final-upload, session-oriented upload commit, control-document, and scheduled temporary-upload cleanup code.

P8 provides no mutable read-model replacement; it adds read-only query services only.

P9 verifies that no old entity, repository, service, mapper, controller, DTO, permission, or endpoint remains reachable.

## C. Current routes, pages, components, stores, API repositories, and i18n

The UI rows use the same classification rules, but `KEEP_VISUAL_REPLACE_DATA_FLOW` is intentionally common because the approved model preserves useful user experience patterns.

| Classification | Current path or object | Current responsibility | Incompatibility | Target replacement/use case | Removal phase |
| --- | --- | --- | --- | --- | --- |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `grcpc-ui/src/app/router/AppRouter.tsx` | Registers Master Data routes | Route registration is useful, but old routes point to Legacy generic APIs. | Register V2 pages/routes per approved feature; remove dead old entries. | P3–P9 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `src/features/master-data/pages/MasterDataFeaturePage.tsx` | Master Data hub tiles | Hub omits V2 Scope/Coverage/Context/Read Model capabilities and includes generic objective emphasis. | Rebuild tile/navigation vocabulary around approved features. | P8 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `features/organization/pages/OrganizationsFclShellPage.tsx` and `OrganizationObjectPage.tsx` | Organization FCL/tree/object page | Existing tabs bind generic assignments. | Keep layout; bind Local Organization–Subprocess Scope and read-only roll-up/diagnostic data. | P3, P6, P8 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `features/process/pages/ProcessesFclShellPage.tsx`, `components/ProcessTree.tsx`, `components/ProcessControlTree.tsx`, `utils/process.tree.ts` | Combined process/subprocess visual tree | Current data is a combined process node persistence model. | Keep combined display DTO; use separate `central_process`/`central_subprocess`. | P3 |
| `DELETE` | Process generic assignment tabs: `ProcessControlsTab.tsx`, `ProcessRisksTab.tsx`, `ProcessRegulationsTab.tsx`, `ProcessObjectivesTab.tsx`, `ProcessAccountGroupsTab.tsx` | Legacy process relationship editing | These use generic assignments/raw relations and Process-level endpoints. | Remove as written; replace only with typed Central Scope/Coverage/Policy Scope screens. | P5 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `features/control/pages/ControlObjectPage.tsx`, `state/control.state.ts`, `service/control.api.repo.ts` | Control object page and state/API adapter | Current tabs include forbidden and operational relationships. | Keep compatible Object Page form/list/dialog patterns; use Central/Local scope/coverage APIs. | P4–P6 |
| `DELETE` | `features/control/components/tabs/*ControlStep*` | Control step UI | No V2 Master Data counterpart. | None. | P5 |
| `DELETE` | `features/control/components/tabs/*PerformancePlan*` | Control performance-plan UI | Monitoring/performance planning excluded. | None. | P5 |
| `DELETE` | `features/control/components/tabs/*Regulation*` when it calls direct regulation link API | Direct Control–Regulation relationship UI | Final relation must be Requirement–Control Coverage. | Remove direct link flow. | P5 |
| `REMAP` | Control requirements/risk/account-group tabs | Existing relationship presentation | Semantics must be typed, scoped, and context-sensitive. | Requirement–Control/Risk–Control Coverage and Central classification views. | P5–P6 |
| `REPLACE` | `features/objective/**` | Generic objective route, FCL, pages, stores, API repo, i18n | Generic Objective conflicts with Control Objective-only domain. | New/renamed Control Objective capability. | P4 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `features/risk/pages/RisksFclShellPage.tsx`, risk tree/state/API repo | Risk hierarchy UX | Current combined category/template data and customer tabs include KRI/assessment concepts. | Keep visual hierarchy/search; use separate category/template data, no KPI/KRI/results. | P4 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `features/regulation/pages/RegulationsFclShellPage.tsx`, `RegulationRequirementsSummaryTab.tsx` | Regulation hierarchy/list UI | Current API uses combined structure and direct control linkage. | Keep tree/requirements visualization; bind Group/Regulation/Requirement and typed coverage. | P4–P5 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `features/policy/pages/PoliciesFclShellPage.tsx`, policy tree/state/API repo | Policy FCL/tree/version UI | Current model merges hierarchy/version and workflow-oriented actions. | Keep visual patterns; bind Policy Group/Policy/immutable Policy Version and scopes. | P4–P6 |
| `DELETE` | Policy approval/review UI actions and corresponding i18n/API calls | Customer/Legacy workflow interaction | Policy approval workflow is outside Master Data V2. | None in this domain. | P4 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `features/account-group/pages/AccountGroupsFclShellPage.tsx`, tree/state/API repo | Account Group hierarchy UX | Current relation values derive from JSON or absent V2 fields. | Keep tree/search/value-help; only surface approved hierarchy/classifications. | P4–P5 |
| `REPLACE` | `features/document/infra/document.api.repo.ts` | Generic attachment upload/commit/download calls | Must use temp upload, final business command, document version/link, secure download. | V2 document API repository. | P7 |
| `REPLACE` | `features/document/state/document-attachment.state.ts` | Generic attachment and `tempSessionId` client state | Final flow uses `tempUploadId` one-time consumption and no generic target commit. | V2 temporary-upload/document-version state. | P7 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `features/document/components/DocumentAttachmentsManager.tsx` | Reusable file list/upload/download presentation | Existing data flow is generic attachment/direct upload. | Reuse visual progress/list/download presentation with V2 version-aware state. | P7 |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | `DocumentAttachmentsTab.tsx`, `DocumentAttachmentsPanel.tsx` | Reusable attachment tabs/panels | Must stop binding raw `targetType`/`targetId` and final uploads. | Version-aware Document Link panel. | P7 |
| `DELETE` | UI use of `tempSessionId` | Client-side session correlation for commit | Physical Design approves `tempUploadId`, not session commit protocol. | None; final command consumes `tempUploadId`. | P7 |
| `DELETE` | Direct `POST /api/documents` final-upload UI wiring | Direct permanent Document upload | Final document creation occurs inside a typed business command after temporary staging. | None; temporary upload first. | P7 |
| `KEEP` | Feature i18n folders under `features/{organization,process,control,objective,risk,regulation,policy,account-group,document}/i18n/{fa,en}.*.json` | Persian/English UI text resources | Resource mechanism remains compatible. | Keep Persian/RTL/i18n pattern; remove or replace stale keys per owning slice. | P3–P9 |
| `KEEP` | FCL, List Report, Object Page, tree, search, selection, expanded-state, and RTL application patterns | Usable interaction conventions | None when decoupled from Legacy data model. | Reuse visual patterns only. | P3–P8 |

### UI cleanup requirements

Every page or dialog that previously edited a generic assignment must move to a typed V2 command or be deleted in P5/P6.

Every customer-compatible display that joins Process/Subprocess may remain a combined tree only in its read DTO.

Every UI mutation result must surface the returned entity ID, revision ID, and version without asking the browser to construct Revision Content.

Every Document presentation must show version-specific metadata and secure download behavior.

Every removed route must be removed from the router and navigation, not merely hidden.

Every removed state/API repository import must be deleted with its page/component caller.

Every removed UI capability must have its unused Persian and English i18n keys removed in the owning slice.

## D. Explicit feature-by-feature resolutions

### Generic attachment targets and `document_attachment`

Classification: `REPLACE`.

Current responsibility: one generic record combines file metadata and arbitrary target binding.

Reason: V2 distinguishes stable document identity, immutable version, retention policy, hold, and controlled link to an exact version.

Target: `document_retention_policy`, `document`, `document_version`, `document_hold`, and `document_link`.

Owner: P7 Document and Revision.

### Direct final upload and `tempSessionId`

Classification: `DELETE` for the direct/session protocol and `REPLACE` for temporary-upload implementation.

Current responsibility: a browser can upload final file content directly, then commit by session-oriented state.

Reason: the approved flow is temporary MinIO object, Backend validation, final Business Command, immutable Document Version, and controlled link.

Target: `document_temp_upload` using `tempUploadId` and one-time consume status.

Owner: P7 Document and Revision.

### Control document relation

Classification: `DELETE`.

Current responsibility: a control-assignment-specific document table/tab.

Reason: it duplicates shared Document behavior and binds to a Legacy assignment.

Target: version-specific `document_link` to an approved V2 target.

Owner: P7 Document and Revision.

### Process and organization generic assignments

Classification: `DELETE` or `REPLACE` as listed in sections A/B.

Current responsibility: generic Organization-to-Process, Organization-to-reference, Process-to-risk, Process-to-regulation, Process-to-objective, and Process-to-account-group mappings.

Reason: final vocabulary is typed Scope/Coverage/Policy Scope under exact Subprocess and Local Context.

Target: exact Central/Local Scope, Coverage, and Policy Scope tables only where a final relationship exists.

Owner: P5 Central relation and P6 Local relation.

### Direct control relations

Classification: `REPLACE` for Requirement/Risk/Account Group where approved; `DELETE` for Regulation and operational tabs.

Current responsibility: direct Control-to-Risk, Control-to-Requirement, Control-to-Regulation, Account Group, steps, and performance plan tabs.

Reason: V2 requires typed, context-bound Coverage or direct classification; direct Control–Regulation and operational data are forbidden.

Target: the exact `central_subprocess_*_coverage`, `local_subprocess_*_coverage`, and `central_control_account_group` structures.

Owner: P5/P6.

### Combined persistence structures

Classification: `REPLACE`.

Current responsibility: combined Process/Subprocess, Risk Category/Risk Template, Policy hierarchy/version/workflow, and Regulation hierarchy storage.

Reason: the Final Logical Model explicitly splits each into typed tables and typed parent FKs.

Target: the exact Central definition tables in [table-catalog.md](table-catalog.md).

Owner: P3/P4.

### Generic Objective

Classification: `DELETE` plus narrowly `REMAP` compatible control-purpose content.

Current responsibility: a generic objective node and organization relation.

Reason: generic Objective is not approved; only Control Objective exists in Master Data V2.

Target: `central_control_objective`, typed scopes, and typed Coverage when the business intent is genuinely a Control Objective.

Owner: P4/P5/P6.

### Account Group JSON relationships

Classification: `REPLACE` and `DELETE` for unsupported payloads.

Current responsibility: hierarchy plus JSON-based assertions, account ranges, and related multi-value information.

Reason: the Final Logical Model permits hierarchy and two direct classifications only; it does not approve assertion/range tables or JSON relation payloads.

Target: `central_account_group`, `central_control_account_group`, and `central_control_objective_account_group`.

Owner: P4/P5.

### KPI, KRI, assessment, test, workflow, and monitoring

Classification: `DEFER_OUT_OF_SCOPE`.

Current responsibility: customer documents request or depict some of these concepts; no approved Master Data V2 entity/use case exists for them.

Reason: the Conceptual and Physical documents place them outside Master Data.

Target: none in this redesign.

Owner: no Master Data V2 implementation slice; separate module governance is required before any future work.

## E. Final Legacy cleanup gate

P9 runs only after the owning P3–P8 slices have removed their replacements.

P9 must find no live Legacy Master Data route.

P9 must find no live Legacy Master Data permission.

P9 must find no dead DTO, mapper, repository, service, controller, entity, store, API repository, component, page, or i18n key.

P9 must find no direct Control–Regulation endpoint.

P9 must find no generic assignment endpoint for Scope/Coverage behavior.

P9 must find no direct-final-upload or session-oriented temporary-upload flow.

P9 must find no generic attachment target data flow.

P9 must find no generic Objective capability.

P9 must find no KPI/KRI, assessment, control-test, workflow, monitoring, job, scheduler, cache, outbox, or Audit table added to Master Data V2.

This planning task performs none of those application changes; it records their exact owning slice.
