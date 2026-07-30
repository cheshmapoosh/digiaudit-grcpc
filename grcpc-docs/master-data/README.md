# Master Data V2 — Phase 1 Implementation Baseline

## Directory purpose

This directory contains the Phase 1 planning baseline for the greenfield Master Data V2 redesign.

It is the handoff package for later database, backend, frontend, document, security, and cleanup vertical slices.

It does not contain application source changes.

It does not move customer documents again.

It keeps the customer UI evidence beside the implementation contract that governs later work.

## Repository and execution baseline

| Item | Value |
| --- | --- |
| Repository | `cheshmapoosh/digiaudit-grcpc` |
| Current branch | `feature/master-data-v2-greenfield` |
| Baseline commit SHA | `a773cbf37784a286e72d09dab506abe9b1d830a4` |
| Baseline commit message | `release(grcpc): 1.0.4` |
| Phase 1 execution date | 2026-07-30 |
| Database target | Fresh Oracle 19c-compatible installation |
| Schema ownership | Flyway Day-Zero; Hibernate validates only |
| Master Data table count | 47 business tables plus 1 technical temporary-upload table |
| Explicit exclusions | KPI, KRI, assessment results, test results, workflow, monitoring, jobs, scheduler, outbox, cache |

## Authority hierarchy

1. `GRC Master Data Conceptual Model` governs business meaning, Central Blueprint, Local Context, Effective View, Business Revision, and shared Document concepts.
2. `GRC Master Data Final Logical Model` governs final entities, relationships, Scope, Coverage, Local Context, Policy Scope, Document, and Business Revision.
3. `GRC Master Data Physical Design Reference` governs Oracle types, sizes, constraints, indexes, Flyway Day-Zero, MinIO, and the one technical temporary-upload table.
4. Customer UI Word documents govern compatible fields, tabs, labels, workflows, and visual behavior only.
5. Current repository source governs implementation evidence and legacy cleanup only.

The three named authoritative model files were not physically present under this directory during the review.

The task-issued model rules were therefore used as the approved baseline, while unknown file-specific detail is labeled as an implementation assumption in the catalog.

No customer mock-up or current source behavior overrides that hierarchy.

## Authoritative reference-document inventory

| Declared title | Expected authority | Physical review result | Treatment in Phase 1 |
| --- | --- | --- | --- |
| `GRC Master Data Conceptual Model` | Business meaning and domain boundaries | No `.doc`, `.docx`, or `.md` file with this title was found under `grcpc-docs/master-data/` or repository history | Use the task-issued conceptual rules; do not fabricate unobserved sections/pages |
| `GRC Master Data Final Logical Model` | Final 47 business entities and relationships | No file with this title was found under the target directory or repository history | Use the task-issued table boundary and relation rules; identify physical naming as a Phase 1 assumption |
| `GRC Master Data Physical Design Reference` | Oracle and MinIO physical rules | No file with this title was found under the target directory or repository history | Use explicit task-issued RAW(16), Day-Zero, MinIO, and one-temp-table rules; identify delegated sizes as assumptions |

The absence is an evidence condition, not permission to infer KPI/KRI, generic assignments, or legacy compatibility requirements.

## Customer UI Word-document inventory

All nine DOCX files were read by paragraph and table content, including merged-cell metadata where represented in OOXML.

Word core titles and subjects are blank, so each file was identified by embedded Persian screen content rather than filename alone.

| Customer document filename | Identified content | V2 planning use |
| --- | --- | --- |
| `اهداف- فرم ایجاد اطلاعات پایه- Master Data  .docx` | Generic Objectives tree/form, strategy, organization-unit and document tabs | Evidence for legacy generic Objective removal; not model authority over Control Objective |
| `ریسک- فرم ایحاد اطلاعات پایه .docx` | Risk Category/Risk Template tree, KRI, causes/effects, response/control-center tabs | Evidence for split risk UI and removal of KRI/assessment-adjacent features |
| `سازمان - فرم ایجاد اطلاعات پایه- Master Data  .docx` | Organization hierarchy, subprocess/risk/control wizard, reference tabs, documents, KPI/KRI | Evidence for Local Context visual workflow and exclusions |
| `سیاست- فرم ایجاد اطلاعات پایه- Master Data  .docx` | Policy Group/Policy tree, version, workflow, scope, documents, review/approval | Evidence for Policy/Version visual behavior and workflow removal |
| `فرایند و زیرفرایند - فرم ایجاد اطلاعات پایه- Master Data  .docx` | Process → Subprocess → Control tree and direct related tabs | Evidence for combined tree projection and typed scope/coverage remap |
| `کنترل- فرم ایجاد اطلاعات پایه -Master Data.docx` | Control form, steps, law/requirements/risk/account-group/documents/performance tabs | Evidence for typed coverage UI, direct-law removal, and out-of-scope tabs |
| `گروه حساب ها-فرم ایجاد اطلاعات پایه- Master Data  .docx` | Account Group hierarchy, assertions, GL ranges, risks, documents | Evidence for normalized Account Group relation UI |
| `گروه قوانین - فرم ایجاد اطلاعات پایه- Master Data  .docx` | Regulation Group → Regulation → Requirement hierarchy | Evidence for separate entities and combined tree projection |
| `هدف کنترلی- فرم ایجاد اطلاعات پایه- Master Data  .docx` | Control Objective catalog, Subprocess/Risk/Documents tabs | Evidence for approved Control Objective UI and typed relationships |

## Generated implementation-document inventory

These seven documents are the other generated Markdown files in this directory.

