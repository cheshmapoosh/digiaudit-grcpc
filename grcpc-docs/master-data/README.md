# Master Data V2 — Phase 1 Reference Pack

## Purpose

This directory is the implementation-planning baseline for the greenfield Master Data V2 redesign in `cheshmapoosh/digiaudit-grcpc`.

It reconciles the approved Conceptual Model, Final Logical Model, Physical Design Reference, the retained customer UI documents, and the current application solely as Legacy implementation evidence.

The eight Markdown files in this directory are planning artifacts. They do not change the application, database, runtime configuration, permissions, or the retained Word documents.

## Execution record

| Item | Recorded value |
| --- | --- |
| Repository | `cheshmapoosh/digiaudit-grcpc` |
| Current branch | `feature/master-data-v2-greenfield` |
| Documentation baseline commit | `861792c7ed49a5f8ea14201d6d7892f6010c52a4` |
| Documentation baseline message | `docs(master-data): add v2 implementation references and planning documents` |
| Execution date | 2026-07-30 |
| Approved-model date | 2026-07-29 |
| Design mode | Greenfield Oracle Day-Zero implementation |
| Application-code changes in this corrective planning pass | None |

The Final Logical Model records `a773cbf37784a286e72d09dab506abe9b1d830a4` (`release(grcpc): 1.0.4`) as its source-code inventory baseline. The commit above is the repository baseline observed immediately before this reconciliation pass; these are different, intentionally recorded reference points.

## Directory contents

### Authoritative reference documents

| Filename | Document title / version | Authority supplied by the document |
| --- | --- | --- |
| `GRC_Master_Data_Reference_Conceptual_Model_FA.docx` | *GRC Master Data Reference Model — Conceptual Design*, v1.0, approved | Business meaning, Central Blueprint, Local Context, Effective View, Roll-up, Policy Propagation, Document concepts, Business Revision, and domain boundaries. |
| `GRC_Master_Data_Logical_Model_Final_FA.docx` | `سند مرجع نهایی مدل منطقی اطلاعات پایه سامانه GRC`, v2.0 Final, cycles 1–12 locked | Exact final entities, typed relationships, local context, scope, coverage, policy applicability, document and revision structures, subject to the Prompt 3.3 Document scope correction recorded below. |
| `GRC_Master_Data_Physical_Design_Reference_FA.docx` | *GRC Master Data Physical Design Reference*, v1.0 | Oracle 19c physical rules, types, sizes, constraints, indexes, Flyway Day-Zero, MinIO, and the sole technical temporary-upload table. |

### Customer UI documents retained for compatibility analysis

Customer documents describe the existing customer-facing vocabulary and visual workflows. They may inform compatible UI behavior only when it fits the approved model.

| Filename | Main customer subject |
| --- | --- |
| `اهداف- فرم ایجاد اطلاعات پایه- Master Data  .docx` | Generic objective hierarchy and form |
| `ریسک- فرم ایحاد اطلاعات پایه .docx` | Risk category and risk-template form |
| `سازمان - فرم ایجاد اطلاعات پایه- Master Data  .docx` | Organization hierarchy and contextual tabs |
| `سیاست- فرم ایجاد اطلاعات پایه- Master Data  .docx` | Policy hierarchy, versions, scope, and workflow mock-up |
| `فرایند و زیرفرایند - فرم ایجاد اطلاعات پایه- Master Data  .docx` | Combined process/subprocess tree and related tabs |
| `هدف کنترلی- فرم ایجاد اطلاعات پایه- Master Data  .docx` | Control-objective catalog and links |
| `کنترل- فرم ایجاد اطلاعات پایه -Master Data.docx` | Control form, relationships, documents, and execution-oriented tabs |
| `گروه حساب ها-فرم ایجاد اطلاعات پایه- Master Data  .docx` | Account-group hierarchy and classifications |
| `گروه قوانین - فرم ایجاد اطلاعات پایه- Master Data  .docx` | Regulation-group, regulation, and requirement hierarchy |

### Generated implementation documents

1. [Implementation contract](implementation-contract.md) — non-negotiable architecture and ownership rules.
2. [Table catalog](table-catalog.md) — the exact 45 business tables and one technical table.
3. [Dependency map](dependency-map.md) — schema, backend, UI, revision, document, and read-model sequencing.
4. [Legacy deletion map](legacy-deletion-map.md) — current implementation inventory and slice-owned replacement/removal work.
5. [API conventions](api-conventions.md) — use-case APIs, commands, DTOs, errors, authorization, documents, and read queries.
6. [UI compatibility map](ui-compatibility-map.md) — customer/current/target UI traceability.
7. [Acceptance checklist](acceptance-checklist.md) — implementation and full-stack verification gates.

## Authority hierarchy

1. The Conceptual Model owns business meaning and the Master Data domain boundary.
2. The Final Logical Model owns final entities, table names, relationships, and dependency rules.
3. The Physical Design Reference owns Oracle types, sizes, physical constraints, indexes, Flyway, and MinIO rules.
4. Customer UI documents own only compatible expected UI fields, labels, forms, tabs, and workflows.
5. Current source code is implementation and Legacy evidence; it is not authoritative when it conflicts with the approved model.

No customer mock-up or existing endpoint may introduce a Master Data concept absent from the approved model.

Prompt 3.3 records an explicit project-owner scope correction for the exact Document physical scope. That correction governs the active implementation contract for Document tables: `document_retention_policy` and `document_hold` are not part of Master Data V2, and future prompts must not reintroduce them from older extracted material.

## Recommended reading order

