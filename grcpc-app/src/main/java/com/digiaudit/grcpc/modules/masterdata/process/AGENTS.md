# AGENTS.md - backend process master data

## Scope
Applies to the backend process feature under `modules/masterdata/process`.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Document mutations do not create Document Revision Content; when supplied by a parent aggregate Save, they join that parent command's Spring transaction.
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
- Process and Subprocess General Information Update atomically applies details, typed parent/owner, a requested `ACTIVE` or `INACTIVE` status, and staged Document mutations through the `PROCESS` Guard, one transaction, one Business Revision, and one typed `UPDATE` Revision Content. Update never accepts `DELETED` or code.
- Create and Update are structural and Guard-protected by `PROCESS`. Process Update rejects self/descendant parenting; Subprocess Update requires an eligible owning Process. Move endpoints remain Backend-compatible but are not used by the Prompt 5.10 browser flow.
- Temporary uploads are preflighted before the Process/Subprocess Oracle mutation. Any parent/owner, document, authorization, optimistic-lock, storage, or finalization failure rolls the aggregate transaction back.
- Keep explicit typed V2 command routes under `/api/master-data/central/processes` and `/api/master-data/central/subprocesses`.
