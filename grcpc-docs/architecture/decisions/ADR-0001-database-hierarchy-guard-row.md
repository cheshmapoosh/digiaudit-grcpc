# ADR-0001: Database Guard Row per Structural Hierarchy

- **Status:** Accepted
- **Decision date:** 2026-08-04
- **Owners:** GRC project owner and architecture review
- **Scope:** Master Data V2 structural hierarchies
- **Supersedes:** The earlier prohibition on any technical lock table and the earlier `45 business + 1 technical = 46` physical-table count, only for the approved hierarchy Guard mechanism

## Context

Structural mutations are multi-row operations. A move, delete, restore, or child creation can depend on the current node, destination parent, ancestors, children, lifecycle state, and related Process/Subprocess rows.

Entity-level optimistic locking prevents stale updates to the same row, but it cannot by itself prevent races that touch different rows, including:

- deleting a parent while another transaction creates or restores a child;
- concurrent moves that create a cycle;
- moving a Subprocess while its owning Process is deleted;
- two transactions validating different hierarchy snapshots and both committing.

Locking every row or locking the complete table is easy to reason about but unnecessarily broad. JVM-local and `Caffeine` locks fail when more than one application instance runs. Distributed-cache locking introduces lease, fencing, split-brain, and operational complexity that is not justified for this system.

The expected user count and structural-write rate are low. Correctness and a clear future rule are more important than maximizing parallel structural writes.

## Decision

Use one database Guard Row for each independent structural hierarchy.

All Guard Rows are stored in one technical table:

```text
masterdata_hierarchy_guard
```

Current approved rows:

| `hierarchy_key` | Protected hierarchy |
| --- | --- |
| `ORGANIZATION` | Organization parent-child structure |
| `PROCESS` | Shared Process and Subprocess structure |

`central_process` and `central_subprocess` are separate business tables but belong to one structural hierarchy and therefore share the `PROCESS` Guard Row.

A new feature must identify its hierarchy boundary before implementation. It either reuses an existing Guard Row or adds one new stable key through Flyway after architecture approval. Runtime code never creates Guard Rows lazily.

## Physical contract

Oracle Day-Zero DDL:

```sql
CREATE TABLE masterdata_hierarchy_guard (
    hierarchy_key VARCHAR2(64 BYTE) NOT NULL,
    CONSTRAINT pk_masterdata_hierarchy_guard PRIMARY KEY (hierarchy_key),
    CONSTRAINT ck_masterdata_hierarchy_guard_key
        CHECK (hierarchy_key = UPPER(TRIM(hierarchy_key)))
);

INSERT INTO masterdata_hierarchy_guard (hierarchy_key)
VALUES ('ORGANIZATION');

INSERT INTO masterdata_hierarchy_guard (hierarchy_key)
VALUES ('PROCESS');
```

The table is technical and minimal:

- no UUID is required;
- no lifecycle fields;
- no validity fields;
- no audit fields;
- no soft delete;
- no API or UI;
- no Business Revision Content;
- no Document Link target;
- no cache semantics;
- no runtime auto-repair.

The active Master Data V2 count becomes:

| Category | Count |
| --- | ---: |
| Business tables | 45 |
| Technical tables | 2 |
| Total physical tables | 47 |

The technical tables are exactly:

1. `document_temp_upload`
2. `masterdata_hierarchy_guard`

## Locking contract

The corresponding Guard Row is loaded with JPA `PESSIMISTIC_WRITE`, which delegates to the supported database dialect's row-level write-lock mechanism.

