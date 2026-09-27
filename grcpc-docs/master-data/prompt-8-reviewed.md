# Prompt 8 — Complete Local Relationships and Organization Workflows

This is a complete replacement for the original Prompt 8, not an addendum. Implement the contract below. The review report is explanatory and is not required as an implementation input.

- Repository: `cheshmapoosh/digiaudit-grcpc`
- Branch: `feature/master-data-v2-greenfield`
- Baseline HEAD: `a83965fb6cefe41e069057f175e2f329a4a1b009`
- Original implementation model preference: GPT-6 Sol / High. Model selection is an execution setting, not an instruction that changes the running model.
- Requested review configuration: GPT-6 Astra / Extra High (`gpt-6-astra`, `xhigh`). This line does not certify that a review was executed with that configuration.

## 1. Execution and precedence

Implement Backend and UI together. Perform source inspection and ordinary engineering verification, but do not choose new business behavior. The tables, transitions, permission combinations, validation rules, routes, ownership, and exclusions below are fixed for this task.

Before editing, check branch, HEAD, and working-tree changes. Do not checkout, reset, discard, or overwrite user work. If HEAD differs, inspect the intervening commits. Stop before implementation if they change Local schema, runtime registration, Organization, Central definitions/relations, Policy, Revision, Documents, authorization, or affected UI contracts. Report exact incompatible files and requirements. Unrelated commits do not require redesign. A dirty file that overlaps this delivery requires reconciliation without discarding its changes.

Read applicable `AGENTS.md`, `UI5_COMPONENT_GUIDE.md`, and these repository references:

- `grcpc-docs/master-data/implementation-contract.md`
- `grcpc-docs/master-data/table-catalog.md`
- `grcpc-docs/master-data/api-conventions.md`
- `grcpc-docs/master-data/area-authorization.md`
- `grcpc-docs/master-data/hierarchy-guard-row-contract.md`
- `grcpc-docs/architecture/decisions/ADR-0001-database-hierarchy-guard-row.md`

For this Local delivery, this prompt explicitly overrides older instructions that prescribe implicit reactivation/restore on Create, keep Organization relationship tabs disabled, or require test execution. These overrides do not change existing Central commands. The Central Coverage independent-validity rule and the Organization/Process/Subprocess aggregate Save contract remain in force.

Do not add, remove, rename, or alter database tables, columns, constraints, indexes, sequences, seeded permissions, or Guard rows. Do not create, modify, or execute a new migration. The schema contract is V1164 as subsequently modified by V1183. Do not map `policy_version_id` in a Local Policy entity; the current column is `policy_id`.

Do not create, edit, compile, or run tests. Use `-Dmaven.test.skip=true` for Maven. Do not commit, push, create a PR, install new dependencies, rewrite existing features, change generated `dist`/packaged static assets, or run mutating smoke/concurrency scripts. This task authorizes implementation and the checks in section 14.

If a requirement cannot be expressed using this existing schema, report the exact requirement and schema mismatch. Do not invent a schema change or silently reduce acceptance scope.

## 2. Business ownership and fixed boundaries

Assigning a Central Subprocess to an Organization creates one independent Local Organization–Subprocess Context. Assigning a Central Control to an Organization for an explicitly selected Central Subprocess creates one Local Control Scope (the Local Control Object) in that Context. A bare Organization–Control relation is forbidden.

Every Local row retains its own stable UUID, stored lifecycle, validity, audit data, and version. Every Local definition reference is to an existing Central definition; there is no fully local definition catalog. Source type is immutable. Central changes never synchronize, convert, recreate, or rewrite Local rows.

All Local mutations create one LOCAL Business Revision for exactly one Organization. They do not increment Organization, Subprocess, Control, or another Central entity's version and do not use a Central aggregate Save endpoint.

Existing Organization General Information and `ORG` Documents continue to use their current CENTRAL aggregate Save. Local row editors save independently. Local Documents use existing standalone Document transactions and create no Business Revision Content.

Do not implement assessments, control testing, execution evidence, findings, scoring, compliance/audit workflows, Effective/Diagnostic/Roll-up projections, or Policy Applicability. Do not activate the Central Risk Template assessment tab or Central Control direct Regulations tab. Do not calculate precedence for Central Policy–Organization versus Local Policy decisions.

The project owner explicitly selected preservation of existing Central dependency behavior: do not weaken existing Organization/Central deletion checks. Some existing queries count DELETED Local rows too; keep that behavior. Add the Local dependency checks specified below without replacing the existing Central checks.

## 3. Persistence registry and runtime integration

Create typed code under `modules/masterdata/local`, with explicit `api`, `application`, `domain/entity`, `domain/repository`, and mapping classes. Provide concrete types per family; do not introduce a generic relation/CRUD framework, discriminator-driven repository, polymorphic command payload, or runtime table selector. Small date/permission/normalization helpers are allowed.

All 13 entities must end in `Entity` and be registered explicitly in `runtime/GrcpcPersistenceConfiguration.java` / `PersistenceManagedTypes`, including any new mapped superclass or JPA converter actually used. Merely adding `@Entity` does not register it in this application. Do not broaden entity scans or weaken `ddl-auto=validate`. Preserve `LegacyRuntimeQuarantineTypeFilter` and existing managed types; no legacy assignment class is a Local implementation.

Use the existing Central Scope entity mapping pattern: UUID `RAW(16)` using `@JdbcTypeCode(SqlTypes.BINARY)`, explicit physical column names, `LocalDate` validity, `Instant` audit timestamps, lifecycle converter, and `@Version long version`. Use scalar typed FK IDs, immutable identity columns, no cascade persistence/removal, and explicit soft-delete methods. Do not inherit extra definition columns such as code/title/description from `CentralDefinitionEntity` into Local tables.

