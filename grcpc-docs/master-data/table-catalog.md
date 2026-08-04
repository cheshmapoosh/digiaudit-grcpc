# Master Data V2 Table Catalog

## Catalog authority and count rule

This catalog is rebuilt from the Final Logical Model, §5, §6–§14, the Physical Design Reference, §4–§20, the Prompt 3.3 project-owner Document scope correction, and ADR-0001. The corrections govern the exact Document and hierarchy Guard physical scope for implementation. The active catalog contains 45 business-table names and relationships plus two technical tables.

Authoritative source files: `GRC_Master_Data_Logical_Model_Final_FA.docx` and `GRC_Master_Data_Physical_Design_Reference_FA.docx`; business meaning is cross-checked against `GRC_Master_Data_Reference_Conceptual_Model_FA.docx`.

No table below is inferred merely to satisfy a count. The business list is exactly the 14 + 13 + 13 + 3 + 2 active implementation structures. The two technical tables are outside that count.

Document non-invention rule: there is no Retention Policy table, no Hold table, and no purge-state persistence model in Master Data V2. No future implementation prompt may recreate these concepts without a new explicit approved design decision.

### Shared physical profile and notation

| Notation | Meaning |
| --- | --- |
| `ID` | `id RAW(16) NOT NULL`, a Backend-generated UUID and single-column primary key. |
| `L+V` | Common lifecycle and validity profile: `status VARCHAR2(32 BYTE) NOT NULL`, nullable `valid_from DATE` and `valid_to DATE`, `created_at/updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL`, `created_by/updated_by RAW(16) NOT NULL`, nullable `deleted_at/deleted_by`, and `version NUMBER(19,0) NOT NULL DEFAULT 0`. It applies where the logical model gives the record a normal lifecycle. |
| `L` | Lifecycle/audit profile without a separately documented validity interval; general status and soft-delete rules apply where the table has a normal lifecycle. |
| `RV` | Revision-specific lifecycle: domain status, audit timestamps/actors, and optimistic-lock `version`; it is not the generic `status` lifecycle. |
| `CLOB JSON` | `CLOB` with an `IS JSON` constraint. |
| Logical user reference | `RAW(16)` identifier with no mandatory cross-module FK to User Management. |

Unless a table entry states a narrower rule, the following are binding physical conventions:

- UUIDs are Backend-generated and stored as `RAW(16)`; no sequence or trigger generates them.
- Code values use `VARCHAR2(64 BYTE)`; titles/labels use `VARCHAR2(255 CHAR)`; short notes use `VARCHAR2(1000 CHAR)`; descriptions and long content use `CLOB`.
- Business dates use `DATE`, are nullable where specified, have no time component, and must satisfy `valid_from <= valid_to` when both exist.
- Technical timestamps use `TIMESTAMP(6) WITH TIME ZONE`; `version` uses `NUMBER(19,0)` and is the optimistic-lock field.
- A deleted business key remains unique. A matching inactive row is reactivated and a matching deleted row is restored, rather than inserting a duplicate.
- Normal physical delete and `ON DELETE CASCADE` are prohibited. Command services perform explicit soft delete and restore; hidden JPA `@SQLDelete` is prohibited.
- Every foreign key has an index unless a PK or unique index already covers it with the correct leading columns. Do not create a status-only or bitmap index.
- Constraint names follow `pk_<table>`, `fk_<child>_<parent_or_role>`, `uk_<table>_<business_key>`, and `ck_<table>_<rule>`; all names are lower-case singular snake case in unquoted DDL.
- `created_by`, `updated_by`, `deleted_by`, and `actual_owner_id` are logical user identifiers, not forced cross-module foreign keys.
- “No undocumented attributes” means the approved models do not prescribe additional field names. Customer UI fields may be assessed later, but they do not authorize a new column or relation without a compatible detailed design decision.

## Controlled polymorphic stored-code vocabularies

The approved models authorize exactly two controlled polymorphic relations in the Master Data V2 physical scope:

- `document_link.target_type` + `document_link.target_id`;
- `masterdata_revision_content.entity_type` + `masterdata_revision_content.entity_id`.

The Conceptual, Logical, and Physical reference documents define the controlled polymorphic boundaries and require controlled type values. They do not enumerate the final persisted stored-code strings. The stored-code values below are the implementation-locked physical/application contract accepted by the Oracle and Java implementation after Prompt 3 and Prompt 3.1. This decision does not add a table, entity, relationship, read model, or business capability.

Stored codes are stable uppercase ASCII values stored in `VARCHAR2(32 BYTE)`. Every stored code must be unique inside its own vocabulary, non-blank, and at most 32 ASCII bytes. A persisted stored-code rename is a compatibility-sensitive schema and application-contract change, not a harmless Java refactor. Java class names, full table names, browser-supplied strings, and dynamic entity-name inference are not valid substitutes for these locked values.

### Revision Entity Type stored-code vocabulary

`masterdata_revision_content.entity_type` uses exactly these 43 values. This is the only Revision Content entity-type vocabulary.

| Stored code | Exact catalog table | Permitted Revision domain |
| --- | --- | --- |
| `ORG` | `organization` | `CENTRAL` |
| `CENTRAL_PROCESS` | `central_process` | `CENTRAL` |
| `CENTRAL_SUBPROCESS` | `central_subprocess` | `CENTRAL` |
| `CENTRAL_CONTROL` | `central_control` | `CENTRAL` |
| `CENTRAL_CONTROL_OBJECTIVE_DEF` | `central_control_objective` | `CENTRAL` |
| `CENTRAL_RISK_CATEGORY` | `central_risk_category` | `CENTRAL` |
| `CENTRAL_RISK_TEMPLATE` | `central_risk_template` | `CENTRAL` |
| `CENTRAL_ACCOUNT_GROUP` | `central_account_group` | `CENTRAL` |
| `CENTRAL_REGULATION_GROUP` | `central_regulation_group` | `CENTRAL` |
| `CENTRAL_REGULATION` | `central_regulation` | `CENTRAL` |
| `CENTRAL_REQUIREMENT` | `central_regulation_requirement` | `CENTRAL` |
| `CENTRAL_POLICY_GROUP` | `central_policy_group` | `CENTRAL` |
| `CENTRAL_POLICY` | `central_policy` | `CENTRAL` |
| `CENTRAL_POLICY_VERSION` | `central_policy_version` | `CENTRAL` |
| `CENTRAL_CONTROL_SCOPE` | `central_subprocess_control_scope` | `CENTRAL` |
| `CENTRAL_RISK_SCOPE` | `central_subprocess_risk_scope` | `CENTRAL` |
| `CENTRAL_OBJECTIVE_SCOPE` | `central_subprocess_control_objective_scope` | `CENTRAL` |
| `CENTRAL_REQUIREMENT_SCOPE` | `central_subprocess_requirement_scope` | `CENTRAL` |
| `CENTRAL_POLICY_SUBPROCESS` | `central_policy_version_subprocess_scope` | `CENTRAL` |
| `CENTRAL_POLICY_CONTROL` | `central_policy_version_control_scope` | `CENTRAL` |
| `CENTRAL_POLICY_REQUIREMENT` | `central_policy_version_requirement_scope` | `CENTRAL` |
| `CENTRAL_CONTROL_ACCOUNT_GROUP` | `central_control_account_group` | `CENTRAL` |
| `CENTRAL_OBJECTIVE_ACCOUNT_GROUP` | `central_control_objective_account_group` | `CENTRAL` |
| `CENTRAL_RISK_CONTROL_COV` | `central_subprocess_risk_control_coverage` | `CENTRAL` |
| `CENTRAL_RISK_OBJECTIVE_COV` | `central_subprocess_risk_control_objective_coverage` | `CENTRAL` |
| `CENTRAL_CONTROL_OBJECTIVE_COV` | `central_subprocess_control_control_objective_coverage` | `CENTRAL` |
| `CENTRAL_REQUIREMENT_CONTROL_COV` | `central_subprocess_requirement_control_coverage` | `CENTRAL` |
| `LOCAL_CONTEXT` | `local_organization_subprocess_scope` | `LOCAL` |
| `LOCAL_CONTROL_SCOPE` | `local_subprocess_control_scope` | `LOCAL` |
| `LOCAL_RISK_SCOPE` | `local_subprocess_risk_scope` | `LOCAL` |
| `LOCAL_OBJECTIVE_SCOPE` | `local_subprocess_control_objective_scope` | `LOCAL` |
| `LOCAL_REQUIREMENT_SCOPE` | `local_subprocess_requirement_scope` | `LOCAL` |
| `LOCAL_RISK_CONTROL_COV` | `local_subprocess_risk_control_coverage` | `LOCAL` |
| `LOCAL_RISK_OBJECTIVE_COV` | `local_subprocess_risk_control_objective_coverage` | `LOCAL` |
| `LOCAL_CONTROL_OBJECTIVE_COV` | `local_subprocess_control_control_objective_coverage` | `LOCAL` |
| `LOCAL_REQUIREMENT_CONTROL_COV` | `local_subprocess_requirement_control_coverage` | `LOCAL` |
| `LOCAL_POLICY_ORG` | `local_policy_organization_scope` | `LOCAL` |
| `LOCAL_POLICY_SUBPROCESS` | `local_policy_subprocess_scope` | `LOCAL` |
| `LOCAL_POLICY_CONTROL` | `local_policy_control_scope` | `LOCAL` |
| `LOCAL_POLICY_REQUIREMENT` | `local_policy_requirement_scope` | `LOCAL` |
| `DOCUMENT` | `document` | `CENTRAL` or `LOCAL`, according to owning Business Command context |
| `DOCUMENT_VERSION` | `document_version` | `CENTRAL` or `LOCAL`, according to owning Business Command context |
| `DOCUMENT_LINK` | `document_link` | `CENTRAL` or `LOCAL`, according to owning Business Command context |

