# AGENTS.md - backend organization module

## Scope
Applies to the backend `organization` module.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Document commands remain outside Revision under the Prompt 4.2 correction.
- Document temporary upload keeps the simplified Prompt 4.2 contract.
- No automated tests are part of the current task unless explicitly authorized.

## Organization hierarchy Guard
- The Organization hierarchy key is exactly `ORGANIZATION`.
- Every Organization create, move/re-parent, delete, restore, structural import/initialization, and lifecycle command that affects parent eligibility must acquire the `ORGANIZATION` row from `masterdata_hierarchy_guard` with `PESSIMISTIC_WRITE`.
- Acquire the Guard before reading the Organization tree, checking the destination parent, checking children/dependencies, validating a cycle, or changing `parent_organization_id`.
- Guard acquisition, validation, Organization mutation, and Business Revision persistence must execute in the same transaction.
- Purely descriptive changes do not require the Guard unless they also affect a structural invariant.
- Do not lock the complete `organization` table and do not lock every Organization row as the hierarchy mutex.
- Do not use JVM or cache locks as the source of correctness.

## Organization rules
- Organization maps only the approved V2 `organization` table fields.
- General Information contains `code`, `name`, `organizationType`, `parentOrganizationId`, `status`, `location`, `validFrom`, `validTo`, and `description`; `displayLabel` is derived from `name`.
- `OrganizationType` is the closed uppercase V2 vocabulary; these detailed attributes are not a Legacy compatibility layer.
- Create is server-owned `ACTIVE`. General Information Update atomically applies editable details plus a requested `ACTIVE` or `INACTIVE` status through one targeted row lock, one transaction, one Business Revision, and one Revision Content. Update never accepts `DELETED`, `code`, or `parentOrganizationId`.
- Move, Delete, Restore, and Create (including create-based reactivate/restore) remain structural and acquire `ORGANIZATION`; ordinary General Information Update does not.
- Keep explicit create, update, move, activate, inactivate, delete, and restore commands under `/api/master-data/organizations`.
- Delete operations must protect child organizations and approved V2 dependents without cascading.