All rows have the existing common columns `id`, `status`, `valid_from`, `valid_to`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by`, `version`. Match V1164/V1183 constraints exactly. `DELETED` requires both deleted audit fields; other statuses require them null. Audit actor/time come from the existing authenticated actor provider and revision clock. New rows start at version 0; existing-row commands flush before returning the resulting version.

| Table | Identity / unique business key | Additional fields | Existing Revision / Document wire code |
| --- | --- | --- | --- |
| `local_organization_subprocess_scope` | `organization_id`, `subprocess_id` | `context_note` | `LOCAL_CONTEXT` |
| `local_subprocess_control_scope` | `organization_subprocess_scope_id`, `control_id` | `central_control_scope_id`, `source_type`, `actual_owner_id`, `frequency_code`, `execution_method_code`, `test_method_code`, `local_context_note` | `LOCAL_CONTROL_SCOPE` |
| `local_subprocess_risk_scope` | Context FK, `risk_template_id` | `central_risk_scope_id`, `source_type` | `LOCAL_RISK_SCOPE` |
| `local_subprocess_control_objective_scope` | Context FK, `control_objective_id` | `central_control_objective_scope_id`, `source_type` | `LOCAL_OBJECTIVE_SCOPE` |
| `local_subprocess_requirement_scope` | Context FK, `requirement_id` | `central_requirement_scope_id`, `source_type` | `LOCAL_REQUIREMENT_SCOPE` |
| `local_subprocess_risk_control_coverage` | Context FK, `local_risk_scope_id`, `local_control_scope_id` | `central_risk_control_coverage_id`, `source_type`, `coverage_note` | `LOCAL_RISK_CONTROL_COV` |
| `local_subprocess_risk_control_objective_coverage` | Context FK, `local_risk_scope_id`, `local_control_objective_scope_id` | `central_risk_control_objective_coverage_id`, `source_type`, `coverage_note` | `LOCAL_RISK_OBJECTIVE_COV` |
| `local_subprocess_control_control_objective_coverage` | Context FK, `local_control_scope_id`, `local_control_objective_scope_id` | `central_control_control_objective_coverage_id`, `source_type`, `coverage_note` | `LOCAL_CONTROL_OBJECTIVE_COV` |
| `local_subprocess_requirement_control_coverage` | Context FK, `local_requirement_scope_id`, `local_control_scope_id` | `central_requirement_control_coverage_id`, `source_type`, `coverage_note` | `LOCAL_REQUIREMENT_CONTROL_COV` |
| `local_policy_organization_scope` | `organization_id`, `policy_id` | `scope_action`, `propagation_mode` | `LOCAL_POLICY_ORG` |
| `local_policy_subprocess_scope` | Context FK, `policy_id` | `scope_action` | `LOCAL_POLICY_SUBPROCESS` |
| `local_policy_control_scope` | `local_control_scope_id`, `policy_id` | `scope_action` | `LOCAL_POLICY_CONTROL` |
| `local_policy_requirement_scope` | `local_requirement_scope_id`, `policy_id` | `scope_action` | `LOCAL_POLICY_REQUIREMENT` |

Here “Context FK” always means `organization_subprocess_scope_id`, not a new column. Use the corresponding existing long enum constant in `RevisionEntityType` and `DocumentLinkTargetType`; the last column is its wire/storage value, not a new enum name.

Context and Policy rows have no `source_type`. Policy rows reference `central_policy.id`, not Policy Version. Coverage stores no redundant Subprocess ID. Its composite FKs require both endpoint Local Scopes to belong to its exact Context. Requirement means `central_regulation_requirement`, never Regulation or Group.

Notes have a maximum of 1000 characters. The three execution codes have the existing 64-byte limit. UUIDs, enums, dates, and lengths must be validated before persistence; expose no raw Oracle constraint errors.

## 4. HTTP contract

All new routes below are under `/api/master-data/local`. Do not change existing Central route signatures.

### 4.1 Common route and payload rules

For every collection base in the table below, implement:

- `GET <base>`: paged list.
- `GET <base>/{id}`: typed detail, including a DELETED row for explicit restore.
- `POST <base>`: create, HTTP 201.
- `PATCH <base>/{id}`: update, HTTP 200.
- `POST <base>/{id}/activate`, `/inactivate`, `/delete`, `/restore`: HTTP 200, body exactly `{ "version": <nonnegative integer> }`. This includes DELETE; its typed DELETED row remains available from detail, but is not embedded in the lifecycle response.

Context has one list-path exception explicitly shown below; do not add a global Context list. All path UUIDs are required. For nested routes, load and validate the exact path owner and verify that the row belongs to it; a wrong owner path returns 404. Do not accept redundant path-owned identity fields in the body.

An optional `organizationId` query parameter on detail, nested list, nested mutation, and Context-/Scope-owned options endpoints is an expected-owner assertion. If supplied, compare it with the Organization resolved from persisted ownership and return 404 on mismatch. For the Context list the Organization path is authoritative. For Organization Policy list the query is mandatory. Global `/options/*` endpoints have no such owner assertion. This parameter never replaces persisted ownership or Area authorization.

PATCH replaces the complete editable field set; it is not JSON Merge Patch. Nullable editable fields omitted or explicitly null are cleared. UI edit forms must send the complete editable set. `version` is mandatory on PATCH and lifecycle commands. Identity/source/status fields are not editable via PATCH. Reject unsupported/immutable payload fields with `LOCAL_COMMAND_INVALID`; scope strict request handling to these Local endpoints without changing Central JSON behavior.

All lists support `lifecycleStatus`: omitted means ACTIVE and INACTIVE; `ACTIVE`, `INACTIVE`, or `DELETED` selects exactly that stored status. Do not silently exclude a row because its parent/reference later became inactive, deleted, or out of date. Detail/list status is stored status, not computed effectiveness.

All collection lists, value helps, and reverse views use zero-based `page` (default 0), `size` (default 25, allowed 1–100), `sort` (`id` default, or `createdAt`), and `direction` (`ASC` default or `DESC`). Add an `id` tie-breaker. Invalid values return 400. Return a concrete typed envelope `{items, page, size, totalElements, totalPages}`. Count only rows authorized for that endpoint. Value helps additionally support optional `q` (trimmed, maximum 100 characters), a literal case-insensitive substring search over returned code/label; escape SQL wildcard characters and parameterize queries.

### 4.2 Collection bases and exact request fields

`validity` below expands to nullable `validFrom`, `validTo` in Gregorian `yyyy-MM-dd`. `source` expands to required `sourceType` plus the one nullable typed Central reference field in its row. `INHERITED_FROM_CENTRAL` requires that FK; `LOCAL_ADDED` requires null. No default source type is chosen by the server or UI.

| Family / collection base | Create fields, in addition to validity | PATCH fields, in addition to required version and validity |
| --- | --- | --- |
| Context: `/organization-subprocess-scopes` | required `organizationId`, `subprocessId`; nullable `contextNote` | nullable `contextNote` |
| Control: `/organization-subprocess-scopes/{contextId}/control-scopes` | required `controlId`; source with `centralControlScopeId`; nullable `actualOwnerId`, `frequencyCode`, `executionMethodCode`, `testMethodCode`, `localContextNote` | those same five nullable local execution fields |
| Risk: `/organization-subprocess-scopes/{contextId}/risk-scopes` | required `riskTemplateId`; source with `centralRiskScopeId` | no fields beyond version and validity |
| Objective: `/organization-subprocess-scopes/{contextId}/control-objective-scopes` | required `controlObjectiveId`; source with `centralControlObjectiveScopeId` | no fields beyond version and validity |
| Requirement: `/organization-subprocess-scopes/{contextId}/requirement-scopes` | required `requirementId`; source with `centralRequirementScopeId` | no fields beyond version and validity |
| Risk–Control: `/organization-subprocess-scopes/{contextId}/risk-control-coverages` | required `localRiskScopeId`, `localControlScopeId`; source with `centralRiskControlCoverageId`; nullable `coverageNote` | nullable `coverageNote` |
| Risk–Objective: `/organization-subprocess-scopes/{contextId}/risk-control-objective-coverages` | required `localRiskScopeId`, `localControlObjectiveScopeId`; source with `centralRiskControlObjectiveCoverageId`; nullable `coverageNote` | nullable `coverageNote` |
| Control–Objective: `/organization-subprocess-scopes/{contextId}/control-control-objective-coverages` | required `localControlScopeId`, `localControlObjectiveScopeId`; source with `centralControlControlObjectiveCoverageId`; nullable `coverageNote` | nullable `coverageNote` |
| Requirement–Control: `/organization-subprocess-scopes/{contextId}/requirement-control-coverages` | required `localRequirementScopeId`, `localControlScopeId`; source with `centralRequirementControlCoverageId`; nullable `coverageNote` | nullable `coverageNote` |
| Organization Policy: `/organization-policy-scopes` | required `organizationId`, `policyId`, `scopeAction`, `propagationMode` | required `scopeAction`, `propagationMode` |
| Context Policy: `/organization-subprocess-scopes/{contextId}/policy-scopes` | required `policyId`, `scopeAction` | required `scopeAction` |
| Control Policy: `/control-scopes/{localControlScopeId}/policy-scopes` | required `policyId`, `scopeAction` | required `scopeAction` |
| Requirement Policy: `/requirement-scopes/{localRequirementScopeId}/policy-scopes` | required `policyId`, `scopeAction` | required `scopeAction` |

Context list is exclusively `GET /organizations/{organizationId}/contexts`; use the common status/pagination rules and accept an optional exact `subprocessId` filter. That filter makes a duplicate-assignment lookup return at most one row for the selected status set. Context detail/update/lifecycle still use `/organization-subprocess-scopes/{id}`. Organization Policy list requires `organizationId`. For the other three Policy families the target comes only from the path. `scopeAction` is `INCLUDE` or `EXCLUDE`; only Organization Policy accepts `propagationMode`, which is `DIRECT_ONLY` or `INCLUDE_DESCENDANTS`.

Nested Control create does not accept `organizationId` or `subprocessId` in its body and never creates Context. It shares Control validation and creation internals with the atomic assignment below, not its transport DTO or a second Revision command.

### 4.3 Atomic Control assignment

`POST /control-assignments` accepts required `organizationId`, `subprocessId`, `controlId`, `sourceType`, conditional `centralControlScopeId`, validity, and the five nullable Local Control execution fields from the table. Do not add documents or a Context note to this body.

In one transaction, after all required Guards:

1. Resolve and validate the exact Organization, Subprocess, Control, and conditional Central Control Scope. An inherited Scope must have exactly that Control and Subprocess; do not infer Subprocess from a Control's available scopes.
2. Look up Context by `(organizationId, subprocessId)` across ALL statuses.
3. No Context: prepare an ACTIVE Context with null `contextNote` and the submitted Control validity pair.
4. ACTIVE Context: use it without changing its validity, note, audit fields, or version.
5. INACTIVE Context: return `LOCAL_CONTEXT_INACTIVE`; DELETED Context: return `LOCAL_CONTEXT_DELETED`. Neither action reactivates/restores it.
6. Check the Control business key across ALL statuses. ACTIVE/INACTIVE duplicate returns `DUPLICATE_RELATION`; DELETED duplicate returns `LOCAL_RESTORE_REQUIRED`. Do not overwrite source type or create a replacement row.
7. Validate all input before applying prepared writes. Persist the Control Scope, and the new Context only when needed. Return HTTP 201 with `{revisionId, organizationId, contextId, contextVersion, localControlScopeId, localControlScopeVersion, contextCreated}`.

One LOCAL Revision contains Context CREATE first (only if created), then Control CREATE. The primary result is the Control Scope. Failure rolls back both source rows and Revision rows. Never implement this as two browser calls or two public command-service calls that each create a Revision.

### 4.4 Read and mutation response shape

Use concrete DTOs per family, not maps/unions for public row payloads. Each row DTO includes:

- `id`, `organizationId`, `organizationCode`, `organizationLabel` (Organization name).
- `status`, `validFrom`, `validTo`, `version`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`.
- The exact camelCase physical identity/reference fields from section 3, and every editable field from section 4.2. The Context PK is its `id`; other context-owned rows expose `organizationSubprocessScopeId`.
- For every context-owned row, `subprocessId`, `subprocessCode`, `subprocessLabel`, `contextStatus`. These are read projections, not additional persistence columns.
- Definition projections named `controlCode`/`controlLabel`, `riskTemplateCode`/`riskTemplateLabel`, `controlObjectiveCode`/`controlObjectiveLabel`, `requirementCode`/`requirementLabel`, or `policyCode`/`policyLabel` as applicable. Definition labels are current `title` values.
- Coverage returns both endpoint Local Scope IDs and both underlying typed definition IDs/codes/labels, plus separate endpoint stored statuses. Control/Requirement Policy returns its exact target Scope's definition projection.
- Requirement-bearing rows also include `regulationId`, `regulationCode`, `regulationLabel`, `regulationGroupId`, `regulationGroupCode`, `regulationGroupLabel`, obtained through the existing Requirement → Regulation → Group chain.
- Source-bearing rows include stored `sourceType`, the typed Central reference ID, and nullable `centralReferenceStatus`, `centralReferenceValidFrom`, `centralReferenceValidTo`. Do not fabricate these for LOCAL_ADDED.
- Control rows include nullable `actualOwnerLabel` in addition to `actualOwnerId`; do not expose user account fields.

No Local row receives a synthetic business code. No response includes `effectiveStatus`, Policy Applicability, unauthorized related rows, storage keys, or sensitive user metadata. Read deleted references for historical labels where Area access permits; do not drop Local history through an ACTIVE-only inner join.

CREATE and PATCH return `{entityId, version, revisionId, row}` where `row` is that family's concrete post-flush DTO. All four lifecycle commands use the version-only response in section 4.1. Build success data in the transaction; do not make successful persistence depend on a later unauthenticated read. Mutation response permission requirements equal the corresponding mutation's permission requirements.

## 5. Lifecycle, validation, and immutable history

### 5.1 Exact transitions

| Command | Allowed starting state | Result | Version |
| --- | --- | --- | --- |
| CREATE | business key absent in every state | ACTIVE, new UUID | 0 |
| PATCH | ACTIVE or INACTIVE | unchanged status/identity/source | supplied version must match; increment |
| ACTIVATE | INACTIVE | ACTIVE | supplied version must match; increment |
| INACTIVATE | ACTIVE | INACTIVE | supplied version must match; increment |
| DELETE | ACTIVE or INACTIVE | DELETED; set deleted audit | supplied version must match; increment |
| RESTORE | DELETED | ACTIVE; clear deleted audit | supplied version must match; increment |

Every other transition fails. Repeated lifecycle calls are not silent successes. For every family, CREATE on an ACTIVE/INACTIVE key fails with `DUPLICATE_RELATION`, and CREATE on a DELETED key fails with `LOCAL_RESTORE_REQUIRED`. No `CREATE_OR_RESTORE` exists in Local APIs. Restore retains the original UUID, source, identity, and editable values; it accepts only version and must validate the retained values. If retained validity cannot be restored against its current references, return the validation error; do not silently edit dates. A no-op PATCH still touches update audit and produces one UPDATE Revision Content.

### 5.2 Eligibility matrix

“ACTIVE dependencies” below means stored ACTIVE, not active on today's date and not computed effective status. The explicit dependencies are:

| Row family | Dependencies checked for CREATE / ACTIVATE / RESTORE |
| --- | --- |
| Context | Organization and exact Central Subprocess |
| Local Scope | Context, its Organization and Subprocess, exact Central definition; inherited additionally exact Central Scope |
| Local Coverage | Context, its Organization and Subprocess, both exact Local Scopes, both underlying Central definitions; inherited additionally exact Central Coverage and its two exact Central Scope endpoints |
| Organization Policy | Organization and Policy |
| Context Policy | Context, its Organization and Subprocess, Policy |
| Control/Requirement Policy | exact Local target Scope, its Context/Organization/Subprocess, its Central definition, Policy |

All dependencies in this table must exist and be ACTIVE for CREATE / ACTIVATE / RESTORE. A Control/Requirement Policy does not acquire inheritance from the target Scope's Central Scope. A LOCAL_ADDED Coverage may connect inherited Local Scopes whose upstream Central references have later become inactive; do not recursively calculate effectiveness. Only the dependencies explicitly listed above are authoritative for this delivery. Do not recursively require every Organization ancestor, Process ancestor, or catalog group to be ACTIVE; preserve their existing structural rules.

PATCH requires the row itself non-DELETED, all listed dependencies to exist and be non-DELETED, exact identity matching, and the relevant validity constraints. INACTIVE dependencies are allowed on PATCH so retained Local configuration can be edited; PATCH does not activate anything. INACTIVATE and DELETE require exact ownership, matching version, valid transition, and the deletion blockers below, but do not require active/in-range upstream references. This permits explicit cleanup after Central changes.

For inherited Scopes, the referenced Central Scope's definition and Subprocess must match the Local definition and Context Subprocess. For inherited Coverage, resolve its Central Scope endpoints, then match the family, both Central definitions, and Context Subprocess. Do not require Local endpoint `sourceType` to equal Coverage source type or require Local endpoint Central Scope FKs to be non-null. Cross-Context Coverage is always rejected before mutation, including when endpoint IDs are otherwise valid.

### 5.3 Date and local execution rules

All intervals are inclusive. Null lower bound means unbounded past; null upper bound means unbounded future. If both endpoints exist, require `validFrom <= validTo`. Containment is:

`(parentFrom == null || (childFrom != null && childFrom >= parentFrom)) && (parentTo == null || (childTo != null && childTo <= parentTo))`.

- Context validates its own date ordering only. No automatic Organization/Subprocess containment or date clamping is added.
- LOCAL_ADDED Scope/Coverage validates its own ordering only.
- INHERITED Scope/Coverage also requires containment within its exact Central Scope/Coverage interval on CREATE, PATCH, ACTIVATE, and RESTORE.
- Coverage is not required to fit either Local endpoint Scope interval. Preserve the existing independent Coverage interval rule.
- Local Policy validity must fit Policy and its exact target interval: Organization, Context, Local Control Scope, or Local Requirement Scope. Do not substitute a parent definition interval for that exact target.
- Do not gate any of these commands on whether today's date is inside the interval. Do not synchronize child validity when a parent date changes.

Normalize nullable notes with trim; blank becomes null. Preserve internal line breaks. Normalize code fields with trim and uppercase, blank to null. Fixed code vocabularies are the existing enums:

- `frequencyCode`: `ANNUAL`, `BI_WEEKLY`, `CONTINUAL`, `DAILY`, `MONTHLY`, `QUARTERLY`, `SEMI_MONTHLY`, `WEEKLY`.
- `executionMethodCode`: `MANUAL`, `SYSTEM`, `SEMI_AUTOMATED`.
- `testMethodCode`: `ATTRIBUTE_SAMPLING`, `DOCUMENT_INSPECTION_WITH_INQUIRY`, `CONTROL_OBSERVATION_WITH_INQUIRY`, `CONTROL_REPERFORMANCE_WITH_INQUIRY`.

Null is a stored absence of a Local value; do not automatically copy or dynamically substitute Central recommendations. `actualOwnerId` may be null; otherwise it must identify an existing enabled, unlocked `app_user`. Do not require a role, default organization, or new ACL; root accounts follow the same eligibility predicates. On Control CREATE/PATCH/ACTIVATE/RESTORE validate the submitted/retained owner; INACTIVATE/DELETE must remain possible if the owner later becomes ineligible. Owner changes never mutate the user.

### 5.4 Deletion dependencies

Local DELETE is soft-delete only. Non-DELETED means both ACTIVE and INACTIVE, with no current-date filter.

- Context DELETE: block while any of its four Scope families, four Coverage families, or Context Policy rows is non-DELETED.
- Local Risk Scope DELETE: block Risk–Control or Risk–Objective Coverage using it.
- Local Control Scope DELETE: block Risk–Control, Control–Objective, Requirement–Control Coverage, or Local Control Policy using it.
- Local Objective Scope DELETE: block Risk–Objective or Control–Objective Coverage using it.
- Local Requirement Scope DELETE: block Requirement–Control Coverage or Local Requirement Policy using it.
- Local Coverage and Local Policy DELETE have no further Local child blockers in this schema.
- INACTIVATE does not cascade and is not blocked by children. Existing children retain their stored status.

Document links do not cascade on Local deletion and do not add a new deletion blocker. Their availability follows section 11. Existing Central dependency SQL, including checks that count DELETED Local rows, remains unchanged.

## 6. Authorization matrix

Use only the existing `MasterDataAuthorizationService` and GLOBAL Area assignments. No new permissions/roles, Organization ACL, role mutation, delegation rule, or permissions migration is authorized. MANAGE includes VIEW as it does today. Root follows the existing service bypass; do not invent a separate root rule.

For READ, require REFERENCE VIEW and every additional Area VIEW in the table. For WRITE, require REFERENCE MANAGE and every additional Area VIEW. A Local manager does not need PROCESS/CONTROL/RISK/GOVERNANCE MANAGE merely to maintain Local rows.

| Family | Additional VIEW Areas |
| --- | --- |
| Context | PROCESS |
| Control Scope | PROCESS, CONTROL |
| Risk Scope | PROCESS, RISK |
| Objective Scope | PROCESS, CONTROL |
| Requirement Scope | PROCESS, GOVERNANCE |
| Risk–Control Coverage | PROCESS, RISK, CONTROL |
| Risk–Objective Coverage | PROCESS, RISK, CONTROL |
| Control–Objective Coverage | PROCESS, CONTROL |
| Requirement–Control Coverage | PROCESS, GOVERNANCE, CONTROL |
| Organization Policy | GOVERNANCE |
| Context Policy | PROCESS, GOVERNANCE |
| Control Policy | PROCESS, CONTROL, GOVERNANCE |
| Requirement Policy | PROCESS, GOVERNANCE |

Use the same matrix for all status lists, detail, options, reverse views, mutation responses, and Documents. Enforce at the Backend service boundary as well as controller entry points; UI hiding alone is insufficient. Check Area access before resource lookup that could disclose existence. Resolve Organization from Context or exact persisted Policy target. Never trust a submitted Organization over that ownership chain.

There is no per-Organization authorization filter in the currently approved GLOBAL model. Expected-owner mismatch protection is ownership validation, not a new organizational security model. Do not claim otherwise.

Evaluate each tab subsection separately. For example, a user with REFERENCE + PROCESS + RISK VIEW can view Risk Scopes even without CONTROL VIEW, but must not receive Risk–Control/Risk–Objective rows or counts. Organization Policy must remain available with REFERENCE + GOVERNANCE VIEW even without PROCESS VIEW. Do not make a combined options endpoint return unauthorized arrays or counts and do not require unrelated Areas for the entire Organization page.

## 7. Transactions, Guards, and business-row locks

The existing hierarchy boundary keys are `ACCOUNT_GROUP`, `CONTROL`, `ORGANIZATION`, `POLICY`, `PROCESS`, `REGULATION`, `RISK`. Do not create `LOCAL`, `OBJECTIVE`, or another key. `CONTROL` is present in the actual enum and migrations even where older documentation registries omit it.

Every Local mutation, including PATCH and all four lifecycle actions, uses the fixed Guard set below. Acquire the complete set lexically before reference, ownership, dependency, lifecycle, or business-key reads. Do not acquire a lower-sorting Guard later after another Guard or business-row lock.

| Entry points: CREATE/PATCH/ACTIVATE/INACTIVATE/DELETE/RESTORE | Complete Guard set, in order |
| --- | --- |
| Context | ORGANIZATION, PROCESS |
| Control Scope and atomic Control assignment | CONTROL, ORGANIZATION, PROCESS |
| Risk Scope | ORGANIZATION, PROCESS, RISK |
| Objective Scope | ORGANIZATION, PROCESS |
| Requirement Scope | ORGANIZATION, PROCESS, REGULATION |
| Risk–Control Coverage | CONTROL, ORGANIZATION, PROCESS, RISK |
| Risk–Objective Coverage | ORGANIZATION, PROCESS, RISK |
| Control–Objective Coverage | CONTROL, ORGANIZATION, PROCESS |
| Requirement–Control Coverage | CONTROL, ORGANIZATION, PROCESS, REGULATION |
| Organization Policy | ORGANIZATION, POLICY |
| Context Policy | ORGANIZATION, POLICY, PROCESS |
| Control Policy | CONTROL, ORGANIZATION, POLICY, PROCESS |
| Requirement Policy | ORGANIZATION, POLICY, PROCESS, REGULATION |

Control Objective is a flat definition in this source. Its lifecycle service currently uses a targeted row lock, not a Control Objective Guard. Local Objective/related Coverage commands must lock the exact `central_control_objective` row before validating status or creating a dependency; an Area permission or a CONTROL Guard is not a substitute. ACCOUNT_GROUP is not required because this task does not change classifications.

Implement the ownership/Revision ordering explicitly:

1. Enter a Spring-proxied public Local command method with `@Transactional` (REQUIRED); authorize the fixed Area combination.
2. Lock the complete fixed Guard set using the existing `MasterDataHierarchyGuard`, sorted by enum name. No hierarchy/business reference read precedes this step.
3. Resolve the immutable ownership chain and expected-owner assertion. This is necessary before constructing `RevisionRequest.local(owningOrganizationId, ...)` for commands identified only by Local IDs.
4. Call the existing `MasterDataRevisionCoordinator.executeStructural(guardKeys, localRequest, callback)` on its injected Spring bean. Its REQUIRED transaction joins the already-open transaction and reacquires the same Guard rows; no new keys or transaction are introduced. Do not use REQUIRES_NEW, self-invoked transactional methods, or a preliminary Central command.
5. Within the callback, acquire targeted row locks as listed below, re-read current mutable values, validate all invariants/version, capture before snapshot, mutate/flush Local rows, and produce `RevisionContentResult` with after snapshot/version.
6. The coordinator verifies LOCAL domain and Organization, persists one Revision and ordered contents, and flushes. Return only after the transaction can complete; on any failure roll back all database work.

Reads solely to discover immutable FK IDs after Guards may precede row locks. Mutable reference status/validity used in decisions must be freshly read under the corresponding row lock; do not validate a cached pre-lock entity snapshot.

Targeted `PESSIMISTIC_WRITE` business locks follow this order, skipping unused families and sorting multiple UUIDs within each family:

1. Owning Organization; Central Policy when applicable; Central Subprocess when applicable.
2. Exact Central Control definitions, then exact Central Control Scope references.
3. Exact Central Risk Template definitions, then exact Central Risk Scope references.
4. Exact Central Control Objective definitions, then exact Central Objective Scope references.
5. Exact Central Requirement definitions, then exact Central Requirement Scope references.
6. Exact Central Coverage reference when inherited (its endpoint Scope IDs must already be included above).
7. Existing Context; exact Local Scope rows in Control, Risk, Objective, Requirement order; then the affected Coverage or Policy row.
8. Exact `app_user` owner row when validating non-null owner eligibility.

This keeps the Central endpoint-family order compatible with `CentralSubprocessCoverageLockCoordinator`. Existing shared Guards serialize conflicting Central structural commands before business-row lock ordering can conflict. Flat definition and non-structural reference updates are coordinated through targeted row locks. Do not lock every row in a hierarchy. Local duplicate creation when no row exists is serialized by the shared ORGANIZATION Guard and backed by the existing unique constraint.

For nested routes validate the row's persisted Context/target against the path after locks. In every callback explicitly require LOCAL domain, owning Organization, and every expected Guard through `RevisionMutationGuard`. Do not assume enum validation alone proves that every changed row belongs to that Organization.

Snapshots contain actual scalar row fields, source, lifecycle, validity, all audit fields, and version; they do not contain current joined labels or browser-supplied Revision Content. CREATE has null before/expectedVersion. Existing commands use the submitted expectedVersion, pre-mutation before, and post-flush after. Each ordinary command produces exactly one typed content. Atomic assignment produces the one or two contents described in section 4.3. Use existing long `RevisionEntityType.LOCAL_*` constants and existing sequence/coordinator behavior; do not invent a new sequence or guarantee gapless Revision numbers after rollback.

Guard missing: existing `HIERARCHY_GUARD_NOT_CONFIGURED` (500). Recognized Guard/business lock acquisition timeout: `HIERARCHY_BUSY` (409). Stale versions including ORM optimistic-lock failure: `VERSION_CONFLICT` (409). Do not auto-retry, create Guard rows at runtime, or return partial success. Translate known Local unique-constraint failures to the Local business-key errors without leaking SQL.

## 8. Value-help and reverse routes

Use concrete Local query controllers/DTOs. These are additive read endpoints; do not move a Local write into a Central catalog controller. The common paging/search rules apply. Query services filter candidates before paging/counting, then write services repeat validation under locks.

### 8.1 Exact value-help endpoints

| GET path | Required access | Result/filter |
| --- | --- | --- |
| `/options/organizations` | REFERENCE VIEW + PROCESS VIEW | ACTIVE Organization IDs/codes/names |
| `/options/subprocesses` | REFERENCE VIEW + PROCESS VIEW | ACTIVE Central Subprocess IDs/codes/names; never Central Process |
| `/options/controls` | Control Scope READ | ACTIVE Central Control definitions |
| `/options/risk-templates` | Risk Scope READ | ACTIVE Central Risk Templates |
| `/options/control-objectives` | Objective Scope READ | ACTIVE Central Control Objectives |
| `/options/requirements` | Requirement Scope READ | ACTIVE Central Requirements, with Regulation/Group labels |
| `/options/policies` | Organization Policy READ | ACTIVE Central Policies |
| `/options/control-owners` | Control Scope WRITE | enabled, unlocked users, only `id` and `displayLabel` |
| `/options/control-settings` | Control Scope READ | unpaged `{frequencyCodes, executionMethodCodes, testMethodCodes}` from the existing enums |

Definition/Organization/Subprocess/Policy options return concrete types with `id`, `code`, `displayLabel`, `status`, `validFrom`, `validTo`, `version` plus the explicitly required Requirement hierarchy fields. Owner `displayLabel` is trimmed first name plus last name; do not include username, mobile, email, credentials, role grants, or default Organization. Owner search uses first/last name only. An existing stored owner may still be displayed as selected when ineligible, with a validation message; it must not appear as an eligible new candidate. Null owner is a selectable clear value.

Provide the four inherited Scope reference selectors:

- `GET /organization-subprocess-scopes/{contextId}/control-scopes/options?controlId={id}`
- `GET /organization-subprocess-scopes/{contextId}/risk-scopes/options?riskTemplateId={id}`
- `GET /organization-subprocess-scopes/{contextId}/control-objective-scopes/options?controlObjectiveId={id}`
- `GET /organization-subprocess-scopes/{contextId}/requirement-scopes/options?requirementId={id}`

Require the corresponding Scope READ combination. Each response is a page of that exact typed Central Scope, with `id`, `subprocessId`, its typed definition ID/code/label, stored status, validity, and version. Filter to exact Context Subprocess, supplied definition, and ACTIVE reference/definition. These select an inherited reference; they do not create Context or Scope. The Context itself must belong to the requested Organization assertion when provided.

Provide the four inherited Coverage reference selectors at each Coverage collection's `/options` suffix. Require both typed Local endpoint IDs as query parameters with the exact names in section 4.2. Resolve those endpoints in the path Context; return 422 `CROSS_LOCAL_CONTEXT_COVERAGE` on mismatch. Return a page of exact ACTIVE Central Coverage rows matching that Context Subprocess and the two underlying Central definitions, with `id`, `subprocessId`, the family's two typed Central Scope endpoint IDs, their definition IDs, stored status, validity, version. Require both Central Scope endpoints and definitions ACTIVE. Coverage READ permissions apply.

Local endpoint selectors use the already-paged typed Local Scope lists with `lifecycleStatus=ACTIVE`; do not expose a generic Local object picker. The UI must show an ineligible parent/reference message instead of treating an empty Central match as permission to change source type.

Atomic assignment must work before Context exists. Add `GET /options/central-control-scopes?subprocessId={id}&controlId={id}` with Control Scope READ permission and the same typed Central Control Scope projection/filter. No Context is required by this endpoint.

### 8.2 Exact reverse views

Implement the following read-only paged routes with the same typed row DTOs and common lifecycle filter. Parent IDs may identify an inactive/deleted Central definition for historical reads; no command is implied.

| GET path | Local result family | Organization navigation |
| --- | --- | --- |
| `/central/risk-templates/{riskTemplateId}/risk-scopes` | Local Risk Scopes | Risks, exact Context and row |
| `/central/control-objectives/{controlObjectiveId}/control-objective-scopes` | Local Objective Scopes | Objectives, exact Context and row |
| `/central/requirements/{requirementId}/requirement-scopes` | Local Requirement Scopes | Regulations, exact Context and row |
| `/central/policies/{policyId}/organization-policy-scopes` | Local Organization Policy | Policies, Organization section and row |
| `/central/policies/{policyId}/subprocess-policy-scopes` | Local Context Policy | Policies, Context section and row |
| `/central/policies/{policyId}/control-policy-scopes` | Local Control Policy | Policies, Control section, Context, target Scope and row |
| `/central/policies/{policyId}/requirement-policy-scopes` | Local Requirement Policy | Policies, Requirement section, Context, target Scope and row |

Each route independently requires its Local result family's READ combination. Do not aggregate inaccessible Policy sections into totals. Optional `organizationId` here is an actual result filter. Do not add reverse Local mutation routes. Use the navigation contract in section 10.

## 9. Stable Local errors

Use existing exception classes for the existing 403/404/409/422/500 mappings and the `ApiExceptionHandler` envelope. The current code has no BusinessException mapped to HTTP 400 and its catch-all maps malformed Local JSON/path/query input to 500. Add one `LocalCommandBadRequestException extends BusinessException` mapped to HTTP 400 for semantic `LOCAL_COMMAND_INVALID`, plus Local-controller-scoped parsing handlers for malformed JSON, enum, date, UUID, and query primitives. These parsing handlers return HTTP 400 with the existing `VALIDATION_FAILED` envelope. Do not change Central endpoint parsing/error behavior. Add Persian/English messages for new Local codes.

| HTTP/code | Meaning |
| --- | --- |
| 400 `LOCAL_COMMAND_INVALID` | semantic missing/unsupported/immutable fields, invalid page/sort, or missing/negative version after successful parsing |
| 400 `VALIDATION_FAILED` | malformed JSON or primitive enum/date/UUID/integer input rejected by the Local parsing/Bean Validation path |
| 403 `MASTER_DATA_ACCESS_DENIED` | missing required Area combination; no resource detail is exposed |
| 404 `LOCAL_RESOURCE_NOT_FOUND` | absent Local resource or wrong path/expected Organization ownership |
| 404 `LOCAL_REFERENCE_NOT_FOUND` | absent referenced Central definition/relation/Organization/Subprocess |
| 409 `VERSION_CONFLICT` | supplied existing-row version differs |
| 409 `DUPLICATE_RELATION` | ACTIVE or INACTIVE business key already exists |
| 409 `LOCAL_RESTORE_REQUIRED` | DELETED row reserves the key; explicit version-checked restore required |
| 409 `LOCAL_CONTEXT_INACTIVE` / `LOCAL_CONTEXT_DELETED` | atomic assignment refuses existing ineligible Context |
| 409 `LOCAL_DEPENDENCY_EXISTS` | specified non-DELETED Local dependency blocks DELETE |
| 409 `HIERARCHY_BUSY` | recognized lock contention/timeout, no partial writes |
| 500 `HIERARCHY_GUARD_NOT_CONFIGURED` | missing seeded Guard, fail closed |
| 422 `INVALID_LIFECYCLE_TRANSITION` | action incompatible with current row status |
| 422 `LOCAL_REFERENCE_NOT_ELIGIBLE` | reference status fails section 5.2 |
| 422 `LOCAL_INHERITED_REFERENCE_MISMATCH` | wrong typed Central definition/Subprocess/coverage pair |
| 422 `CROSS_LOCAL_CONTEXT_COVERAGE` | either Local endpoint belongs to a different Context |
| 422 `DATE_RANGE_INVALID` | reversed interval |
| 422 `LOCAL_VALIDITY_OUTSIDE_CENTRAL_VALIDITY` | inherited interval not contained in exact Central reference |
| 422 `LOCAL_POLICY_VALIDITY_OUTSIDE_ENDPOINTS` | Policy decision interval not contained in Policy and exact Local target |
| 422 `LOCAL_OWNER_NOT_ELIGIBLE` | non-null owner absent, disabled, or locked |
| 422 `LOCAL_CONTROL_CODE_INVALID` | execution code outside the fixed vocabulary |

Framework parsing/Bean Validation uses the existing `VALIDATION_FAILED` envelope for malformed primitive input; custom semantic Local validation uses the codes above. Apply the Local parsing handlers only to the new Local controllers and keep the global Central exception mappings intact. Check authentication/Area access first, then resource ownership, expected version, transition, reference identity/eligibility, dates/fields, and dependency/uniqueness checks before applying writes. A failed command has no source/Revision write even if multiple validation failures are possible.

## 10. Organization UI and Central navigation

Place Local client types, typed API repository functions, services/state, permission helpers, row editors, selectors, and list/detail components under `grcpc-ui/src/features/local-master-data`. Export the narrow public UI/API surface through `index.ts`. Organization remains the owning page; no extra top-level Local route or Master Data launcher tile is needed. Keep the existing Organization API repository exclusively structural.

Update `OrganizationObjectPage.tsx`, `OrganizationsFclShellPage.tsx`, and their i18n/state integration. Preserve FCL, tree/list selection, expansion, parent value help, create/view/edit routes, RTL, General Information, and `ORG` Documents. Replace disabled relationship placeholders with working typed sections.

### 10.1 Tabs and editors

`OrganizationTabKey` becomes exactly `general | subprocesses | risks | controls | regulations | objectives | policies | documents`, in that order.

| Tab | Editable sections | Linked read-only sections |
| --- | --- | --- |
| Subprocesses | Context list/detail/create/edit and four lifecycle actions | none |
| Risks | Local Risk Scopes; Risk–Objective Coverage | Risk–Control Coverage → Controls editor |
| Controls | Local Control Scopes including execution fields; Risk–Control, Control–Objective, Requirement–Control Coverage | none |
| Regulations | Local Requirement Scopes, with Regulation/Group labels | Requirement–Control Coverage → Controls editor |
| Objectives | Local Objective Scopes | Risk–Objective → Risks editor; Control–Objective → Controls editor |
| Policies | four distinct Local Policy sections: Organization, Context, Control Scope, Requirement Scope | no computed applicability |

All section lists expose normal/deleted status filtering, paging, selected-row detail, stored status/validity/source/reference, and authorized Document access. A row editor shows Create/Save/Cancel and the legal lifecycle actions based on section 5.1. Deleted rows are read-only with explicit Restore; ineligible references produce explanatory errors, never automatic source conversion. Coverage editors pick exact Local Scopes, not Central definition IDs.

Every context-dependent tab has a visible Context selector labeled with Subprocess code/name and Context stored status. Retain inactive/deleted Context selection for history/restore; do not hide its child rows. Default to no selection when there are multiple Contexts; when exactly one exists, selecting it automatically is permitted. No selection means no context-dependent fetch/mutation. No Context at all means an empty state with a link to Subprocesses. Organization Policy is independently usable without a Context or PROCESS permission.

Context creation never seeds all Central Scopes/Coverages/Policy rows. The user creates explicit Local rows. Ordinary Controls creation in an Organization tab requires an existing Context; only the Central Control assignment flow uses atomic Context creation.

Relationship sections may be edited from canonical Organization View by users with the required Local WRITE permissions, independently of Organization General Information edit mode. Organization header Save never submits Local changes. Local Save never submits Organization fields or Document drafts. One user action calls one Local mutation command.

In Organization create mode, the six relationship tabs remain visible/selectable but display a save-first message and no Local controls or requests. After Organization creation, retain existing replace-navigation to canonical View and make authorized Local sections available. Permission restrictions may hide unavailable sections/actions; the requirement to activate all six tabs does not authorize bypassing permissions or displaying mock data.

Policy Control/Requirement sections require an explicit target Local Scope selector inside the selected Context. Their target cannot be changed while editing an existing Policy decision. Distinguish labels for existing Central Policy–Organization Scope and Local Organization Policy decisions; do not merge their response types or claim final applicability.

### 10.2 URL and navigation contract

Use the existing `/organizations/{organizationId}` route with these optional query parameters:

- `tab`: one of the eight tab keys; default `general`.
- `contextId`: exact Local Context UUID for context-owned selections.
- `localSection`: one of `contexts`, `control-scopes`, `risk-scopes`, `control-objective-scopes`, `requirement-scopes`, `risk-control-coverages`, `risk-control-objective-coverages`, `control-control-objective-coverages`, `requirement-control-coverages`, `organization-policies`, `context-policies`, `control-policies`, `requirement-policies`.
- `localRowId`: selected exact row UUID.
- `policyTargetId`: exact Local Control/Requirement Scope UUID only for those two Policy sections.
- `localStatus`: `ACTIVE`, `INACTIVE`, or `DELETED` when an exact filter is requested; absent means non-DELETED.

Map sections to the editable owning tab in section 10.1. Context uses `tab=subprocesses&localSection=contexts`; Policy sections use `tab=policies`. Linked read-only Coverage views navigate to that same persisted row's owning editor, never clone a row. Reverse views include the exact Context, row, target when needed, and DELETED filter when relevant.

Parse/validate queries before dependent requests. Unknown tab/section values fall back to General Information after passing the dirty guard; malformed UUIDs or mismatched Organization/Context/target/row display a localized invalid-selection/not-found message and do not issue mutation requests. Preserve unrelated query parameters and the create route's existing `parentId`. Do not reset a valid incoming tab to general through the current `objectTabScopeKey` effect. Back/forward and refresh restore authorized selections.

After a Local save, update only its row/list, affected Context selector if a Context was created, and related visible Coverage/Policy projections. Preserve Organization, Context, tab, selected row where still visible, and tree expansion. Do not reload/reset the Organization tree or mark its version changed. After DELETE in a normal list, clear the deleted row selection; in the deleted list, retain it for restore. Version conflict retains user draft and offers explicit reload/discard; never retry with a fresh version automatically.

### 10.3 Dirty state

Extend the existing `useUnsavedChangesGuard` input to include Local row drafts, invalid visible Local date input, and Local Document pending state. Use callbacks/effects; no state synchronization during render. Switching Organization, Context, tab, section, selected row, route, closing the modal, and browser back/unload must not silently discard these changes.

Use one existing-style leave confirmation with Stay/Discard; do not auto-save two domains. Local Save clears only that Local row draft after success. Local Document success clears only its consumed document state. Central aggregate Save clears only its own acknowledged General Information/ORG Document draft. Never clear all dirty flags on an unrelated save or Local list refresh.

If an Organization General Information/ORG Document draft is dirty, preserve it while the user works on a Local editor. Changing a navigation selection that would unmount/discard a draft requires the same leave guard. Local Documents use a separate visible save/finalize action and are not batched with Local row Save.

### 10.4 Central entry points

- In `ProcessObjectPage.tsx`, only an existing Central Subprocess (not Process) has **Assign to Organization**. Require Context WRITE permissions and stored ACTIVE Subprocess. Dialog selects Organization, context note, and nullable validity; call Context POST once. On success navigate to the returned Organization/Context in Subprocesses. On `DUPLICATE_RELATION`, look up the Context list with the selected `subprocessId` and default non-DELETED filter; on `LOCAL_RESTORE_REQUIRED`, use the same filter with `lifecycleStatus=DELETED`. Show the error and offer navigation to that exact Context, not an implicit activate/restore.
- In `CentralControlObjectPage.tsx`, an existing ACTIVE Central Control has **Assign to Organization** when Control Scope WRITE permissions hold. Dialog requires Organization, exact Subprocess, explicitly chosen source type, exact Central Control Scope when inherited, validity, and optional local execution fields. Use the Context-independent Central Control Scope selector in section 8.1. Call atomic `/control-assignments` once, then navigate to Controls with returned Context and Local Scope. An inactive/deleted existing Context is an error requiring explicit Context action.
- Add a separately labeled read-only Local assignments section in `CentralRiskObjectPage.tsx` for `kind=template`, `CentralControlObjectiveObjectPage.tsx`, and `CentralRegulationObjectPage.tsx` for a Requirement. Use their exact reverse routes; do not repurpose assessment or Central Coverage tabs.
- Add four separately permission-gated read-only Local Policy decision sections in `CentralPolicyObjectPage.tsx` for Policy nodes. Keep its four existing Central relation editors and aggregate Save intact.
- Assignment is available in Central View mode. In Central edit mode, require handling existing unsaved Central/Document state before opening/navigating through assignment; do not implicitly save/discard it. Do not require Central MANAGE permissions for a Local write when the matrix only requires Central VIEW.

Use UI5 components, Persian and English i18n, and existing Persian DatePicker with Gregorian API values. All interactive buttons, labels, dialogs, validation and empty/error text need keys. Use useful loading, empty, forbidden, failed, stale-version, and retry states. Scope source/identity fields become read-only after create. Dates with invalid visible input keep that draft visible and prevent Save.

## 11. Complete Local Document activation

The Local wire codes in section 3 already exist in Backend and frontend enums. Activate exactly those 13 targets; do not unlock the still-unavailable Central relation targets as a side effect. `MASTERDATA_REVISION` remains backend-only and prohibited to browser requests.

The integration must cover all of the following, not only the two files named in the original Prompt 8:

1. `JdbcDocumentTargetContextResolver.resolvePublic`: add a fixed typed SQL branch for each Local target. Resolve the owning Organization through the exact chain in the table below. Require the exact Local target row to exist and be non-DELETED. Do not substitute a target selected by arbitrary client table/column names.
2. `JdbcDocumentTargetContextResolver.assertMutable`: add exact-row `FOR UPDATE` handling for each Local target and require that target non-DELETED under the lock. This lock must be held in the existing Document transaction through completion. Do not add hierarchy mutation or a Local Revision to a Document command.
3. `DocumentCatalogPermissions`: map Local VIEW token to `MD_REFERENCE_VIEW`, mutation token to `MD_REFERENCE_MANAGE`. These are owner-Area tokens only; the full multi-Area check must still run in the authorization service below.
4. `DocumentAuthorizationService`: recognize every Local wire code and enforce the complete family matrix from section 6 for `DOCUMENT_VIEW`/`DOCUMENT_DOWNLOAD`/`MD_REFERENCE_VIEW` and `DOCUMENT_UPLOAD`/`DOCUMENT_DELETE`/`MD_REFERENCE_MANAGE`. Reject unrecognized permissions. Do not authorize all Local Documents merely because REFERENCE permission is present.
5. For calls that receive only raw target wire code/ID, including `DocumentCommandService.requireReadableSourceVersion`, verify typed target existence/owning Organization as well as the full Area combination. Check permission combination before resolving a Local target; inaccessible/missing/deleted targets return false in boolean accessible-link checks. Do not treat a historical active Document Link pointing at a DELETED Local target as proof of source access.
6. Preserve `DocumentReadService` per-version accessible-link filtering, secure download checks, source-version access on link-existing, active link requirements on add-version, target mutation authorization, uploader ownership, and temporary upload single-use behavior. Exercise the same new Local authorization branch in all those paths; do not protect just list/finalization while leaving download/link-existing with weaker checks.

| Local target | Ownership lookup |
| --- | --- |
| Context | Context → `organization_id` |
| Four Local Scopes | exact Scope → Context → Organization |
| Four Local Coverages | exact Coverage → Context → Organization; keep typed endpoint/context integrity |
| Organization Policy | exact Policy decision → `organization_id` |
| Context Policy | exact Policy decision → Context → Organization |
| Control Policy | exact Policy decision → Local Control Scope → Context → Organization |
| Requirement Policy | exact Policy decision → Local Requirement Scope → Context → Organization |

Keep `DocumentTargetContext.targetType/targetId` equal to the exact Local row. Its authorization resource type remains the Local wire code and its resource ID the exact Local target ID, so the full family is available to authorization. Resolve/verify Organization internally; do not flatten Local targets to `ORG` and lose their additional Area requirements. The existing unused `local(...)` helper currently reads an Organization ID without using it for authorization; copying that helper alone does not complete this requirement.

Stored INACTIVE Local targets remain readable and document-mutable with the required permissions, matching existing non-DELETED Document semantics. DELETED target Documents are unavailable until explicit Local restore; existing Document/Version/Link rows are retained. Do not calculate effective target status from Central validity or lifecycle. Exact-target locking coordinates Document mutation against Local target deletion without changing the Local row's version.

Mount `DocumentManager` in selected saved Local row detail with the exact wire code and UUID, `persistenceMode="STANDALONE"`, correct `readOnly/showActions`, and dirty-state callbacks. Unsaved Local create drafts display save-first and do not upload for an invented target. Download remains available to authorized viewers. Organization's existing `DocumentManager` remains `PARENT_SAVE` with `ORG`. Do not add Document drafts to Local DTOs, do not add Local Revision Content for Document changes, and do not expose MinIO details.

## 12. Concrete implementation order

Complete these steps in order within this delivery; they are not permission to defer later steps:

1. Add the 13 entity mappings/repositories and exact managed-type registrations. Add explicit typed Local enums/converters only for the existing stored vocabularies.
2. Implement Local permission helpers, concrete ownership reads, status/date/source validators, error messages, and Local dependency checks. Reuse existing shared primitives without a generic relation framework.
3. Implement Context and Control Scope commands, including atomic assignment and one/two-content LOCAL Revision semantics.
4. Implement the other three Scopes, four Coverages, and four Policy families with all typed commands/read DTOs. Add the exact options and reverse endpoints.
5. Complete all six Document integration points in section 11 and keep existing Central/ORG flows intact.
6. Add Local TypeScript types/repositories/services/state/permission hooks and Organization editors; integrate deep links and the shared dirty guard.
7. Add Central assignment dialogs and typed reverse sections. Finish all Persian/English labels and localized backend errors.
8. Perform the allowed checks and inspect the final diff against every acceptance item. Fix build/lint/contract issues within this scope before reporting completion.

Important existing integration files include:

- `grcpc-app/src/main/java/com/digiaudit/grcpc/runtime/GrcpcPersistenceConfiguration.java`
- `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/masterdata/revision/application/TransactionalMasterDataRevisionCoordinator.java` (reuse; do not replace its protocol)
- `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/masterdata/shared/application/MasterDataStructuralDependencyChecker.java` (preserve Central checks)
- `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/document/infrastructure/target/JdbcDocumentTargetContextResolver.java`
- `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/document/application/DocumentCatalogPermissions.java`
- `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/document/application/DocumentAuthorizationService.java`
- `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/document/application/DocumentCommandService.java`
- `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/document/application/DocumentReadService.java`
- `grcpc-ui/src/features/organization/pages/OrganizationObjectPage.tsx`
- `grcpc-ui/src/features/organization/pages/OrganizationsFclShellPage.tsx`
- `grcpc-ui/src/features/process/pages/ProcessObjectPage.tsx`
- `grcpc-ui/src/features/control/pages/CentralControlObjectPage.tsx`
- `grcpc-ui/src/features/risk/pages/CentralRiskObjectPage.tsx`
- `grcpc-ui/src/features/control-objective/pages/CentralControlObjectiveObjectPage.tsx`
- `grcpc-ui/src/features/regulation/pages/CentralRegulationObjectPage.tsx`
- `grcpc-ui/src/features/policy/pages/CentralPolicyObjectPage.tsx`
- `grcpc-ui/src/features/document/components/DocumentManager.tsx` (reuse existing standalone mode)
- `grcpc-ui/src/features/master-data/security/masterDataAccess.ts` (reuse its Area checks)

Update scoped Organization/Document guidance and the relevant master-data API/authorization/dependency documentation only to describe the delivered Local behavior and this explicit Local Create exception. Do not rewrite historical migrations or unrelated design decisions. Do not change global Central lifecycle behavior to match the new Local command interface.

## 13. Acceptance inventory

Report every row below as implemented / not implemented, with file/route evidence. “Implemented” is not a claim of runtime/concurrency verification.

| ID | Required outcome |
| --- | --- |
| A01 | All 13 tables have concrete entity, repository, DTO, read, write, lifecycle and managed-type registration; no database change |
| A02 | Central Subprocess assignment creates only an explicit Local Context and opens its Organization tab |
| A03 | Central Control assignment requires exact Subprocess/source, creates the Local Control Object, atomically creates only a missing Context, and returns both IDs/versions |
| A04 | Existing INACTIVE/DELETED Context is rejected without automatic lifecycle change; all reserved keys follow explicit Local duplicate/restore rules |
| A05 | Exactly one LOCAL Revision per Local command, correct Organization, typed before/after contents, Context-before-Control ordering, rollback on failure |
| A06 | Immutable source/identity, conditional Central FK, inherited matching, cross-Context validation and composite-FK-compatible mapping |
| A07 | Explicit lifecycle matrix, date/null containment rules, independent Coverage validity, user/code validation and stable errors |
| A08 | Complete fixed Guards before reads, targeted reference/Local locks, same REQUIRED transaction, stale-version checks; no new Guard or concurrency mechanism |
| A09 | Local deletion blockers added; existing Central deletion behavior, including historical Local blockers, preserved |
| A10 | Every list/detail/deleted/options/reverse/mutation/Document route enforces its full Area combination without unauthorized IDs/labels/counts |
| A11 | All six Organization tabs work with persisted typed data and independent permitted sections; Organization Policy works without Context/PROCESS permission |
| A12 | Correct Coverage editor ownership/read-only links, Requirement—not Regulation—Local relation, four separate Policy targets |
| A13 | Deep links, browser refresh/back, Context/row selection, FCL expansion, dirty/invalid-date drafts and conflict feedback are integrated |
| A14 | Local Save does not change Organization version or submit/clear Central aggregate drafts; General Information and ORG Documents keep existing aggregate Save |
| A15 | Central assignment and all seven reverse route families navigate to exact Organization/Context/target/row without taking Local write ownership |
| A16 | All 13 Document targets resolve and authorize list/download/upload/link-existing/add-version/metadata/link lifecycle; no Local Revision from Documents |
| A17 | Persian/English i18n, RTL, UI5 controls, loading/empty/forbidden/error states and real API persistence; no mock or unfinished authorized tab |
| A18 | Excluded operational/read-model features, tests, migrations, Central contracts and generated tracked output remain untouched |

## 14. Allowed verification and final report

This task forbids tests. Do not reinterpret that as permission to run test-like scripts under another name. Build checks do not prove Oracle startup, HTTP behavior, authorization correctness, Document storage flow, rollback, or concurrency. Record those runtime properties as **not executed under the no-tests constraint** unless independently supplied prior evidence applies to the exact delivered code; do not reuse baseline evidence as if it verified newly added code.

Allowed commands on Windows:

```powershell
# From grcpc-app; package includes compilation and skips both test compilation and execution.
.\mvnw.cmd -Dskip.ui=true -Dmaven.test.skip=true package

# From grcpc-ui; build already invokes TypeScript typecheck.
npm run lint
npm run build -- --outDir ../.codex-build/prompt-8-ui

# From repository root.
git diff --check
git status --short
```

Before build, verify the output directory is inside the repository's `.codex-build` directory and not a symlink/reparse point to user data. Do not remove unrelated output. Avoid `npm run build` without the output override because generated UI assets are outside this task. Do not use `clean` merely to change build behavior. Backend package with `skip.ui=true` is a compile/package check; it is not a combined deployment of the newly built frontend.

Perform static review of all route/DTO pairs, permission predicates, managed-type entries, migration diff, Guard call ordering and transaction propagation, exact typed ownership SQL, before/after snapshots, Local-only version writes, and full Document call paths. Do not claim static inspection is real concurrent-transaction verification.

Final delivery report must include:

1. Exact changed files and delivered route inventory, not only folder names.
2. Behavior of each of the six Organization tabs and each Central entry/reverse view.
3. A01–A18 outcome with any unmet item stated directly.
4. Guard keys per entry point, targeted-row lock order, Revision ownership, and transaction boundary.
5. Exact commands, exit/results, build limitations, and explicit statement that tests and runtime concurrency checks were not run.
6. Schema/configuration impact: no migrations or database structure changes; new JPA managed types and Backend/UI contract must be deployed together.

Do not replace an unmet requirement with a disabled tab, placeholder, mock response, implicit future work, or a claim that passing package/lint/build guarantees no regressions. If the existing environment prevents an allowed check, report the concrete blocker and completed checks without changing database/security configuration to force a pass.
