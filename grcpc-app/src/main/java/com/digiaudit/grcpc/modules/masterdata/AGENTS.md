# AGENTS.md - Master Data V2 backend

## Scope

Applies to backend code under `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/masterdata`.

Feature-specific `AGENTS.md` files under child folders extend these rules when working on Legacy features, but Master Data V2 implementation must follow the approved V2 planning documents.

## Required references

Use these documents before implementing any Master Data V2 slice:

- `grcpc-docs/master-data/implementation-contract.md`
- `grcpc-docs/master-data/table-catalog.md`
- `grcpc-docs/master-data/api-conventions.md`
- `grcpc-docs/master-data/hierarchy-guard-row-contract.md`
- `grcpc-docs/architecture/decisions/ADR-0001-database-hierarchy-guard-row.md`

Authority order:

1. Conceptual Model for business meaning and domain boundaries.
2. Final Logical Model for final table/entity names and relationships.
3. Physical Design Reference for Oracle, Flyway, constraints, indexes, and MinIO rules.
4. Explicit accepted project-owner corrections and ADRs for decisions made after the retained reference documents.
5. Customer UI documents for compatible UI behavior only.
6. Current source as Legacy implementation evidence only.

## Greenfield rules

- Master Data V2 is Greenfield on a fresh Oracle schema.
- Flyway owns the Day-Zero schema.
- There is no Legacy data migration, compatibility API, compatibility view, or dual write.
- The redesign scope is exactly 45 business tables plus two approved technical tables:
  - `document_temp_upload`
  - `masterdata_hierarchy_guard`
- The total physical table count inside Master Data V2 is 47.
- Do not add extra Master Data tables for convenience.
- Do not create one lock table per feature. All hierarchy keys are rows in the single `masterdata_hierarchy_guard` table.

## Structural hierarchy concurrency rules

The database Guard Row is the source of correctness for structural hierarchy concurrency.

Before implementing, modifying, or reviewing a structural mutation, identify the hierarchy boundary.

Current approved hierarchy keys:

| Hierarchy key | Protected structure |
| --- | --- |
| `ORGANIZATION` | `organization` parent-child hierarchy |
| `PROCESS` | Shared `central_process` and `central_subprocess` structure |

Do not pre-create speculative hierarchy keys. A later vertical slice adds a key through Flyway only after its hierarchy boundary is approved.

The following operations must acquire the relevant Guard Row with `PESSIMISTIC_WRITE`:

- Create a node, including a root node.
- Move or re-parent a node.
- Delete a node.
- Restore a deleted node.
- Add or remove a parent-child relation.
- Change structural ordering when ordering participates in a hierarchy invariant.
- Activate or inactivate when lifecycle status affects parent/child eligibility or dependency validity.
- Perform structural imports, bulk operations, initialization, repair, or administrative commands.

The required sequence is:

```text
Begin the business transaction
Acquire the hierarchy Guard Row with PESSIMISTIC_WRITE
Read the current hierarchy state
Validate version, parent, lifecycle, dependencies, and cycles
Apply the structural mutation
Persist the Business Revision and Revision Content where required
Flush and commit, or roll back everything
Release the Guard Row automatically at transaction completion
```

Mandatory details:

- Acquire the Guard before the first hierarchy read or validation. Locking after a hierarchy snapshot is invalid.
- The Guard, validation, source mutation, and revision persistence must use the same transaction and physical database connection.
- `central_process` and `central_subprocess` use the same `PROCESS` Guard Row.
- If a future command touches multiple independent hierarchies, acquire their Guard Rows in ascending `hierarchy_key` order.
- A missing Guard Row fails closed as a configuration/integrity error.
- Lock timeout or acquisition failure returns a controlled concurrency error such as `HIERARCHY_BUSY`; do not auto-create a Guard, continue without it, or silently retry.
- A rejected or conflicting command must not persist a partial business mutation, revision, or revision content.
- Entity `@Version` remains required for stale-client and lost-update detection, but it is not sufficient for multi-row hierarchy invariants.

Prohibited authoritative alternatives:

- `Caffeine`
- `ReentrantLock`
- JVM-local synchronization or lock registries
- Distributed cache locks
- Table-wide locks
- Locking every hierarchy row as a substitute for the Guard Row
- Comparing snapshots of every entity version
- Entity-level `@Version` alone

## Revision rules

- The Backend owns `masterdata_revision` and `masterdata_revision_content`.
- The Browser never creates Revision Content, sequence numbers, snapshots, or transaction ordering.
- Every later mutation slice must use the `MasterDataRevisionCoordinator` contract.
- Central and Local changes must not mix in one revision.
- Local mutations must be tied to exactly one Organization.
- Applied revisions are immutable; corrections use a new compensating revision.
- Structural commands acquire the hierarchy Guard Row before hierarchy reads and keep it through revision-controlled mutation completion.

## Prohibitions

- Do not create generic Scope, Coverage, Assignment, Relation, or CRUD frameworks.
- Do not add KPI, KRI, workflow, monitoring, job, scheduler, outbox, cache, or generic audit structures to Master Data V2.
- `masterdata_hierarchy_guard` is the sole approved hierarchy-concurrency technical table and is not a Cache, Audit, Monitoring, Job, Workflow, or business table.
- Do not add persistence, Flyway, API, UI, or test work unless the prompt explicitly authorizes that slice.
- For the current implementation sequence, do not create tests and do not run test commands unless the prompt explicitly changes that restriction.

## Legacy replacement

Legacy removal belongs to the vertical slice that replaces that Legacy behavior.

Do not preserve a Legacy endpoint, entity, table, permission, or data flow as a compatibility layer when the approved V2 slice replaces it.

Until its owning P4-P7 slice is implemented, future-slice Legacy source may remain only as implementation evidence and must stay excluded from the default component and repository scans. `PersistenceManagedTypes` is the exact JPA managed-class allowlist; do not rely on package entity scanning, weaken Hibernate `ddl-auto=validate`, or map a Legacy entity to a V2 table.

When an owning V2 slice replaces a quarantined area, implement its approved V2 persistence and API, add only its approved managed classes to `PersistenceManagedTypes`, delete the Legacy source, remove the quarantine entry, and rerun fresh-Oracle Flyway plus Hibernate validation.