| Document | Purpose |
| --- | --- |
| [implementation-contract.md](implementation-contract.md) | Binding greenfield, data, architecture, document, revision, and exclusion rules |
| [table-catalog.md](table-catalog.md) | Complete 47-business-table and 1-technical-table physical catalog |
| [dependency-map.md](dependency-map.md) | Flyway, backend, UI, revision, document, and read-model order |
| [legacy-deletion-map.md](legacy-deletion-map.md) | Slice-owned legacy replacement/removal inventory |
| [api-conventions.md](api-conventions.md) | Typed command/read/error/security/document API contract |
| [ui-compatibility-map.md](ui-compatibility-map.md) | Customer/current/target UI traceability and required additions |
| [acceptance-checklist.md](acceptance-checklist.md) | Implementation-prompt acceptance gates and full-stack release checks |

## Recommended reading order

1. Read this README for scope, sources, and navigation.
2. Read [implementation-contract.md](implementation-contract.md) before making any design or code change.
3. Read [table-catalog.md](table-catalog.md) before writing Flyway, entity, repository, or DTO code.
4. Read [dependency-map.md](dependency-map.md) before planning a vertical slice or migration order.
5. Read [api-conventions.md](api-conventions.md) before implementing controller, service, frontend repository, or state code.
6. Read [ui-compatibility-map.md](ui-compatibility-map.md) before changing routes, FCL pages, dialogs, Value Help, i18n, or document UX.
7. Read [legacy-deletion-map.md](legacy-deletion-map.md) while replacing legacy code in the owning slice.
8. Use [acceptance-checklist.md](acceptance-checklist.md) to verify each slice and final delivery.

## Master Data V2 table summary

The 47 business tables are intentionally grouped into six families.

| Family | Business-table count | Core responsibility |
| --- | ---: | --- |
| Structural and Central Definitions | 18 | Organization, separate process/risk/regulation/policy hierarchies, Control Objective, Control, and normalized Account Group relations |
| Central Scope, Classification, Policy Scope, and Coverage | 12 | Central Blueprint, typed Central Scope, classification, coverage, and Policy Scope |
| Local Context, Local Scope, Local Coverage, and Local Policy Scope | 12 | Organization–Subprocess context, explicit local applicability, classification, coverage, and policy applicability facts |
| Document | 3 | Document identity, immutable Document Version, controlled Document Link |
| Business Revision | 2 | Backend-owned revision root and immutable Revision Content |
| Total business tables | **47** | Complete Master Data business persistence boundary |

The single technical table is `document_temp_upload`.

It receives a backend-issued `tempUploadId`, has expiry and one-time consumption state, and is not a business document or generic attachment table.

No other temporary, cache, job, scheduler, outbox, workflow, monitoring, audit, or materialized-result table is permitted in this redesign scope.

## Intended later implementation phases

| Phase | Vertical slice | Primary outputs | Legacy responsibility owned by the slice |
| --- | --- | --- | --- |
| P0 | Day-Zero foundation | RAW(16), Flyway Day-Zero, lifecycle, optimistic locking, revision core, permission/error conventions | No V2 text UUID or generic compatibility scaffold |
| P1 | Central definitions | B01–B18, separate entities, normalized Account Group relations | Combined Process/Risk/Regulation/Policy/Objective and JSON account-group implementations |
| P2 | Central Scope | B19–B24 and typed commands/read DTOs | Legacy process assignments and historic process-control assignment |
| P3 | Central Coverage and Policy Scope | B25–B30, same-Subprocess rules | Direct Control–Regulation and generic control link behavior |
| P4 | Local Context | B31, context navigation and lifecycle | Organization-process assignment behavior |
| P5 | Local Scope/Coverage/Policy Scope | B32–B42, local validity/same-context rules | Organization reference/risk assignments and generic local links |
| P6 | Document and Business Revision integration | B43–B47 and T01, secure upload/download/versioning | `document_attachment`, `control_document`, direct upload, `tempSessionId`, standalone commit |
| P7 | Read models | Effective, Diagnostic, Roll-up, Policy Applicability queries | Any attempt to persist derived results |
| P8 | Full-stack cleanup | dead-code removal, permissions/i18n cleanup, final verification | Residue not removed by its owning vertical slice |

## Document movement summary

The customer Word documents had already been moved from `grcpc-docs/` directly into `grcpc-docs/master-data/` before this task began.

This task did not move, rename, overwrite, restore, stash, reset, clean, or delete those documents.

The initial working tree showed nine staged rename records for those customer files.

The Phase 1 deliverable is the eight Markdown files in this directory, not a second document move.

## Filename collision and deduplication decisions

No byte-identical duplicate among the nine customer files was identified.

Several names share the `Master Data` suffix and inconsistent spacing; existing filenames, including trailing spaces before `.docx`, are preserved exactly.

The `کنترل` (Control) and `هدف کنترلی` (Control Objective) files are distinct documents and remain separate evidence sources.

The generic `اهداف` (Objectives) file is distinct from the Control Objective file; it is not deduplicated because it documents a legacy feature that must be removed/remapped.

Titles and subjects in Word metadata are blank, so filename alone was not used to determine document meaning.

No authoritative reference file is substituted with a customer mock-up merely because names or UI areas overlap.

## Non-negotiable design reminder

Central definitions are independent from Organization.

Local facts exist only under an Organization plus Subprocess Context.

Scope and Coverage are typed.

Document Link and Revision Content are the only controlled polymorphism.

Business Revision and transaction ordering are backend-owned.

Temporary upload precedes final Document Version creation.

Effective, Diagnostic, Roll-up, and Policy Applicability are read-only.

KPI and KRI are not Master Data V2.

## Phase 1 change statement

No Java, TypeScript, React, CSS, Flyway, Maven, npm, runtime configuration, permission, i18n, test, or application behavior file was changed by this Phase 1 documentation task.

The only intended new files are this README and the seven linked Markdown implementation documents.
