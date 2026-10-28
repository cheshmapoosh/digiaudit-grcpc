# AGENTS.md - backend organization module

## Scope
Applies to the backend `organization` module.

## Master Data V2 structural rules
- `organization`, `central_process`, and `central_subprocess` are separate persistence structures.
- Combined Process/Subprocess representation is read-only presentation only.
- Legacy `process_node` must not return.
- Structural mutations use Backend-owned Business Revision.
- Document mutations do not create Document Revision Content; when supplied by a parent aggregate Save, they join that parent command's Spring transaction.
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
- `organizationTypeId` references the selected profile's controlled Organization Type from Basic Data Management. `OrganizationType` remains a coarse compatibility code (seeded types retain their code; custom types use OTHER); forms and labels use the controlled ID/name. Validate the reference inside the guarded aggregate transaction and include it in the Business Revision snapshot.
- Create is server-owned `ACTIVE`. Aggregate Update atomically applies editable details, `parentOrganizationId`, a requested `ACTIVE` or `INACTIVE` status, staged owner Assignments and Document mutations through one hierarchy Guard, one transaction and one Business Revision. Organization content is first, followed by typed owner-assignment contents. Update never accepts `DELETED` or `code`.
- Create and Update are structural and acquire `ORGANIZATION`; Update validates parent existence and eligibility, rejects self/descendant parenting, and performs one Organization mutation. Move endpoints remain Backend-compatible but are not used by the Prompt 5.10 browser flow.
- Temporary uploads are preflighted before the Organization Oracle mutation. Any parent, document, authorization, optimistic-lock, storage, or finalization failure rolls the aggregate transaction back.
- The latest `2026-10-28-organization-subprocess-selection.md` correction adds optional typed `subprocesses` drafts to Create/Update. If nonempty, acquire ORGANIZATION then PROCESS before the first hierarchy read and retain Local REFERENCE-manage/PROCESS-view checks. OrganizationService is the outer transaction: its CENTRAL Revision and the linked LOCAL Context Revision remain distinct and commit/roll back together with Owners/Documents. Null/empty drafts retain the existing ORGANIZATION-only path. No extra browser mutation request or independent commit is permitted.
- Keep explicit create, update, move, activate, inactivate, delete, and restore commands under `/api/master-data/organizations`.
- Delete operations must protect child organizations and approved V2 dependents without cascading.

## Owner Assignments

- Follow `grcpc-docs/master-data/accepted-corrections/2026-10-28-organization-owner-assignments.md`; `owner_user_id` is replaced by typed `organization_owner_assignment` rows. Null/empty changes are no-ops; occupied pairs restore their existing row.
- Add/remove requires live root/profile-admin management authority; eligible owners include actual root, authorized admins and profile-local MASTER_DATA_ADMIN/ORGANIZATION_MASTER_DATA_MANAGER users. Validate under the protected aggregate transaction before any assignment write. Keep explicit profile predicates and the composite Organization FK; the global User FK supports shared administrators.
- Organization Create/Update (including owner-only edits) retain the ORGANIZATION Guard. Owner changes, source version, Documents and CENTRAL Revision share the same coordinator transaction. Active links block Organization deletion. Role revocation does not silently delete links or grant replacement authority.
- Organization business endpoints use the narrow ORGANIZATION authorization area; existing Reference grants remain compatible. The new role must not gain other Reference catalogs or assignment administration.

## Governance modal aggregate extension

- The accepted `grcpc-docs/master-data/accepted-corrections/2026-10-28-governance-modal-relations.md` supersedes the earlier L1-only union and two-state Owners clauses. Create/Update acquire the complete lexical union before hierarchy reads. All L1–L9/B1 typed prepares/applies join one linked LOCAL Revision; O1 prepare/apply joins the owner-first CENTRAL Revision. Endpoint prelocks precede pair-row locks, and every source/Document/revision shares the protected outer transaction.
- Owners have ACTIVE/INACTIVE/DELETED lifecycle. Eligibility is independent; effective ownership requires ACTIVE plus live eligibility. Every non-DELETED owner reference blocks Organization deletion. Only root/profile admins manage it. Deleted lookup is Organization-view protected and profile scoped.