Conceptual repository contract:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("""
    select guard
      from MasterDataHierarchyGuardEntity guard
     where guard.hierarchyKey = :hierarchyKey
""")
Optional<MasterDataHierarchyGuardEntity> lockByHierarchyKey(
        @Param("hierarchyKey") String hierarchyKey
);
```

The Guard must be acquired:

1. inside the same business transaction as the mutation;
2. before the first hierarchy read or snapshot;
3. before parent, child, dependency, lifecycle, or cycle validation;
4. before any structural field is changed;
5. before Revision Content is finalized for the structural mutation;
6. and held until commit or rollback.

Preferred transaction order:

```text
Begin transaction
Acquire Guard Row with PESSIMISTIC_WRITE
Read current hierarchy
Validate expected entity version and hierarchy invariants
Apply structural mutation
Persist Business Revision and Revision Content where required
Flush
Commit or roll back
```

A revision header may be allocated earlier only when it is in the same transaction and is guaranteed to roll back if Guard acquisition or mutation fails. No partial Revision or Revision Content may survive a failed structural command.

## Guarded operations

The following are structural by default:

- create a node, including a root;
- move or re-parent a node;
- delete a node;
- restore a node;
- add or remove a parent-child relation;
- change structural order when order participates in an invariant;
- activate or inactivate when lifecycle affects parent/child eligibility;
- structural import, bulk update, initialization, repair, and administrative mutation.

Pure title, description, or display-metadata updates do not require a Guard when they cannot affect hierarchy correctness.

When classification is uncertain, analyze the hierarchy invariant first. Until proven non-structural, treat the operation as structural.

## Multiple hierarchy rule

A command that genuinely mutates more than one independent hierarchy must acquire all required Guard Rows in ascending lexical `hierarchy_key` order and keep them through one transaction.

Do not introduce an arbitrary service-specific order. The stable lexical order is the global deadlock-prevention rule.

## Failure behavior

- Missing Guard Row: fail closed with a configuration or internal consistency error.
- Lock timeout or acquisition failure: return a controlled concurrency response such as `HIERARCHY_BUSY` with HTTP `409`.
- Do not continue without the Guard.
- Do not create the row at runtime.
- Do not silently retry in the first implementation.
- The UI refreshes the affected tree/read model and lets the user repeat the command deliberately.

## Relationship to optimistic locking

Mutable business entities keep `@Version`.

Responsibilities are separate:

- Entity `@Version`: stale-client/lost-update detection for the affected record.
- Hierarchy Guard Row: serialization of multi-row structural invariants.

Neither replaces the other.

## Rejected alternatives

### Lock the complete business table
Rejected because it blocks unrelated non-structural writes and is database-specific.

### Lock every hierarchy row in ID order
Rejected because database lock-acquisition order is harder to prove, inserts are not naturally represented in an earlier snapshot, and it locks more rows than necessary.

### Entity `@Version` only
Rejected because concurrent transactions may mutate different rows and still violate one hierarchy invariant.

### Snapshot and compare every row version
Rejected because inserts/deletes and the gap between validation and mutation complicate correctness and increase implementation cost.

### `Caffeine` or JVM-local locks
Rejected as authoritative protection because they do not coordinate multiple application instances and disappear on restart.

### Distributed cache lock
Rejected for the current scale because leases, renewal, fencing, network partition, and split-brain handling add unjustified complexity.

### One Guard table per feature
Rejected. There is one technical table and one row per approved independent hierarchy.

## Consequences

Positive:

- clear and reviewable concurrency rule;
- row-level database coordination across all application instances;
- no table-wide business lock;
- predictable parent/delete/restore/move behavior;
- portable application contract through JPA `PESSIMISTIC_WRITE`;
- simple extension rule for future hierarchy features.

Trade-offs:

- structural writes inside one hierarchy are serialized;
- a transaction waiting for the Guard consumes a database connection;
- long-running structural transactions can delay others;
- real concurrent database verification is required.

These trade-offs are accepted because structural mutations are infrequent and the expected user population is limited.

## Compliance checklist

Every hierarchy implementation or review must prove:

- the hierarchy boundary and key are documented;
- all structural entry points acquire the correct Guard;
- the Guard is acquired before hierarchy reads and validation;
- the Guard and mutation share one transaction;
- Process and Subprocess share `PROCESS`;
- no path through REST, application service, import, batch, initializer, scheduler, or admin command bypasses the Guard;
- `@Version` is retained on mutable entities;
- failure leaves no partial source mutation or Revision data;
- multiple application instances remain correct;
- lock timeout and missing-row behavior fail closed;
- concurrency verification runs against the supported database engine.
