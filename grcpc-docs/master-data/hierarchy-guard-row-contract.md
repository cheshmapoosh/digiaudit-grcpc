# Master Data V2 Hierarchy Guard Row Contract

## 1. Status and precedence

This is a binding project-owner correction accepted on 2026-08-04.

It operationalizes [ADR-0001](../architecture/decisions/ADR-0001-database-hierarchy-guard-row.md).

For hierarchy concurrency and the technical-table count only, it supersedes older statements that:

- prohibited every technical lock table;
- declared `document_temp_upload` the sole technical table;
- fixed the total at 46 physical tables.

All unrelated Conceptual, Logical, Physical, Document, Revision, Greenfield, Legacy-removal, and exclusion rules remain unchanged.

## 2. Corrected physical count

| Category | Count |
| --- | ---: |
| Business tables | 45 |
| Technical tables | 2 |
| Total Master Data V2 physical tables | 47 |

Approved technical tables:

1. `document_temp_upload`
2. `masterdata_hierarchy_guard`

No third technical table is authorized by this decision.

## 3. Exact table purpose

`masterdata_hierarchy_guard` is a database concurrency coordination table. It is not:

- business Master Data;
- Audit;
- Monitoring;
- Workflow;
- Job or Scheduler;
- Cache;
- Outbox;
- Event Store;
- Revision Content;
- Document target;
- application-visible configuration.

The table has one row per approved independent hierarchy, not one row per business node and not one table per feature.

## 4. Current hierarchy registry

| Key | Entity/tables | Rule |
| --- | --- | --- |
| `ORGANIZATION` | `organization` | All structural Organization mutations share this Guard. |
| `PROCESS` | `central_process`, `central_subprocess` | Process and Subprocess are one structural hierarchy and share one Guard. |
| `RISK` | `central_risk_category`, `central_risk_template` | Category and Template structural mutations share this Guard. |
| `ACCOUNT_GROUP` | `central_account_group` | All Account Group structural mutations share this Guard. |
| `REGULATION` | `central_regulation_group`, `central_regulation`, `central_regulation_requirement` | The complete Regulation family shares this Guard. |
| `POLICY` | `central_policy_group`, `central_policy` | Policy Group and Policy structural mutations share this Guard; Policy Version allocation/publication additionally lock the owning Policy row. |

Future feature procedure:

1. Determine whether the feature is hierarchical.
2. Determine whether it belongs to an existing hierarchy boundary.
3. Reuse the existing key when it does.
4. When it is independent, document and approve one stable uppercase key.
5. Add that row through Flyway in the owning vertical slice.
6. Update `AGENTS.md`, ADR/contract references, table catalog, dependency map, and acceptance checklist.

Do not add speculative rows before the owning feature is designed.

## 5. DDL profile

```sql
CREATE TABLE masterdata_hierarchy_guard (
    hierarchy_key VARCHAR2(64 BYTE) NOT NULL,
    CONSTRAINT pk_masterdata_hierarchy_guard PRIMARY KEY (hierarchy_key),
    CONSTRAINT ck_masterdata_hierarchy_guard_key
        CHECK (hierarchy_key = UPPER(TRIM(hierarchy_key)))
);
```

Seed rows are Flyway-owned and deterministic:

```sql
INSERT INTO masterdata_hierarchy_guard (hierarchy_key)
VALUES ('ORGANIZATION');

INSERT INTO masterdata_hierarchy_guard (hierarchy_key)
VALUES ('PROCESS');

INSERT INTO masterdata_hierarchy_guard (hierarchy_key)
VALUES ('RISK');

INSERT INTO masterdata_hierarchy_guard (hierarchy_key)
VALUES ('ACCOUNT_GROUP');

INSERT INTO masterdata_hierarchy_guard (hierarchy_key)
VALUES ('REGULATION');

INSERT INTO masterdata_hierarchy_guard (hierarchy_key)
VALUES ('POLICY');
```

The table does not use UUID, lifecycle, validity, audit, soft-delete, or optimistic-version columns.

## 6. Application boundary

Provide a narrow internal port, for example:

```java
public interface MasterDataHierarchyGuard {
    void lock(HierarchyKey hierarchyKey);
}
```

`HierarchyKey` is a closed Backend enum/value object. Controllers and Browser payloads never supply arbitrary hierarchy keys.

The persistence adapter uses JPA `PESSIMISTIC_WRITE` against the exact Guard Row.

The application service must not expose the Guard entity or repository as a generic CRUD resource.

## 7. Mandatory sequence

For every structural command:

```text
Start the existing business transaction
Lock the correct Guard Row
Read the current hierarchy and affected records
Validate expected version and structural invariants
Apply the source mutation
Persist Revision data where the command is revision-controlled
Flush and complete the transaction
```

The lock must precede:

- hierarchy list/tree/snapshot reads;
- destination-parent reads;
- child/dependency checks;
- cycle validation;
- structural lifecycle validation;
- source-table mutation.

Reading first and locking later is not compliant.

## 8. Structural classification

Guarded by default:

- create;
- move/re-parent;
- delete;
- restore;
- parent-child link changes;
- hierarchy-significant ordering changes;
- lifecycle changes that affect structural eligibility;
- structural imports, batch commands, initializers, repair scripts, and admin endpoints.

Normally not guarded:

- title changes;
- description changes;
- display metadata changes;
- reads;
- fields proven not to affect any hierarchy invariant.

## 9. Revision interaction

The Guard does not replace Business Revision.

A structural command that requires a Revision still creates one Backend-owned Revision inside the same transaction.

A conflict, timeout, missing Guard, stale version, cycle, invalid parent, or dependency failure rolls back:

- source mutations;
- Revision header changes;
- Revision Content;
- sequence changes that are transactionally persisted.

No failed structural command is represented as an applied Revision.

## 10. Failure and API behavior

| Failure | Required behavior |
| --- | --- |
| Guard row missing | Fail closed as configuration/internal integrity failure. |
| Lock timeout/contention | Stable `HIERARCHY_BUSY`, HTTP `409`. |
| Stale entity version | Existing `VERSION_CONFLICT`, HTTP `409`. |
| Cycle | Existing `HIERARCHY_CYCLE`, HTTP `422`. |
| Invalid/deleted parent | Existing typed not-found or hierarchy validation error. |

The initial implementation does not automatically retry a structural command.

The UI refreshes the affected tree and allows a deliberate retry.

## 11. Multiple hierarchy ordering

When a future atomic command mutates multiple independent hierarchies, lock all required Guard Rows in ascending lexical key order.

Example:

```text
ACCOUNT_GROUP
ORGANIZATION
PROCESS
```

Every path must use the same global order.

## 12. Verification evidence

A hierarchy slice is not accepted without evidence that:

- every structural entry point acquires the correct Guard;
- the Guard is acquired before the first hierarchy read;
- the lock and mutation share one transaction;
- two application instances coordinate through the same database row;
- parent delete versus child create/restore cannot produce an orphan;
- opposing moves cannot create a cycle;
- Process and Subprocess commands use the same Guard;
- lock timeout fails safely;
- failed operations persist no source or Revision partial state;
- normal reads and non-structural updates remain available as designed.
