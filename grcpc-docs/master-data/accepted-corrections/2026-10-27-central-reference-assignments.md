# Accepted correction: Central reference Assignments

Accepted by the project owner on 2026-10-27. This correction supersedes older restrictions on direct central relationships and fixed business-table counts only for the four explicitly named Assignment families below. Historical reference documents remain unchanged.

## Meaning and boundaries

- OrganizationObjective is the existing local scope of a business Objective in an Organization. It needs no Subprocess or Context; retain its table, IDs, API and behavior.
- Business Objective and Central Control Objective remain independent catalogs.
- Existing Global Control–Regulation links and Document links are conceptually Assignments. Their efficient typed implementations remain unchanged.
- Policy retains Organization, Subprocess, exact Control Scope and exact Requirement Scope applicability, both Central and Local; Policy Group membership remains structural.
- Existing Central and Local Coverage tables, data, Revision codes, APIs and dependency protections remain intact. Coverage has no mounted UI entry point in this phase. Removing its form components sends no Coverage deletion or conversion. Empty/omitted Coverage change sets remain no-ops.

## Four typed, direct Central relationships

| Table | Exact pair, unique across ALL lifecycle states | Aggregate owner | Meaning | CENTRAL Revision stored code |
| --- | --- | --- | --- | --- |
| central_risk_control_assignment | risk_template_id + control_id | Control | Control mitigates Risk Template | CENTRAL_RISK_CONTROL_ASG |
| central_risk_control_objective_assignment | risk_template_id + control_objective_id | Control Objective | Risk Template threatens Control Objective | CENTRAL_RISK_OBJECTIVE_ASG |
| central_control_control_objective_assignment | control_id + control_objective_id | Control | Control supports Control Objective | CENTRAL_CONTROL_OBJECTIVE_ASG |
| central_requirement_control_assignment | requirement_id + control_id | Control | Control fulfills Regulation Requirement | CENTRAL_REQUIREMENT_CONTROL_ASG |

Each pair has one row, read from both endpoints. None includes organizationId, subprocessId, contextId or Scope IDs. No reverse duplicate, generated Scope/Coverage, generic target_type/target_id, weight, percentage, score or effectiveness field is permitted.

V1189 adds four business tables using the existing classification UUID/lifecycle/audit/validity/version/soft-delete profile, direct central-definition FKs, occupied-pair uniqueness, destination FK indexes, date-range and deletion-metadata constraints. The pair unique index covers its leading owner FK. Deleted pairs must be restored, never duplicated. No technical table or Guard row is added. The new count is 54 active business tables + one retained historical Policy Version table + two technical tables = 57 physical tables. Revision Entity Type has 54 codes; the Document target vocabulary remains 43.

## Commands and reads

Control Create/Update accepts nullable typed riskAssignments, controlObjectiveAssignments and requirementAssignments arrays. Control Objective Create/Update accepts nullable typed riskAssignments. Empty/omitted arrays do not mutate assignments. Each item uses operation, the destination ID, assignmentId/version for existing-row operations, nullable validFrom/validTo, and optional requestedStatus for UPDATE. Operations are CREATE_OR_RESTORE, UPDATE, ACTIVATE, INACTIVATE, DELETE and RESTORE. A repeated destination in one collection is rejected. CREATE_OR_RESTORE preserves the occupied row ID for inactive/deleted pairs; an already active pair is DUPLICATE_RELATION. UPDATE/lifecycle commands require exact row identity and version. An identical assignment UPDATE contributes no mutation; an otherwise empty owner Save returns NO_CHANGE.

General Information, Documents, current classifications and assignments share the existing owning aggregate Save. Assignment-only changes touch the owner's version. Exactly one CENTRAL Business Revision contains owner-first Revision Content, existing classification contents, then changed typed assignment contents in Control Risk / Control Objective / Requirement order (or Control Objective Risk order), sorted by exact destination ID within each family. Documents retain their existing transaction behavior outside Revision Content. The aggregate response includes canonical typed non-deleted assignments, filtered by read authority.

All paths below are rooted at /api/master-data/central. They are GET-only; no standalone assignment mutation endpoint exists.

| Owner read (also /deleted) | Inverse read | Typed options |
| --- | --- | --- |
| controls/{id}/risk-assignments | risk-templates/{id}/control-assignments | risk-control-assignment/options |
| control-objectives/{id}/risk-assignments | risk-templates/{id}/control-objective-assignments | risk-control-objective-assignment/options |
| controls/{id}/control-objective-assignments | control-objectives/{id}/control-assignments | control-control-objective-assignment/options |
| controls/{id}/requirement-assignments | regulation-requirements/{id}/control-assignments | requirement-control-assignment/options |