Revision Entity Type rules:

- Codes mapped to catalog tables `01` through `27` are permitted in Central revisions according to the current domain enum.
- Codes mapped to catalog tables `28` through `40` are permitted in Local revisions.
- `DOCUMENT`, `DOCUMENT_VERSION`, and `DOCUMENT_LINK` remain recorded stored-code values, but the Prompt 4.2 Document command flow does not create Revision Content for temporary upload, Document, Document Version, or Document Link mutation.
- `MASTERDATA_REVISION` is not a Revision Content entity type.
- `masterdata_revision` and `masterdata_revision_content` do not revise themselves.
- `document_temp_upload` is technical and is not Revision Content.
- Effective, Diagnostic, Roll-up, and Policy Applicability read models are not Revision Content types.

### Document Link Target Type stored-code vocabulary

`document_link.target_type` uses a separate vocabulary from `RevisionEntityType`. Reusing the same stored code for the same logical table does not make the two domain types interchangeable.

`document_link.target_type` uses exactly these 41 values.

| Stored code | Exact target table | Target class |
| --- | --- | --- |
| `ORG` | `organization` | Normal Master Data |
| `CENTRAL_PROCESS` | `central_process` | Normal Master Data |
| `CENTRAL_SUBPROCESS` | `central_subprocess` | Normal Master Data |
| `CENTRAL_CONTROL` | `central_control` | Normal Master Data |
| `CENTRAL_CONTROL_OBJECTIVE_DEF` | `central_control_objective` | Normal Master Data |
| `CENTRAL_RISK_CATEGORY` | `central_risk_category` | Normal Master Data |
| `CENTRAL_RISK_TEMPLATE` | `central_risk_template` | Normal Master Data |
| `CENTRAL_ACCOUNT_GROUP` | `central_account_group` | Normal Master Data |
| `CENTRAL_REGULATION_GROUP` | `central_regulation_group` | Normal Master Data |
| `CENTRAL_REGULATION` | `central_regulation` | Normal Master Data |
| `CENTRAL_REQUIREMENT` | `central_regulation_requirement` | Normal Master Data |
| `CENTRAL_POLICY_GROUP` | `central_policy_group` | Normal Master Data |
| `CENTRAL_POLICY` | `central_policy` | Normal Master Data |
| `CENTRAL_POLICY_VERSION` | `central_policy_version` | Normal Master Data |
| `CENTRAL_CONTROL_SCOPE` | `central_subprocess_control_scope` | Normal Master Data |
| `CENTRAL_RISK_SCOPE` | `central_subprocess_risk_scope` | Normal Master Data |
| `CENTRAL_OBJECTIVE_SCOPE` | `central_subprocess_control_objective_scope` | Normal Master Data |
| `CENTRAL_REQUIREMENT_SCOPE` | `central_subprocess_requirement_scope` | Normal Master Data |
| `CENTRAL_POLICY_SUBPROCESS` | `central_policy_version_subprocess_scope` | Normal Master Data |
| `CENTRAL_POLICY_CONTROL` | `central_policy_version_control_scope` | Normal Master Data |
| `CENTRAL_POLICY_REQUIREMENT` | `central_policy_version_requirement_scope` | Normal Master Data |
| `CENTRAL_CONTROL_ACCOUNT_GROUP` | `central_control_account_group` | Normal Master Data |
| `CENTRAL_OBJECTIVE_ACCOUNT_GROUP` | `central_control_objective_account_group` | Normal Master Data |
| `CENTRAL_RISK_CONTROL_COV` | `central_subprocess_risk_control_coverage` | Normal Master Data |
| `CENTRAL_RISK_OBJECTIVE_COV` | `central_subprocess_risk_control_objective_coverage` | Normal Master Data |
| `CENTRAL_CONTROL_OBJECTIVE_COV` | `central_subprocess_control_control_objective_coverage` | Normal Master Data |
| `CENTRAL_REQUIREMENT_CONTROL_COV` | `central_subprocess_requirement_control_coverage` | Normal Master Data |
| `LOCAL_CONTEXT` | `local_organization_subprocess_scope` | Normal Master Data |
| `LOCAL_CONTROL_SCOPE` | `local_subprocess_control_scope` | Normal Master Data |
| `LOCAL_RISK_SCOPE` | `local_subprocess_risk_scope` | Normal Master Data |
| `LOCAL_OBJECTIVE_SCOPE` | `local_subprocess_control_objective_scope` | Normal Master Data |
| `LOCAL_REQUIREMENT_SCOPE` | `local_subprocess_requirement_scope` | Normal Master Data |
| `LOCAL_RISK_CONTROL_COV` | `local_subprocess_risk_control_coverage` | Normal Master Data |
| `LOCAL_RISK_OBJECTIVE_COV` | `local_subprocess_risk_control_objective_coverage` | Normal Master Data |
| `LOCAL_CONTROL_OBJECTIVE_COV` | `local_subprocess_control_control_objective_coverage` | Normal Master Data |
| `LOCAL_REQUIREMENT_CONTROL_COV` | `local_subprocess_requirement_control_coverage` | Normal Master Data |
| `LOCAL_POLICY_ORG` | `local_policy_organization_scope` | Normal Master Data |
| `LOCAL_POLICY_SUBPROCESS` | `local_policy_subprocess_scope` | Normal Master Data |
| `LOCAL_POLICY_CONTROL` | `local_policy_control_scope` | Normal Master Data |
| `LOCAL_POLICY_REQUIREMENT` | `local_policy_requirement_scope` | Normal Master Data |
| `MASTERDATA_REVISION` | `masterdata_revision` | Backend-owned Revision metadata |

Document Link Target Type rules:

- Document Link supports catalog tables `01` through `40` as normal Master Data targets, subject to command authorization and target-existence validation.
- `MASTERDATA_REVISION` is the only exceptional target and is Backend-controlled metadata for the same owning DRAFT Revision.
- The Browser must not independently choose or provide `MASTERDATA_REVISION` as a normal document target.
- Document business tables `41` through `43` are not permitted Document Link targets.
- `masterdata_revision_content` is not a permitted Document Link target.
- `document_temp_upload` is not a permitted Document Link target.
- Effective, Diagnostic, Roll-up, and Policy Applicability read models are not permitted targets.
- Workflow, Audit, monitoring, job, scheduler, cache, outbox, KPI, KRI, arbitrary table names, Java class names, and browser free text are not permitted targets.
- Backend validation must verify that the target exists and is allowed for the current command context.

## 1. Structural and Central Definitions — 14 business tables

### 01. `organization`

**Purpose and family.** Structural organization tree and the organizational anchor for all Local Context; it is not a Central-prefixed definition.

**Fields.** `ID`; documented business code; `parent_organization_id RAW(16) NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique organization code, including deleted rows. FK: `parent_organization_id -> organization(id)`. No composite FK.

**Lifecycle, validity, and lock.** `L+V`; `version` is the optimistic-lock field. A root may have a null parent.

**Constraints and indexes.** Unique code; `parent_organization_id <> id`; backend hierarchy-cycle validation; parent FK index; date and soft-delete consistency checks from the shared profile.

**Mutability and Revision.** Central-domain structural mutation only, through a Backend-owned Central revision. Roll-up reads descendants but never changes their ownership or rows.

**Authority / non-invention note.** Final Logical Model §5-1 and §16; Conceptual Model organization boundary; Physical Design §5–§10. The logical model specifies a unique code and parent relation; no additional organization attributes are enumerated here.

### 02. `central_process`

**Purpose and family.** Central process hierarchy; a Process can parent a Process or a Subprocess, while Scope and Coverage never attach directly to this table.

**Fields.** `ID`; `code VARCHAR2(64 BYTE) NOT NULL`; `title VARCHAR2(255 CHAR) NOT NULL`; `parent_process_id RAW(16) NULL`; `description CLOB NULL`; `sort_order NUMBER(10,0) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `code`, including deleted rows. FK: `parent_process_id -> central_process(id)`. No composite FK.

**Lifecycle, validity, and lock.** `L+V`; `version` locks process moves and edits.

**Constraints and indexes.** Unique code; self-parent prohibition; `sort_order >= 0`; backend full-cycle validation before applying a revision; parent FK index.

**Mutability and Revision.** Central-only mutation through a Central revision. Moving a process requires cycle validation and impact analysis where Central dependencies are affected.

**Authority / non-invention note.** Final Logical Model §6-1 explicitly supplies the fields; Physical Design §4, §9, §10 supplies types/checks/index rules.

### 03. `central_subprocess`

