# AGENTS.md - backend process master data

## Scope
Applies to the backend process feature under `modules/masterdata/process`.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Document commands remain outside Revision under the Prompt 4.2 correction.
- Document temporary upload keeps the simplified Prompt 4.2 contract.
- No automated tests are part of the current task unless explicitly authorized.

## Process hierarchy Guard
- Process and Subprocess form one structural hierarchy and share the exact hierarchy key `PROCESS`.
- Do not create a separate `SUBPROCESS` Guard Row.
- Every Process or Subprocess create, move/re-parent, delete, restore, structural import/initialization, and lifecycle command that affects ownership or parent eligibility must acquire the `PROCESS` row from `masterdata_hierarchy_guard` with `PESSIMISTIC_WRITE`.
- Acquire the Guard before reading either Process or Subprocess structural state, validating the owner Process, checking children/dependencies, validating a Process cycle, or changing a structural relation.
- Guard acquisition, validation, Process/Subprocess mutation, and Business Revision persistence must execute in the same transaction.
- The shared Guard removes the need to lock the complete Process and Subprocess tables or to define competing lock orders across both tables.
- Do not use JVM or cache locks as the source of correctness.

## Process/Subprocess rules
- Persist Process rows only in `central_process`.
- Persist Subprocess rows only in `central_subprocess`.
- The combined Process/Subprocess tree DTO may expose `PROCESS` and `SUBPROCESS` node types for UI presentation only.
- Subprocess is a structural leaf and must not expose child creation.
- Process and Subprocess General Information Update may atomically apply details plus a requested `ACTIVE` or `INACTIVE` status through one targeted row lock, one transaction, one Business Revision, and one `UPDATE` Revision Content. Update never accepts `DELETED` or a structural parent/owner field and does not acquire `PROCESS`.
- Create, Move, Delete, Restore, and create-based reactivate/restore remain structural and Guard-protected by `PROCESS`; existing activate/inactivate endpoints remain available.
- Keep explicit typed V2 command routes under `/api/master-data/central/processes` and `/api/master-data/central/subprocesses`.