Reads expose both endpoint IDs, codes, names, statuses and validity plus relation lifecycle, validity, version and audit metadata. Options exclude deleted definitions; inactive definitions remain visible but cannot be newly selected. Create/reactivate/restore requires both endpoints ACTIVE. UPDATE and other lifecycle validation follow the reference classification profile. Validity is nullable and inclusive, with only the relationship's own range check; no Scope containment or Subprocess eligibility is introduced.

## Authorization

- Risk–Control and Risk–Control Objective reads require CONTROL + RISK view.
- Requirement–Control reads require CONTROL + GOVERNANCE view.
- Control–Control Objective reads require CONTROL view.
- Mutation requires CONTROL manage for the owning Control/Control Objective and destination-area view. PROCESS and Organization authority are not required.

## Guard, row locks, dependencies and transaction

The existing TransactionalMasterDataRevisionCoordinator owns the single Spring database transaction. It acquires the complete Guard union in ascending lexical key order BEFORE reading hierarchy eligibility or dependencies. Guards stay in RevisionExecutionContext until commit/rollback.

| Entry point | Guard union |
| --- | --- |
| Control Create/Update | CONTROL; add RISK for riskAssignments, REGULATION for requirementAssignments, ACCOUNT_GROUP for classification changes |
| Control Objective Create/Update | RISK for riskAssignments; add ACCOUNT_GROUP for classification changes; no independent Objective Guard |
| Control lifecycle incl. Delete/Restore | ACCOUNT_GROUP, CONTROL, REGULATION, RISK |
| Control Objective lifecycle incl. Delete/Restore | ACCOUNT_GROUP, CONTROL, RISK, then targeted Control Objective row lock |
| Risk Template lifecycle incl. Delete/Restore | CONTROL, RISK |
| Requirement lifecycle incl. Delete/Restore | CONTROL, REGULATION |

After all Guards, acquire only affected definition rows in Control, Risk Template, Control Objective, Requirement order, then ascending database ID within each type. Control Save locks the owner first, then the requested risk/objective/requirement union before preparing any relationship. Control Objective Save locks requested Risk Templates before locking/finding its owner. Assignment prepare reads already locked targets; it does not acquire an earlier endpoint lock. Existing classification locks follow while retaining ACCOUNT_GROUP in the Guard union. Relation rows are locked by occupied pair in destination-ID order. Lifecycle commands lock their one affected endpoint and use guarded dependency reads; they do not lock inverse endpoints after it.

Any non-DELETED Assignment blocks deletion of either definition, including INACTIVE relations. No cascade, hidden relation delete, or lifecycle propagation is allowed. Guard and targeted-row protection serialize assignment eligibility against endpoint lifecycle/deletion. Source changes, owner version, Documents, Assignment rows and Business Revision persistence all commit or roll back together. Missing Guard/timeout/version/duplicate/eligibility failures remain controlled errors, without silent retry.

## UI contract

- Subprocess retains four Scopes, derived Account Groups, General Information and Documents; Coverage has no component, state, validation, readiness, dirty or outgoing Save field.
- Organization retains Contexts, Scopes, Organization Objectives, Policy Scope and Documents. Coverage managers and LocalLinkedCoverageList never mount. Coverage localSection deep links select the first authorized section of the same tab (or General Information if none is authorized) and clear contextId/localRowId/policyTargetId/localStatus.
- Control owns editable Risks, Requirements and Control Objectives assignment tabs in Create/Edit.
- Control Objective owns editable Risks and read-only inverse Controls.
- Risk Template Control Center shows separate read-only inverse Controls and Control Objectives.
- Requirement Controls is a read-only inverse list.
- Inverse rows link to the owner. View is read-only. Selection/validity/lifecycle/delete/restore work is held as typed local drafts until owner Save. Pending selections and invalid visible date drafts participate in dirty/navigation protection and Save readiness.
- Tables show related name/code/status/validity and relationship status/validity. No Organization, Subprocess or Scope column is shown. No Assignment feature is labeled Coverage. The shared CoverageInverseTable used for Control Objective Scope remains intact.

## Verification scope for this delivery

No tests were created, modified or executed. No application, Flyway, browser, Oracle/MinIO connection or real concurrent transaction verification is authorized. Only backend compile with -Dskip.ui=true -Dmaven.test.skip=true, UI typecheck and UI lint are allowed. Compile/typecheck are not evidence of concurrency correctness. Oracle migration execution and real concurrency validation remain unperformed in this delivery.

Delivery results: UI typecheck and lint passed. Backend compile was attempted using the authorized command but Maven wrapper stopped because JAVA_HOME is invalid; no environment setup or installation was attempted. The original staged user files were retained, and unrelated concurrent workspace edits were left intact.