**Purpose and family.** Central leaf subprocess; it is the sole Central hierarchy member eligible to own Scope and Coverage.

**Fields.** `ID`; `code VARCHAR2(64 BYTE) NOT NULL`; `title VARCHAR2(255 CHAR) NOT NULL`; `process_id RAW(16) NOT NULL`; `description CLOB NULL`; `sort_order NUMBER(10,0) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `code`, including deleted rows. FK: `process_id -> central_process(id)`. No composite FK in the table itself.

**Lifecycle, validity, and lock.** `L+V`; `version` is mandatory for mutation. A Subprocess has exactly one Process and no children.

**Constraints and indexes.** Unique code; non-negative sort order; indexed `process_id`; no child or self-parent field is permitted.

**Mutability and Revision.** Central-only. Changing it can require Central impact analysis but must never physically create, update, or delete Local rows.

**Authority / non-invention note.** Final Logical Model §5-1 and §6-1; the UI may combine Process and Subprocess in one tree DTO without combining persistence.

### 04. `central_control`

**Purpose and family.** Official independent control definition, reusable through typed Central and Local control scopes.

**Fields.** `ID`; normal definition lifecycle `L+V`. The approved model explicitly excludes an objective text field and a direct policy/regulation relationship from this definition.

**Keys and relationships.** PK: `id`. The Final Logical Model leaves the detailed control business key and descriptive attributes to compatible detailed design; its permitted relationships are typed scope, typed coverage, and `central_control_account_group`.

**Composite FKs.** None on the definition. Composite same-subprocess keys are owned by coverage tables.

**Lifecycle, validity, and lock.** `L+V`; `version` prevents lost updates.

**Constraints and indexes.** Shared status/date/delete checks; indexes are driven by relationship-table FKs. No direct `central_control -> central_regulation` FK or generic relation is permitted.

**Mutability and Revision.** Central-domain business changes require a Central revision. Actual owner, frequency, execution method, and test method are not mutable attributes of this table.

**Authority / non-invention note.** Final Logical Model §5-1, §6-3, and §7; Conceptual Model Central Definition rules. No undocumented control field is introduced from customer mock-ups.

### 05. `central_control_objective`

**Purpose and family.** Official, non-hierarchical Control Objective definition. The word “objective” in this domain means Control Objective, not generic organizational objective.

**Fields.** `ID`; normal definition lifecycle `L+V`.

**Keys and relationships.** PK: `id`. Detailed business-key attributes are not enumerated by the Final Logical Model. It participates through typed objective scope, typed risk/objective and control/objective coverage, and `central_control_objective_account_group`.

**Composite FKs.** None on the definition.

**Lifecycle, validity, and lock.** `L+V`; optimistic locking through `version`.

**Constraints and indexes.** Shared profile checks; relationship FKs are indexed on their owning tables. A direct uncontextualized Control–Objective relation is not permitted.

**Mutability and Revision.** Central-only through a Central revision; direct coverage is independent from the path through Risk.

**Authority / non-invention note.** Final Logical Model §5-1, §6-3, §8; customer generic-objective material cannot redefine this table.

### 06. `central_risk_category`

**Purpose and family.** Central hierarchy for classifying Risk Templates; it is not itself scopeable.

**Fields.** `ID`; `parent_category_id RAW(16) NULL`; normal definition lifecycle `L+V`.

**Keys and relationships.** PK: `id`. Detailed category business-key fields are not enumerated. FK: `parent_category_id -> central_risk_category(id)`. Child Risk Templates use `risk_category_id`.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; `version` governs mutations.

**Constraints and indexes.** Self-parent prohibition; full cycle detection in Backend; parent FK index; shared lifecycle/date checks. It cannot appear as a Scope endpoint.

**Mutability and Revision.** Central-only via Central revision. Category changes do not mutate Risk Template or Local rows automatically.

**Authority / non-invention note.** Final Logical Model §5-1 and §6-2; it corrects the combined Legacy category/template persistence.

### 07. `central_risk_template`

**Purpose and family.** Official reusable Risk Template and the only risk-side definition eligible for typed Scope.

**Fields.** `ID`; `risk_category_id RAW(16) NOT NULL`; normal definition lifecycle `L+V`.

**Keys and relationships.** PK: `id`. Detailed template business-key fields are not enumerated. FK: `risk_category_id -> central_risk_category(id)`. It is referenced by central/local risk scopes.

**Composite FKs.** None on the definition.

**Lifecycle, validity, and lock.** `L+V`; `version` controls changes.

**Constraints and indexes.** Indexed `risk_category_id`; shared lifecycle/date/delete checks. Likelihood, impact, inherent/residual scores, assessment results, and KRI are outside this table and outside Master Data V2.

**Mutability and Revision.** Central-only through a Central revision. Local inherited validity is validated by the owning local-scope command.

**Authority / non-invention note.** Final Logical Model §5-1, §6-2, §20; Conceptual Model exclusions.

### 08. `central_account_group`

**Purpose and family.** Central Account Group hierarchy used for direct Control and Control Objective classification.

**Fields.** `ID`; `parent_account_group_id RAW(16) NULL`; normal definition lifecycle `L+V`.

**Keys and relationships.** PK: `id`. Detailed business-key attributes are not enumerated. FK: `parent_account_group_id -> central_account_group(id)`. Classification relationships are held in the two typed central account-group tables, not JSON.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; `version` is required for mutation.

**Constraints and indexes.** Self-parent and full-cycle rules; indexed parent FK; shared checks. No subprocess-account-group Scope exists.

**Mutability and Revision.** Central-only through a Central revision. Classifications are separate revision contents rather than embedded arrays.

**Authority / non-invention note.** Final Logical Model §5-1 and §7–§8; this replaces multi-value JSON relationships, assertions, and account-range structures absent from the final model.

### 09. `central_regulation_group`

**Purpose and family.** Central hierarchy for Regulation Group classification.

**Fields.** `ID`; `parent_group_id RAW(16) NULL`; normal definition lifecycle `L+V`.

**Keys and relationships.** PK: `id`. Detailed business-key attributes are not enumerated. FK: `parent_group_id -> central_regulation_group(id)`. Regulations point to this group.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; `version` supplies optimistic locking.

**Constraints and indexes.** Self-parent check, Backend cycle check, parent FK index, and shared checks. This group is not a Scope or Coverage endpoint.

**Mutability and Revision.** Central-only by Central revision.

**Authority / non-invention note.** Final Logical Model §5-1 and §6-2. Direct operational connection to a Regulation Group is prohibited.

### 10. `central_regulation`

**Purpose and family.** Central Regulation definition under a Regulation Group; it groups atomic Regulation Requirements.

**Fields.** `ID`; `regulation_group_id RAW(16) NOT NULL`; normal definition lifecycle `L+V`.

**Keys and relationships.** PK: `id`. Detailed business-key attributes are not enumerated. FK: `regulation_group_id -> central_regulation_group(id)`. Requirements point to this regulation.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; `version` controls mutation.

**Constraints and indexes.** Indexed group FK and shared checks. It is not a valid direct Control relationship or Scope endpoint.

**Mutability and Revision.** Central-only via Central revision.

**Authority / non-invention note.** Final Logical Model §5-1, §6-2, and §6-3; Requirement, not Regulation, is the atomic integration point.

### 11. `central_regulation_requirement`

**Purpose and family.** Atomic Central Regulation Requirement and the only regulation-side definition eligible for Scope and Requirement–Control Coverage.

**Fields.** `ID`; `regulation_id RAW(16) NOT NULL`; normal definition lifecycle `L+V`.

**Keys and relationships.** PK: `id`. Detailed requirement business-key attributes are not enumerated. FK: `regulation_id -> central_regulation(id)`. It is referenced by central/local requirement scope.

**Composite FKs.** None on the definition.

**Lifecycle, validity, and lock.** `L+V`; `version` is the lock field.

**Constraints and indexes.** Indexed regulation FK and shared checks. A control reaches regulation content only through a typed Requirement–Control Coverage; a direct Control–Regulation relation is forbidden.

**Mutability and Revision.** Central-only via Central revision.

**Authority / non-invention note.** Final Logical Model §5-1, §6-2, §6-3, and §20; Conceptual Model §Central catalog.

### 12. `central_policy_group`

**Purpose and family.** Central Policy Group hierarchy used to classify stable Policy identities.

**Fields.** `ID`; `parent_group_id RAW(16) NULL`; normal definition lifecycle `L+V`.

**Keys and relationships.** PK: `id`. Detailed business-key attributes are not enumerated. FK: `parent_group_id -> central_policy_group(id)`. Policies point to this group.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; `version` protects hierarchy updates.

**Constraints and indexes.** Self-parent and Backend cycle checks; parent FK index; shared checks.

**Mutability and Revision.** Central-only through a Central revision.

**Authority / non-invention note.** Final Logical Model §5-1 and §6-2. A policy approval workflow is outside the Master Data table scope.

### 13. `central_policy`

**Purpose and family.** Stable Central Policy identity; official policy content belongs to a Policy Version.

**Fields.** `ID`; `policy_group_id RAW(16) NOT NULL`; normal definition lifecycle `L+V`.

**Keys and relationships.** PK: `id`. Detailed policy business-key attributes are not enumerated. FK: `policy_group_id -> central_policy_group(id)`. Policy Versions point to this identity.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; `version` supports mutation of the stable identity only.

**Constraints and indexes.** Indexed group FK; shared checks. Content must not be stored as mutable policy-identity text.

**Mutability and Revision.** Central-only via Central revision. Version creation is the path for content change.

**Authority / non-invention note.** Final Logical Model §5-1 and §6-2; Conceptual Model Policy identity/version separation.

### 14. `central_policy_version`

**Purpose and family.** Official, referencable version of a Central Policy and the parent used by all Central and Local Policy Scope tables.

**Fields.** `ID`; `policy_id RAW(16) NOT NULL`; domain `version_status VARCHAR2(32 BYTE) NOT NULL` with `DRAFT`, `PUBLISHED`, or `SUPERSEDED`; official content represented through approved version content/document integration; normal lifecycle/validity/audit as compatible with the version lifecycle; optimistic `version`.

**Keys and relationships.** PK: `id`. The Logical Model documents the `policy_id` parent and version status; it does not prescribe a separate version-number column name. FK: `policy_id -> central_policy(id)`. It is referenced by all three Central and all four Local Policy Scope tables.

**Composite FKs.** None on this table.

**Lifecycle, validity, and lock.** Published content is immutable. `version_status` is distinct from the generic lifecycle status; `version` is the optimistic lock.

**Constraints and indexes.** Check controlled version status; indexed `policy_id`; validity controls all attached policy-scope intervals. Workflow publication is external and does not authorize Workflow tables here.

**Mutability and Revision.** Central revision controls allowed Master Data changes. Published content changes create a new Policy Version; policy-scope changes are separately revision-controlled.

**Authority / non-invention note.** Final Logical Model §5-1, §6-2, §12-2; Physical Design Appendix A. Detailed content-column representation is deliberately not invented beyond the approved CLOB/document rules.

## 2. Central Scope, Classification, Policy Scope, and Coverage — 13 business tables

### 15. `central_subprocess_control_scope`

**Purpose and family.** Typed Central Control Scope: declares that one official Control is in one Central Subprocess reference domain.

**Fields.** `ID`; `subprocess_id RAW(16) NOT NULL`; `control_id RAW(16) NOT NULL`; nullable `recommended_frequency_code VARCHAR2(64 BYTE)`, `recommended_execution_method_code VARCHAR2(64 BYTE)`, and `recommended_test_method_code VARCHAR2(64 BYTE)`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(subprocess_id, control_id)`, including inactive and deleted rows. FKs: `subprocess_id -> central_subprocess(id)` and `control_id -> central_control(id)`.

