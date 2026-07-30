# AGENTS.md - Master Data V2 backend

## Scope

Applies to backend code under `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/masterdata`.

Feature-specific `AGENTS.md` files under child folders extend these rules when working on Legacy features, but Master Data V2 implementation must follow the approved V2 planning documents.

## Required references

Use these documents before implementing any Master Data V2 slice:

- `grcpc-docs/master-data/implementation-contract.md`
- `grcpc-docs/master-data/table-catalog.md`
- `grcpc-docs/master-data/api-conventions.md`

Authority order:

1. Conceptual Model for business meaning and domain boundaries.
2. Final Logical Model for final table/entity names and relationships.
3. Physical Design Reference for Oracle, Flyway, constraints, indexes, and MinIO rules.
4. Customer UI documents for compatible UI behavior only.
5. Current source as Legacy implementation evidence only.

## Greenfield rules

- Master Data V2 is Greenfield on a fresh Oracle schema.
- Flyway owns the Day-Zero schema.
- There is no Legacy data migration, compatibility API, compatibility view, or dual write.
- The redesign scope is exactly 47 business tables plus one technical table, `document_temp_upload`.
- Do not add extra Master Data tables for convenience.

## Revision rules

- The Backend owns `masterdata_revision` and `masterdata_revision_content`.
- The Browser never creates Revision Content, sequence numbers, snapshots, or transaction ordering.
- Every later mutation slice must use the `MasterDataRevisionCoordinator` contract.
- Central and Local changes must not mix in one revision.
- Local mutations must be tied to exactly one Organization.
- Applied revisions are immutable; corrections use a new compensating revision.

## Prohibitions

- Do not create generic Scope, Coverage, Assignment, Relation, or CRUD frameworks.
- Do not add KPI, KRI, workflow, monitoring, job, scheduler, outbox, cache, or generic audit structures to Master Data V2.
- Do not add persistence, Flyway, API, UI, or test work unless the prompt explicitly authorizes that slice.
- For the current implementation sequence, do not create tests and do not run test commands.

## Legacy replacement

Legacy removal belongs to the vertical slice that replaces that Legacy behavior.

Do not preserve a Legacy endpoint, entity, table, permission, or data flow as a compatibility layer when the approved V2 slice replaces it.