1. Read the three authoritative Word documents in the authority order above.
2. Read [implementation-contract.md](implementation-contract.md) for boundaries that later implementation tasks must honor.
3. Read [table-catalog.md](table-catalog.md) for exact schema vocabulary and physical conventions.
4. Read [dependency-map.md](dependency-map.md) before dividing later work into vertical slices.
5. Read [api-conventions.md](api-conventions.md) and [ui-compatibility-map.md](ui-compatibility-map.md) before changing APIs or UI.
6. Use [legacy-deletion-map.md](legacy-deletion-map.md) while replacing existing implementation.
7. Apply [acceptance-checklist.md](acceptance-checklist.md) to each implementation prompt and final integration.

## Approved table baseline

Prompt 3.3 records an explicit project-owner scope correction for the counted Document physical scope. The active implementation baseline is 45 business tables plus one technical temporary-upload table; this correction does not claim that the retained DOCX files already contained the four-table correction.

### 1. Structural and Central Definitions — 14

1. `organization`
2. `central_process`
3. `central_subprocess`
4. `central_control`
5. `central_control_objective`
6. `central_risk_category`
7. `central_risk_template`
8. `central_account_group`
9. `central_regulation_group`
10. `central_regulation`
11. `central_regulation_requirement`
12. `central_policy_group`
13. `central_policy`
14. `central_policy_version`

### 2. Central Scope, Classification, Policy Scope, and Coverage — 13

15. `central_subprocess_control_scope`
16. `central_subprocess_risk_scope`
17. `central_subprocess_control_objective_scope`
18. `central_subprocess_requirement_scope`
19. `central_policy_version_subprocess_scope`
20. `central_policy_version_control_scope`
21. `central_policy_version_requirement_scope`
22. `central_control_account_group`
23. `central_control_objective_account_group`
24. `central_subprocess_risk_control_coverage`
25. `central_subprocess_risk_control_objective_coverage`
26. `central_subprocess_control_control_objective_coverage`
27. `central_subprocess_requirement_control_coverage`

### 3. Local Context, Local Scope, Local Coverage, and Local Policy Scope — 13

28. `local_organization_subprocess_scope`
29. `local_subprocess_control_scope`
30. `local_subprocess_risk_scope`
31. `local_subprocess_control_objective_scope`
32. `local_subprocess_requirement_scope`
33. `local_subprocess_risk_control_coverage`
34. `local_subprocess_risk_control_objective_coverage`
35. `local_subprocess_control_control_objective_coverage`
36. `local_subprocess_requirement_control_coverage`
37. `local_policy_organization_scope`
38. `local_policy_subprocess_scope`
39. `local_policy_control_scope`
40. `local_policy_requirement_scope`

### 4. Document — 3

41. `document`
42. `document_version`
43. `document_link`

### 5. Business Revision — 2

44. `masterdata_revision`
45. `masterdata_revision_content`

The approved technical table outside the business-table count remains `document_temp_upload`.

| Count | Value |
| --- | ---: |
| Business tables | 45 |
| Technical temporary-upload tables | 1 |
| Total physical tables in this redesign scope | 46 |

Effective, Diagnostic, Roll-up, and Policy Applicability are read-only derived views or specialized queries. They are not stored business tables, cache tables, or materialized results.

## Implementation phase tracker

| Later phase | Intended deliverable | Prerequisite / exit condition |
| --- | --- | --- |
| 2 — Day-Zero foundation | Oracle conventions, final Flyway baseline, shared lifecycle/value objects, organization/process/subprocess | Fresh Oracle schema starts from the approved final names. |
| 3 — Central catalog | Central definitions, hierarchies, policy/version, account-group classifications | Typed central catalogs and no combined Legacy persistence remain in the slice. |
| 4 — Central relationship model | Central scope, central policy scope, central coverage, impact analysis | Same-subprocess constraints and typed APIs are demonstrable. |
| 5 — Local context model | Local organization-subprocess scope, local scope, coverage, local policy scope | Same-context constraints and no Central-to-Local mutation are demonstrable. |
| 6 — Document and revision | Document/version/link, temporary upload, revision command service | Immutable document versions and backend-owned atomic revisions work end to end. |
| 7 — Read models | Effective, Diagnostic, Roll-up, Policy Applicability | Read-only, non-materialized results use a common evaluation date. |
| 8 — UI replacement and cleanup | Compatible UI5/FCL flows, typed data flows, Legacy route/API/entity cleanup | Every replaced Legacy element is removed by its owning vertical slice. |
| 9 — Full-stack acceptance | Security, browser UX, Oracle/MinIO integration, build and cleanup checks | All checks in the acceptance checklist pass. |

The tracker is a delivery sequence, not authorization to expand the model with additional tables or modules.

## Document movement and filename handling

The customer Word documents are already retained under this directory, and the three English-named authoritative Word documents are committed here. This corrective planning pass performs no document movement and does not alter any Word file.

Several customer filenames contain the phrase `Master Data` and two contain double spaces before `.docx`; they remain intentionally unchanged so their original customer provenance is preserved. There is no duplicate authoritative file: the Conceptual, Final Logical, and Physical Design documents have distinct filenames, titles, versions, and authority roles.

## Confirmed exclusions

Master Data V2 does not add KPI, KRI, risk-assessment results, likelihood, impact, risk scores, control-test results, control-effectiveness results, policy approval workflow, monitoring, jobs, scheduler, cache, outbox, or generic Audit tables.

Policy approval is an external workflow dependency for publishing a policy version; it is not a Master Data table family or implementation feature in this redesign.

## Change-scope confirmation

This corrective pass rewrites only the eight Markdown planning files listed above. No Java, TypeScript, React, CSS, Flyway, Maven, npm, runtime configuration, permissions, i18n, tests, or Word document was changed.