**Composite FKs.** Provides a candidate `UNIQUE (id, subprocess_id)` for Central Coverage composite foreign keys; it is not a second business relation.

**Lifecycle, validity, and lock.** `L+V`; `version` is mandatory for any change. The recommended codes are suggestions only, not Local execution settings.

**Constraints and indexes.** Unique tuple; status/date/delete checks; FK indexes unless supplied by the unique index. No standalone title/code belongs to a Scope.

**Mutability and Revision.** Central-only through a Central revision. Creation/change never auto-creates or changes Local Control Scope rows.

**Authority / non-invention note.** Final Logical Model §5-2, §7, §8; Physical Design §8–§10. The three recommendation field names are explicitly documented.

### 16. `central_subprocess_risk_scope`

**Purpose and family.** Typed Central Risk Scope: places a Risk Template, not a Risk Category, in a Central Subprocess.

**Fields.** `ID`; `subprocess_id RAW(16) NOT NULL`; `risk_template_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(subprocess_id, risk_template_id)`, including deleted rows. FKs: `subprocess_id -> central_subprocess(id)` and `risk_template_id -> central_risk_template(id)`.

**Composite FKs.** Provides `UNIQUE (id, subprocess_id)` for the two Central Coverage tables that use a risk scope.

**Lifecycle, validity, and lock.** `L+V`; optimistic lock is `version`.

**Constraints and indexes.** Unique tuple; status/date/delete checks; FK indexes. Risk Category and any assessment data cannot be substituted for `risk_template_id`.

**Mutability and Revision.** Central-only by Central revision; a matching Local inherited scope is never automatically created or altered.

**Authority / non-invention note.** Final Logical Model §5-2, §7, §20; Conceptual Model scope boundary.

### 17. `central_subprocess_control_objective_scope`

**Purpose and family.** Typed Central Control Objective Scope: places a Control Objective in a Central Subprocess.

**Fields.** `ID`; `subprocess_id RAW(16) NOT NULL`; `control_objective_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(subprocess_id, control_objective_id)`. FKs: `subprocess_id -> central_subprocess(id)` and `control_objective_id -> central_control_objective(id)`.

**Composite FKs.** Provides `UNIQUE (id, subprocess_id)` for Central Risk–Control Objective and Control–Control Objective Coverages.

**Lifecycle, validity, and lock.** `L+V`; `version` guards updates.

**Constraints and indexes.** Unique tuple, shared checks, and indexed FKs. It does not represent a generic objective or a raw direct Control–Objective link.

**Mutability and Revision.** Central-only via a Central revision.

**Authority / non-invention note.** Final Logical Model §5-2, §6-3, §7–§8. The table name preserves “control_objective” exactly.

### 18. `central_subprocess_requirement_scope`

**Purpose and family.** Typed Central Requirement Scope: places an atomic Regulation Requirement in a Central Subprocess.

**Fields.** `ID`; `subprocess_id RAW(16) NOT NULL`; `requirement_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(subprocess_id, requirement_id)`. FKs: `subprocess_id -> central_subprocess(id)` and `requirement_id -> central_regulation_requirement(id)`.

**Composite FKs.** Provides `UNIQUE (id, subprocess_id)` for Requirement–Control Coverage and Central Policy Requirement Scope.

**Lifecycle, validity, and lock.** `L+V`; `version` is the lock field.

**Constraints and indexes.** Unique tuple, shared checks, and indexed FKs. Regulation and Regulation Group cannot replace the Requirement endpoint.

**Mutability and Revision.** Central-only by Central revision.

**Authority / non-invention note.** Final Logical Model §5-2, §6-2, §6-3, §7; Requirement is the approved atomic compliance endpoint.

### 19. `central_policy_version_subprocess_scope`

**Purpose and family.** Typed Central Policy Scope that provides the baseline inclusion of a Policy Version for a Central Subprocess.

**Fields.** `ID`; `policy_version_id RAW(16) NOT NULL`; `subprocess_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(policy_version_id, subprocess_id)`. FKs: `policy_version_id -> central_policy_version(id)` and `subprocess_id -> central_subprocess(id)`.

**Composite FKs.** None required by the approved model.

**Lifecycle, validity, and lock.** `L+V`; the interval must be valid against the referenced Policy Version; `version` is mandatory for mutation.

**Constraints and indexes.** Unique tuple; policy-version and subprocess FK indexes; shared checks. Its documented semantic is Central baseline `INCLUDE`; it is not a generic policy-scope table.

**Mutability and Revision.** Central-only through a Central revision. It contributes to read-only Policy Applicability and never materializes Local rows.

**Authority / non-invention note.** Final Logical Model §5-2 and §12-2; Conceptual Model Central Policy Scope rule.

### 20. `central_policy_version_control_scope`

**Purpose and family.** Typed Central Policy Scope for an exact Central Control Scope, retaining its Subprocess context.

**Fields.** `ID`; `policy_version_id RAW(16) NOT NULL`; `central_control_scope_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(policy_version_id, central_control_scope_id)`. FKs: `policy_version_id -> central_policy_version(id)` and `central_control_scope_id -> central_subprocess_control_scope(id)`.

**Composite FKs.** No raw `control_id` relation is allowed; the exact scope FK carries the context.

**Lifecycle, validity, and lock.** `L+V`; validity must be compatible with the Policy Version; `version` is the lock field.

**Constraints and indexes.** Unique tuple, indexed policy/scope FKs, shared checks. It cannot target a Central Control definition directly.

**Mutability and Revision.** Central-only by Central revision; affects Policy Applicability only through read computation.

**Authority / non-invention note.** Final Logical Model §5-2, §12-2, and final correction F-01.

### 21. `central_policy_version_requirement_scope`

**Purpose and family.** Typed Central Policy Scope for an exact Central Requirement Scope, retaining its Subprocess context.

**Fields.** `ID`; `policy_version_id RAW(16) NOT NULL`; `central_requirement_scope_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(policy_version_id, central_requirement_scope_id)`. FKs: `policy_version_id -> central_policy_version(id)` and `central_requirement_scope_id -> central_subprocess_requirement_scope(id)`.

**Composite FKs.** No raw `requirement_id` relationship is permitted because it would lose Subprocess context.

**Lifecycle, validity, and lock.** `L+V`; validity must be compatible with the Policy Version; `version` controls updates.

**Constraints and indexes.** Unique tuple; indexed foreign keys; shared checks. It cannot target Regulation or a raw Requirement definition directly.

**Mutability and Revision.** Central-only via Central revision; contributes a read-only policy baseline.

**Authority / non-invention note.** Final Logical Model §5-2, §12-2, and F-01.

### 22. `central_control_account_group`

**Purpose and family.** Typed direct Central classification connecting one Control to one Account Group.

**Fields.** `ID`; `control_id RAW(16) NOT NULL`; `account_group_id RAW(16) NOT NULL`; lifecycle/audit/lock profile `L+V` for the stored business classification.

**Keys and relationships.** PK: `id`. Business key: unique `(control_id, account_group_id)`. FKs: `control_id -> central_control(id)` and `account_group_id -> central_account_group(id)`.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; `version` protects classification changes.

**Constraints and indexes.** Unique pair; indexes on both FKs unless the unique index covers the query path. No JSON, assertion, account-range, or implicit Scope structure is permitted.

**Mutability and Revision.** Central-only through a Central revision; changes are not inferred from the customer account-group form.

**Authority / non-invention note.** Final Logical Model §5-2 and §7; Conceptual Model direct classification rule.

### 23. `central_control_objective_account_group`

**Purpose and family.** Typed direct Central classification connecting one Control Objective to one Account Group.

**Fields.** `ID`; `control_objective_id RAW(16) NOT NULL`; `account_group_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(control_objective_id, account_group_id)`. FKs: `control_objective_id -> central_control_objective(id)` and `account_group_id -> central_account_group(id)`.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; `version` is the lock.

**Constraints and indexes.** Unique pair and FK indexes; no JSON/multi-value relationship and no Subprocess–Account Group Scope.

**Mutability and Revision.** Central-only through a Central revision.

**Authority / non-invention note.** Final Logical Model §5-2 and §7; Conceptual Model account-group source-path semantics are read derivation, not a separate table.

### 24. `central_subprocess_risk_control_coverage`

**Purpose and family.** Typed Central Coverage stating which Control Scope covers a Risk Scope in one Central Subprocess.

**Fields.** `ID`; `subprocess_id RAW(16) NOT NULL`; `risk_scope_id RAW(16) NOT NULL`; `control_scope_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(subprocess_id, risk_scope_id, control_scope_id)`. FK: `subprocess_id -> central_subprocess(id)`.

**Composite FKs.** `FK (risk_scope_id, subprocess_id) -> central_subprocess_risk_scope(id, subprocess_id)` and `FK (control_scope_id, subprocess_id) -> central_subprocess_control_scope(id, subprocess_id)`. These are required database-level same-subprocess guarantees.

**Lifecycle, validity, and lock.** `L+V`; `version` controls mutation. It relates scopes, not raw definitions.

**Constraints and indexes.** Unique relation; composite FK-supporting indexes; shared checks. No weight, score, effectiveness, or transitive inferred coverage exists.

**Mutability and Revision.** Central-only through a Central revision. It never generates a Control–Objective Coverage automatically.

**Authority / non-invention note.** Final Logical Model §5-2 and §8; Physical Design §8-1 and §10.

### 25. `central_subprocess_risk_control_objective_coverage`

**Purpose and family.** Typed Central Coverage stating which Control Objective Scope is threatened by a Risk Scope in one Central Subprocess.

**Fields.** `ID`; `subprocess_id RAW(16) NOT NULL`; `risk_scope_id RAW(16) NOT NULL`; `control_objective_scope_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(subprocess_id, risk_scope_id, control_objective_scope_id)`. FK: `subprocess_id -> central_subprocess(id)`.

**Composite FKs.** `FK (risk_scope_id, subprocess_id) -> central_subprocess_risk_scope(id, subprocess_id)` and `FK (control_objective_scope_id, subprocess_id) -> central_subprocess_control_objective_scope(id, subprocess_id)`.

**Lifecycle, validity, and lock.** `L+V`; optimistic lock is `version`.

**Constraints and indexes.** Unique relation, composite FK indexes, and shared checks. It is distinct from direct Control–Control Objective Coverage.

**Mutability and Revision.** Central-only by Central revision.

**Authority / non-invention note.** Final Logical Model §5-2 and §8; Conceptual Model direct/indirect relationship distinction.

### 26. `central_subprocess_control_control_objective_coverage`

**Purpose and family.** Typed Central Coverage recording the direct, independent contribution from a Control Scope to a Control Objective Scope.

**Fields.** `ID`; `subprocess_id RAW(16) NOT NULL`; `control_scope_id RAW(16) NOT NULL`; `control_objective_scope_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(subprocess_id, control_scope_id, control_objective_scope_id)`. FK: `subprocess_id -> central_subprocess(id)`.

**Composite FKs.** `FK (control_scope_id, subprocess_id) -> central_subprocess_control_scope(id, subprocess_id)` and `FK (control_objective_scope_id, subprocess_id) -> central_subprocess_control_objective_scope(id, subprocess_id)`.

**Lifecycle, validity, and lock.** `L+V`; `version` is required for update/status/delete/restore.

**Constraints and indexes.** Unique relation, composite FK indexes, shared checks. No automatic generation from a Risk path is allowed.

**Mutability and Revision.** Central-only via Central revision; this is the only approved direct Control–Control Objective relation.

**Authority / non-invention note.** Final Logical Model §5-2, §6-3, §8; Conceptual Model direct coverage rule.

### 27. `central_subprocess_requirement_control_coverage`

**Purpose and family.** Typed Central Coverage recording which Control Scope covers an atomic Requirement Scope in one Central Subprocess.

**Fields.** `ID`; `subprocess_id RAW(16) NOT NULL`; `requirement_scope_id RAW(16) NOT NULL`; `control_scope_id RAW(16) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(subprocess_id, requirement_scope_id, control_scope_id)`. FK: `subprocess_id -> central_subprocess(id)`.

**Composite FKs.** `FK (requirement_scope_id, subprocess_id) -> central_subprocess_requirement_scope(id, subprocess_id)` and `FK (control_scope_id, subprocess_id) -> central_subprocess_control_scope(id, subprocess_id)`.

**Lifecycle, validity, and lock.** `L+V`; `version` is the optimistic lock.

**Constraints and indexes.** Unique relation, composite FK indexes, shared checks. This is the approved compliance path; no direct Control–Regulation or Control–Regulation Group link survives.

**Mutability and Revision.** Central-only through a Central revision.

**Authority / non-invention note.** Final Logical Model §5-2, §6-3, §8; Physical Design §8-1.

## 3. Local Context, Local Scope, Local Coverage, and Local Policy Scope — 13 business tables

### 28. `local_organization_subprocess_scope`

**Purpose and family.** The Local Organization–Subprocess Context. It owns every Local Scope, Local Coverage, and Local Policy Scope for an Organization in an exact Subprocess.

**Fields.** `ID`; `organization_id RAW(16) NOT NULL`; `subprocess_id RAW(16) NOT NULL`; `context_note VARCHAR2(1000 CHAR) NULL`; `L+V`. It deliberately has no `source_type`.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_id, subprocess_id)`, including deleted rows. FKs: `organization_id -> organization(id)` and `subprocess_id -> central_subprocess(id)`.

**Composite FKs.** Provides a candidate `UNIQUE (id, organization_id, subprocess_id)` only when necessary to support documented context checks; Local Scope and Coverage use `organization_subprocess_scope_id` as their ownership key.

**Lifecycle, validity, and lock.** `L+V`; `version` protects all context changes. It is a local decision, not an inherited record.

**Constraints and indexes.** Unique context pair; indexed organization and subprocess FKs; shared status/date/delete checks. A Local Scope or Coverage cannot exist without this parent.

**Mutability and Revision.** LOCAL revision only, owned by the same `organization_id`. No Central mutation auto-creates, changes, or removes this record.

**Authority / non-invention note.** Final Logical Model §5-3 and §9-1; Physical Design §3 and §8-2. The approved name is `local_organization_subprocess_scope`.

### 29. `local_subprocess_control_scope`

**Purpose and family.** Typed Local Control Scope that applies a Central Control definition in one Local Organization–Subprocess Context and holds actual execution configuration.

**Fields.** `ID`; `organization_subprocess_scope_id RAW(16) NOT NULL`; `control_id RAW(16) NOT NULL`; nullable `central_control_scope_id RAW(16)`; `source_type VARCHAR2(32 BYTE) NOT NULL`; nullable logical-user `actual_owner_id RAW(16)`; nullable `frequency_code`, `execution_method_code`, and `test_method_code` as `VARCHAR2(64 BYTE)`; `local_context_note VARCHAR2(1000 CHAR) NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_subprocess_scope_id, control_id)`. FKs: parent context, `control_id -> central_control(id)`, and nullable `central_control_scope_id -> central_subprocess_control_scope(id)`.

**Composite FKs.** Provides a candidate composite key including `(id, organization_subprocess_scope_id)` for Local Coverage same-context foreign keys. Inherited matching of control and Central Subprocess is revision validation, not a generic polymorphic FK.

**Lifecycle, validity, and lock.** `L+V`; `version` locks mutation. `INHERITED_FROM_CENTRAL` requires the typed central scope reference; `LOCAL_ADDED` requires it to be null.

**Constraints and indexes.** Unique context/control tuple; source/reference compatibility check; indexed parent, definition, and Central reference FKs. Inherited validity must be a subset of the Central reference at command time.

**Mutability and Revision.** LOCAL revision only. The actual owner/frequency/method fields are local and never copied into Central Control or Central Control Scope.

**Authority / non-invention note.** Final Logical Model §5-3, §9-2, §9-3; Physical Design §8-3. `source_type` is historical and immutable after creation.

### 30. `local_subprocess_risk_scope`

**Purpose and family.** Typed Local Risk Scope applying one Central Risk Template in a Local Organization–Subprocess Context.

**Fields.** `ID`; `organization_subprocess_scope_id RAW(16) NOT NULL`; `risk_template_id RAW(16) NOT NULL`; nullable `central_risk_scope_id RAW(16)`; `source_type VARCHAR2(32 BYTE) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_subprocess_scope_id, risk_template_id)`. FKs: parent context, `risk_template_id -> central_risk_template(id)`, nullable `central_risk_scope_id -> central_subprocess_risk_scope(id)`.

**Composite FKs.** Provides a candidate composite key `(id, organization_subprocess_scope_id)` for Local Risk Coverage tables.

**Lifecycle, validity, and lock.** `L+V`; `version` is the lock. Inherited source requires the central scope; local-added source requires null.

**Constraints and indexes.** Unique context/template tuple; source/reference check; parent/definition/reference indexes; inherited validity subset validation. No risk score, assessment result, likelihood, impact, KPI, or KRI field is permitted.

**Mutability and Revision.** LOCAL revision only for its owning organization. Later Central changes affect Effective/Diagnostic output but never physically mutate this row.

**Authority / non-invention note.** Final Logical Model §5-3 and §9-2; Conceptual Model exclusions.

### 31. `local_subprocess_control_objective_scope`

**Purpose and family.** Typed Local Control Objective Scope applying one Central Control Objective in one Local Context.

**Fields.** `ID`; `organization_subprocess_scope_id RAW(16) NOT NULL`; `control_objective_id RAW(16) NOT NULL`; nullable `central_control_objective_scope_id RAW(16)`; `source_type VARCHAR2(32 BYTE) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_subprocess_scope_id, control_objective_id)`. FKs: parent context, `control_objective_id -> central_control_objective(id)`, nullable `central_control_objective_scope_id -> central_subprocess_control_objective_scope(id)`.

**Composite FKs.** Provides `(id, organization_subprocess_scope_id)` for same-context Local Coverages.

**Lifecycle, validity, and lock.** `L+V`; versioned. The source/reference rule is identical in meaning to the other typed Local Scope tables.

**Constraints and indexes.** Unique tuple; source/reference check; indexed FKs; inherited valid range subset validation. A generic objective cannot replace this definition.

**Mutability and Revision.** LOCAL revision only; Central changes do not synchronize the local row.

**Authority / non-invention note.** Final Logical Model §5-3 and §9-2; it preserves the Control Objective vocabulary exactly.

### 32. `local_subprocess_requirement_scope`

**Purpose and family.** Typed Local Requirement Scope applying an atomic Central Regulation Requirement in one Local Context.

**Fields.** `ID`; `organization_subprocess_scope_id RAW(16) NOT NULL`; `requirement_id RAW(16) NOT NULL`; nullable `central_requirement_scope_id RAW(16)`; `source_type VARCHAR2(32 BYTE) NOT NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_subprocess_scope_id, requirement_id)`. FKs: parent context, `requirement_id -> central_regulation_requirement(id)`, nullable `central_requirement_scope_id -> central_subprocess_requirement_scope(id)`.

**Composite FKs.** Provides `(id, organization_subprocess_scope_id)` for Local Requirement–Control Coverage.

**Lifecycle, validity, and lock.** `L+V`; `version` is mandatory. Inherited source requires the exact central requirement scope; local added leaves that reference null.

**Constraints and indexes.** Unique tuple, source/reference check, indexed FKs, inherited range subset validation. Regulation/Regulation Group cannot substitute for the Requirement reference.

**Mutability and Revision.** LOCAL revision only; Central change never mutates Local Scope data automatically.

**Authority / non-invention note.** Final Logical Model §5-3 and §9-2; Physical Design §7–§9.

### 33. `local_subprocess_risk_control_coverage`

**Purpose and family.** Typed Local Risk–Control Coverage in one Local Organization–Subprocess Context.

**Fields.** `ID`; `organization_subprocess_scope_id RAW(16) NOT NULL`; `local_risk_scope_id RAW(16) NOT NULL`; `local_control_scope_id RAW(16) NOT NULL`; nullable `central_risk_control_coverage_id RAW(16)`; `source_type VARCHAR2(32 BYTE) NOT NULL`; `coverage_note VARCHAR2(1000 CHAR) NULL`; `L+V`. There is intentionally no `subprocess_id` column.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_subprocess_scope_id, local_risk_scope_id, local_control_scope_id)`. FK: parent `organization_subprocess_scope_id -> local_organization_subprocess_scope(id)`; nullable Central coverage FK points to `central_subprocess_risk_control_coverage(id)`.

**Composite FKs.** `FK (local_risk_scope_id, organization_subprocess_scope_id)` to the corresponding candidate key of `local_subprocess_risk_scope`; `FK (local_control_scope_id, organization_subprocess_scope_id)` to `local_subprocess_control_scope`. They are the required database-level same-context proof.

**Lifecycle, validity, and lock.** `L+V`; `version` controls updates. Inherited source requires the Central Coverage reference; local added source requires null.

**Constraints and indexes.** Unique relation; source/reference check; composite-FK indexes led by context; shared checks. Endpoint source types need not match the coverage source type.

**Mutability and Revision.** LOCAL revision only. Central Coverage change never mutates the Local Coverage; it can change Effective/Diagnostic results.

**Authority / non-invention note.** Final Logical Model §5-3 and §10; Physical Design §8-2 and §10.

### 34. `local_subprocess_risk_control_objective_coverage`

**Purpose and family.** Typed Local Risk–Control Objective Coverage in one Local Context.

**Fields.** `ID`; `organization_subprocess_scope_id RAW(16) NOT NULL`; `local_risk_scope_id RAW(16) NOT NULL`; `local_control_objective_scope_id RAW(16) NOT NULL`; nullable `central_risk_control_objective_coverage_id RAW(16)`; `source_type VARCHAR2(32 BYTE) NOT NULL`; `coverage_note VARCHAR2(1000 CHAR) NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_subprocess_scope_id, local_risk_scope_id, local_control_objective_scope_id)`. FK: parent local context; nullable Central Coverage FK to `central_subprocess_risk_control_objective_coverage(id)`.

**Composite FKs.** Composite context FKs join each endpoint and the shared `organization_subprocess_scope_id` to the corresponding local risk and local control-objective scope candidate keys.

**Lifecycle, validity, and lock.** `L+V`; versioned. Source/reference conditionality matches the local coverage contract.

**Constraints and indexes.** Unique relation; source/reference check; context-leading composite FK indexes; no stored score, weight, or effect measurement.

**Mutability and Revision.** LOCAL revision only; it is independent of direct Local Control–Control Objective Coverage.

**Authority / non-invention note.** Final Logical Model §5-3 and §10; Conceptual Model typed-coverage rule.

### 35. `local_subprocess_control_control_objective_coverage`

**Purpose and family.** Typed Local direct Control–Control Objective Coverage in one Local Context.

**Fields.** `ID`; `organization_subprocess_scope_id RAW(16) NOT NULL`; `local_control_scope_id RAW(16) NOT NULL`; `local_control_objective_scope_id RAW(16) NOT NULL`; nullable `central_control_control_objective_coverage_id RAW(16)`; `source_type VARCHAR2(32 BYTE) NOT NULL`; `coverage_note VARCHAR2(1000 CHAR) NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_subprocess_scope_id, local_control_scope_id, local_control_objective_scope_id)`. FK: parent Local Context; nullable Central Coverage FK to `central_subprocess_control_control_objective_coverage(id)`.

**Composite FKs.** Endpoint composite FKs include the parent context and target the `local_subprocess_control_scope` and `local_subprocess_control_objective_scope` candidate keys, enforcing same context.

**Lifecycle, validity, and lock.** `L+V`; `version` is required. Inheritance does not arise transitively from risk relations.

**Constraints and indexes.** Unique relation; conditional Central reference check; composite endpoint indexes. No generic relation type is stored.

**Mutability and Revision.** LOCAL revision only and independent from Risk–Control Objective Coverage.

**Authority / non-invention note.** Final Logical Model §5-3 and §10; Conceptual Model direct-coverage independence.

### 36. `local_subprocess_requirement_control_coverage`

**Purpose and family.** Typed Local Requirement–Control Coverage, the Local compliance connection in one Local Context.

**Fields.** `ID`; `organization_subprocess_scope_id RAW(16) NOT NULL`; `local_requirement_scope_id RAW(16) NOT NULL`; `local_control_scope_id RAW(16) NOT NULL`; nullable `central_requirement_control_coverage_id RAW(16)`; `source_type VARCHAR2(32 BYTE) NOT NULL`; `coverage_note VARCHAR2(1000 CHAR) NULL`; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_subprocess_scope_id, local_requirement_scope_id, local_control_scope_id)`. FK: parent Local Context; nullable Central Coverage FK to `central_subprocess_requirement_control_coverage(id)`.

**Composite FKs.** Requirement and Control endpoint FKs each include `organization_subprocess_scope_id` and target the corresponding Local Scope candidate key, guaranteeing same context at database level.

**Lifecycle, validity, and lock.** `L+V`; versioned. `INHERITED_FROM_CENTRAL` requires the matching Central Coverage, and `LOCAL_ADDED` prohibits it.

**Constraints and indexes.** Unique relation, source/reference check, composite FK indexes, shared checks. Direct Control–Regulation and direct Control–Regulation Group tables are not substitutes.

**Mutability and Revision.** LOCAL revision only; later Central changes are read-model/impact effects only.

**Authority / non-invention note.** Final Logical Model §5-3 and §10; Physical Design §8-2.

### 37. `local_policy_organization_scope`

**Purpose and family.** Local Policy decision at the Organization level, including hierarchical propagation behavior.

**Fields.** `ID`; `organization_id RAW(16) NOT NULL`; `policy_version_id RAW(16) NOT NULL`; `scope_action VARCHAR2(32 BYTE) NOT NULL` (`INCLUDE` or `EXCLUDE`); `propagation_mode VARCHAR2(32 BYTE) NOT NULL` (`DIRECT_ONLY` or `INCLUDE_DESCENDANTS`); `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_id, policy_version_id)` at the documented target granularity. FKs: `organization_id -> organization(id)` and `policy_version_id -> central_policy_version(id)`.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; policy-scope interval must overlap and be contained as required by the Policy Version at command time; `version` locks mutation.

**Constraints and indexes.** Controlled action/mode checks; unique target pair; policy/org FK indexes; shared checks. Direct Organization decision wins over ancestor and closest applicable ancestor wins among inherited organization decisions.

**Mutability and Revision.** LOCAL revision for the represented organization. It contributes read-only propagation and never creates a child Organization row.

**Authority / non-invention note.** Final Logical Model §5-3 and §12-2; Conceptual Model Policy Propagation rules.

### 38. `local_policy_subprocess_scope`

**Purpose and family.** Local Policy decision for a specific Local Organization–Subprocess Context.

**Fields.** `ID`; `organization_subprocess_scope_id RAW(16) NOT NULL`; `policy_version_id RAW(16) NOT NULL`; the documented local policy decision/action fields; `L+V`. `propagation_mode` is not the hierarchy-propagation control for this table.

**Keys and relationships.** PK: `id`. Business key: unique `(organization_subprocess_scope_id, policy_version_id)`. FKs: `organization_subprocess_scope_id -> local_organization_subprocess_scope(id)` and `policy_version_id -> central_policy_version(id)`.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; policy-version compatibility validation; `version` is the optimistic lock.

**Constraints and indexes.** Unique target pair, valid policy decision enum, policy/context FK indexes, and shared checks. The decision is more specific than Organization scope and may propagate only to Control and Requirement in the same Local Context.

**Mutability and Revision.** LOCAL revision only; it never targets Risk or Control Objective.

**Authority / non-invention note.** Final Logical Model §5-3 and §12-2; the exact action-column shape beyond the documented policy decision is not manufactured here.

### 39. `local_policy_control_scope`

**Purpose and family.** Exact-target Local Policy decision for one Local Control Scope.

**Fields.** `ID`; `local_control_scope_id RAW(16) NOT NULL`; `policy_version_id RAW(16) NOT NULL`; documented local policy decision/action fields; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(local_control_scope_id, policy_version_id)`. FKs: `local_control_scope_id -> local_subprocess_control_scope(id)` and `policy_version_id -> central_policy_version(id)`.

**Composite FKs.** None; the Local Control Scope supplies the exact Local Context.

**Lifecycle, validity, and lock.** `L+V`; scope validity is checked against Policy Version validity; `version` guards mutation.

**Constraints and indexes.** Unique exact target; FK indexes; valid policy decision check. It outranks Local Subprocess and Organization decisions in Policy Applicability.

**Mutability and Revision.** LOCAL revision only. It is not a raw Central Control or generic target relationship.

**Authority / non-invention note.** Final Logical Model §5-3 and §12-2; the exact-scope FK is mandatory.

### 40. `local_policy_requirement_scope`

**Purpose and family.** Exact-target Local Policy decision for one Local Requirement Scope.

**Fields.** `ID`; `local_requirement_scope_id RAW(16) NOT NULL`; `policy_version_id RAW(16) NOT NULL`; documented local policy decision/action fields; `L+V`.

**Keys and relationships.** PK: `id`. Business key: unique `(local_requirement_scope_id, policy_version_id)`. FKs: `local_requirement_scope_id -> local_subprocess_requirement_scope(id)` and `policy_version_id -> central_policy_version(id)`.

**Composite FKs.** None; context is supplied by the Local Requirement Scope.

**Lifecycle, validity, and lock.** `L+V`; Policy Version interval compatibility is validated; `version` is required.

**Constraints and indexes.** Unique target pair, policy/scope FK indexes, valid policy decision check, and shared checks. It is an exact target and does not create a direct Regulation relationship.

**Mutability and Revision.** LOCAL revision only. Read-only Policy Applicability determines its eventual effect.

**Authority / non-invention note.** Final Logical Model §5-3 and §12-2; Requirement remains the approved policy/compliance endpoint.

## 4. Document — 3 business tables

### 41. `document`

**Purpose and family.** Stable Document identity; actual file content belongs only to immutable Document Versions.

**Fields.** `ID`; optional `code VARCHAR2(64 BYTE)`; `title VARCHAR2(255 CHAR) NOT NULL`; optional `description CLOB`; optional `document_category_code VARCHAR2(64 BYTE)`; `L+V`.

**Keys and relationships.** PK: `id`. The Logical Model documents optional code but does not prescribe an independent mandatory document business-key constraint. One Document has many Document Versions.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `L+V`; `version` governs identity metadata. File replacement is never an update to this row’s attached version.

**Constraints and indexes.** Shared checks. If optional code is implemented as a unique business key, its null/uniqueness semantics must be explicitly fixed in detailed design without creating an alternate document table.

**Mutability and Revision.** Document identity metadata changes use direct Document command transactions and do not create Business Revision or Revision Content. File content change creates a new `document_version`.

**Authority / non-invention note.** Final Logical Model §13-1; Physical Design §13. This table is not a generic attachment row.

### 42. `document_version`

**Purpose and family.** Immutable actual file/content version of one Document, with Oracle metadata and a stable MinIO object key.

**Fields.** `ID`; `document_id RAW(16) NOT NULL`; `document_version_number NUMBER(19,0) NOT NULL`; `file_name VARCHAR2(512 CHAR) NOT NULL`; `mime_type VARCHAR2(255 BYTE) NOT NULL`; `file_size NUMBER(19,0) NOT NULL`; `storage_object_key VARCHAR2(1024 BYTE) NOT NULL`; `checksum_algorithm VARCHAR2(32 BYTE) NOT NULL`; `checksum_value VARCHAR2(128 BYTE) NOT NULL`; lifecycle/validity/audit and optimistic `version`.

**Keys and relationships.** PK: `id`. Business key: unique `(document_id, document_version_number)`. FK: `document_id -> document(id)`. Referenced by Document Link; finalized metadata is copied from the confirmed temporary upload row.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** The file and content metadata are immutable after creation. Generic lifecycle status is not a means to overwrite a file.

**Constraints and indexes.** Unique document/version pair; `file_size >= 0`; indexed `document_id`; index references from link/temp upload. `storage_object_key` is a stable key, never a permanent URL.

**Mutability and Revision.** Finalization from a valid temporary upload creates this row; a replacement file creates the next version. Failed temporary or permanent storage preparation does not create a completed Document Version row.

**Authority / non-invention note.** Final Logical Model §13-1–§13-3; Physical Design §12–§13. No distributed Oracle–MinIO transaction exists.

### 43. `document_link`

**Purpose and family.** Controlled polymorphic link from an exact immutable Document Version to a permitted Master Data target.

**Fields.** `ID`; `document_version_id RAW(16) NOT NULL`; controlled `target_type VARCHAR2(32 BYTE) NOT NULL`; `target_id RAW(16) NOT NULL`; lifecycle/audit/optimistic-lock fields compatible with the stored relationship. Link-role semantics such as `PRIMARY_DOCUMENT` are controlled by the Document domain; the final models do not prescribe a separate field name. `target_type` uses the canonical 41-code Document Link Target Type vocabulary in this catalog.

**Keys and relationships.** PK: `id`. Business key: unique `(document_version_id, target_type, target_id)`. FK: `document_version_id -> document_version(id)`. `target_id` is validated by Document Service against the controlled `target_type` rather than an unbounded generic target table.

**Composite FKs.** This is one of only two approved controlled polymorphic relations; no composite FK can replace its target validation.

**Lifecycle, validity, and lock.** Link mutation is versioned and explicit. The link always names the precise version so a newer document file never silently changes historical evidence.

**Constraints and indexes.** Unique link triple; target-type check against the canonical 41-code Document Link Target Type vocabulary; indexed `document_version_id` via the unique index and an appropriate target lookup index if not covered. The target cannot be an arbitrary legacy attachment target.

**Mutability and Revision.** Linking to a Master Data target uses a direct Document command transaction and does not create Business Revision or Revision Content. The retained `MASTERDATA_REVISION` target vocabulary remains Backend-only and is not a normal Browser-selectable target.

**Authority / non-invention note.** Final Logical Model §13-3; Conceptual Model shared-document rules; Physical Design §8 and §13.

## 5. Business Revision — 2 business tables

### 44. `masterdata_revision`

**Purpose and family.** Header for one identifiable, Backend-owned Unit of Work representing one Central or one Local Master Data business decision.

**Fields.** `ID`; `revision_number NUMBER(19,0) NOT NULL`; `title VARCHAR2(255 CHAR) NOT NULL`; nullable `description CLOB`; `revision_domain VARCHAR2(32 BYTE) NOT NULL`; nullable `organization_id RAW(16)`; nullable `caused_by_revision_id RAW(16)`; `revision_status VARCHAR2(32 BYTE) NOT NULL`; nullable `external_approval_reference VARCHAR2(255 CHAR)`; nullable `impact_analysis_snapshot CLOB JSON`; nullable `impact_analyzed_at TIMESTAMP(6) WITH TIME ZONE`; nullable `impact_analyzed_by RAW(16)`; nullable `applied_at/applied_by`; nullable `cancelled_at/cancelled_by`; audit and `version NUMBER(19,0) NOT NULL` (`RV`).

**Keys and relationships.** PK: `id`. Business key: unique `revision_number`. FK: `organization_id -> organization(id)` when local; nullable self-FK `caused_by_revision_id -> masterdata_revision(id)` for separately created Local remediation of a Central impact. It parents Revision Contents.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** `revision_status` is `DRAFT`, `APPLIED`, or `CANCELLED`; no generic validity interval is documented. Applied revision and its snapshots are immutable; `version` protects header transitions.

**Constraints and indexes.** Check `(revision_domain='CENTRAL' AND organization_id IS NULL) OR (revision_domain='LOCAL' AND organization_id IS NOT NULL)`; controlled domain/status checks; unique revision number; indexes for organization, caused-by revision, and status/time query paths without a standalone low-selectivity status index.

**Mutability and Revision.** Built only by the Backend Command Service. A Central revision can modify only Central definitions/scope/coverage/classification/policy scope; a Local revision can modify only one organization’s Local data. The domains never mix.

**Authority / non-invention note.** Final Logical Model §5-4 and §14-1; Physical Design §14. This is not a general Audit Trail.

### 45. `masterdata_revision_content`

**Purpose and family.** Ordered immutable change records belonging to one Master Data Revision; the controlled polymorphic reference identifies the changed entity.

**Fields.** `ID`; `revision_id RAW(16) NOT NULL`; `sequence_number NUMBER(19,0) NOT NULL`; controlled `entity_type VARCHAR2(32 BYTE) NOT NULL`; `entity_id RAW(16) NOT NULL`; `operation_type VARCHAR2(32 BYTE) NOT NULL`; nullable `expected_version NUMBER(19,0)`; nullable `before_snapshot CLOB JSON`; nullable `after_snapshot CLOB JSON`; nullable `applied_entity_version NUMBER(19,0)`; nullable `validation_result CLOB JSON`; `created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL`; `created_by RAW(16) NOT NULL`; `version NUMBER(19,0) NOT NULL`. `entity_type` uses the canonical 43-code Revision Entity Type vocabulary in this catalog.

**Keys and relationships.** PK: `id`. Business key: unique `(revision_id, sequence_number)`. FK: `revision_id -> masterdata_revision(id)`. `entity_type/entity_id` is controlled polymorphism and must be domain-validated against the header.

**Composite FKs.** This is the second and final approved controlled polymorphic relation; entity references are not converted into a generic relationship table.

**Lifecycle, validity, and lock.** Operation is one of `CREATE`, `UPDATE`, `ACTIVATE`, `INACTIVATE`, `DELETE`, or `RESTORE`. No generic status/validity interval is documented. Applied content/snapshots are immutable; `version` supports guarded draft handling only.

**Constraints and indexes.** Unique revision/sequence; controlled operation/entity type checked against the canonical 43-code Revision Entity Type vocabulary; revision-domain compatibility enforced by Backend validation; indexed `revision_id` via the unique key and target lookup only when proven necessary. JSON values require `IS JSON` checks.

**Mutability and Revision.** Generated, sequenced, snapshot-filled, validated, and atomically applied by the Backend. The Frontend never sends this object, its sequence number, snapshots, or transaction order.

**Authority / non-invention note.** Final Logical Model §14-2 and §14-3; Physical Design §8 and §14.

## 6. Technical Tables — 2 technical tables

### T1. `document_temp_upload`

**Purpose and family.** The sole technical temporary-upload table in this redesign scope. Row existence means the temporary object was uploaded successfully, verified, and is waiting for explicit user confirmation.

**Fields and Oracle types.** `id RAW(16) NOT NULL`; `original_file_name VARCHAR2(512 CHAR) NOT NULL`; `mime_type VARCHAR2(255 BYTE) NOT NULL`; `file_size NUMBER(19,0) NOT NULL`; `storage_object_key VARCHAR2(1024 BYTE) NOT NULL`; `checksum_algorithm VARCHAR2(32 BYTE) NOT NULL`; `checksum_value VARCHAR2(128 BYTE) NOT NULL`; `uploaded_by RAW(16) NOT NULL`; `uploaded_at TIMESTAMP(6) WITH TIME ZONE NOT NULL`; `expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL`; `version NUMBER(19,0) NOT NULL`.

**Keys and relationships.** PK: `id`. Business/technical key: unique `storage_object_key`. No FK to `document_version`, no generic target, no `tempSessionId`, and no persisted status/history columns exist.

**Composite FKs.** None.

**Lifecycle, validity, and lock.** There is no persisted temporary-upload state machine. `uploaded_at` is the successful upload completion time, and `expires_at = uploaded_at + temporary TTL`. Upload transport timeout and temporary-file expiry are separate concepts. `PESSIMISTIC_WRITE` on the row is the single-use finalization guard, and `version` remains available for optimistic conventions.

**Constraints and indexes.** Check `file_size >= 0`; check `expires_at > uploaded_at`; check `version >= 0`; unique object key; mandatory file identity and ownership fields. There is no status check, consumed-row check, or index for removed status/version-pointer columns.

**Mutability and Revision.** Backend validates row existence, ownership, expiry, MinIO object presence, size, MIME metadata, and checksum before finalization. Final confirmation copies file metadata into `document_version`, deletes the `document_temp_upload` row in the Document transaction, and deletes the temporary MinIO object after commit. Temporary upload and final Document mutation do not create Revision Content.

**Authority / non-invention note.** Physical Design §12-1 through §12-4. It is technical, not one of the 45 business tables, and there is no distributed Oracle–MinIO transaction or Outbox.

### T2. `masterdata_hierarchy_guard`

**Purpose and family.** Internal database concurrency Guard for structural Organization and Process/Subprocess commands. It is technical and is not business Master Data.

**Fields and Oracle types.** `hierarchy_key VARCHAR2(64 BYTE) NOT NULL`; no UUID, version, lifecycle, audit, timestamp, status, description, or user columns.

**Keys and relationships.** PK: `hierarchy_key`. No foreign keys. The seeded key set contains exactly `ORGANIZATION` and `PROCESS`; there is no `SUBPROCESS` key because Process and Subprocess share `PROCESS`.

**Lifecycle, validity, and lock.** The key must equal `UPPER(TRIM(hierarchy_key))`. Structural command transactions acquire the exact row with `PESSIMISTIC_WRITE` and a configured JPA lock-timeout hint before revision allocation, hierarchy reads, validation, or mutation. Runtime code never creates, repairs, renames, or reseeds rows.

**Mutability and Revision.** Guard rows are immutable configuration and never create Revision Content. The table has no repository, API, controller, or generic CRUD exposure and is not a Document Link target.

**Authority / non-invention note.** ADR-0001 and [hierarchy-guard-row-contract.md](hierarchy-guard-row-contract.md). No additional Guard key, lock table, JVM lock, cache lock, or advisory-lock abstraction is authorized.

## Final count and verification rule

| Catalog family | Numbered tables |
| --- | ---: |
| Structural and Central Definitions | 14 (`01`–`14`) |
| Central Scope, Classification, Policy Scope, and Coverage | 13 (`15`–`27`) |
| Local Context, Local Scope, Local Coverage, and Local Policy Scope | 13 (`28`–`40`) |
| Document | 3 (`41`–`43`) |
| Business Revision | 2 (`44`–`45`) |
| **Business tables** | **45** |
| Technical tables | 2 (`T1`–`T2`) |
| **Total physical tables in this redesign scope** | **47** |

Manual proof: the contiguous numbered business list starts at `01` and ends at `45` exactly once; `T1` and `T2` are outside the business list. Programmatic gates for later implementation tasks must count Markdown headings in the form `### NN. table_name` and confirm 45 numbered business headings, plus exactly one `### T1.` and one `### T2.` heading.

No KPI, KRI, risk-assessment, control-test, workflow, monitoring, job, scheduler, cache, outbox, Audit, generic assignment, generic Scope, generic Coverage, or invented relationship table is part of this catalog.
