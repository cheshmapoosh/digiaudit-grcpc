# Organization owner Assignments — 2026-10-28

The project owner approved many-to-many Organization ownership as a typed
Assignment, a separate Owners tab immediately before Documents, and a new
Organization Data Manager role. This supersedes only the scalar owner and
ordinary-user-only eligibility in the 2026-10-27 dataset correction. It also
renames the administration menu to **مدیریت داده‌های اولیه** (Initial Data
Management); its routes and child-page access rules are unchanged.

## Identity, eligibility and management

- `organization_owner_assignment` is a dedicated business table, not Local Scope,
  Coverage or a generic target relationship. Each row has immutable profile,
  Organization and User IDs, ACTIVE/DELETED lifecycle, optimistic version and
  actor/time audit fields. The occupied `(profile_id, organization_id, user_id)`
  pair stays unique after deletion and is restored when added again.
- A composite profile/Organization FK prevents cross-dataset links. The User FK
  is global because actual root and shared profile-admin accounts have no ordinary
  profile membership. Every repository collection is explicitly profile-filtered.
- New owners must be enabled, unlocked and currently eligible: actual root;
  a profile admin with live access to the selected profile and enabled PROFILE_ADMIN
  role; or an ordinary member of that profile with a valid, active, profile-local
  GLOBAL/null grant of MASTER_DATA_ADMIN or ORGANIZATION_MASTER_DATA_MANAGER.
  A ROOT_ADMIN grant alone does not make an ordinary account actual root.
- Only actual root and the selected profile's authorized admin may add/remove
  owners. Ownership does not grant roles, permissions or access to another profile.
  Role/status/access revocation makes an existing assignment visibly ineligible
  and excludes it from effective ownership; it does not silently delete history.
- Effective ownership preserves the existing current-tree descendant expansion.
  No audit/risk workflow or authorization rule is invented from this relationship.
- Active assignments block Organization deletion and ordinary user membership
  changes. Remove them explicitly first; deleted links remain for history.

## Aggregate API, UI and Revision

- General Information no longer exposes `ownerUserId`. Create/Update accept
  optional `ownerAssignments` changes: CREATE_OR_RESTORE with userId only, or
  DELETE with userId, assignmentId and expected assignment version. Null/empty
  means no changes. Duplicate users, ineligible additions and stale deletes fail
  the whole command. The response includes canonical `ownerAssignments` views.
- The native UI5 Owners table and searchable multi-selection dialog stage changes
  until Organization Save. Existing and pending rows show identity, qualifying
  role and status, with undo. Pending selection and changes participate in dirty
  navigation protection and Save readiness. View is read-only.
- One Organization aggregate Save includes details/parent, owner changes and
  Document drafts. It produces one CENTRAL Business Revision with Organization
  content first and typed ORGANIZATION_OWNER_ASG content for each changed link,
  ordered by user ID. Historical snapshots are not rewritten.

## Role and permission boundary

`ORGANIZATION_MASTER_DATA_MANAGER` has Persian title **مدیر اطلاعات سازمان**.
It grants only MD_ORGANIZATION_VIEW and MD_ORGANIZATION_MANAGE, including the
Organization's Documents. It does not grant the other Reference catalogs or
owner-assignment administration. Existing MD_REFERENCE_VIEW/MANAGE authority
continues to authorize Organizations for compatibility. The server resolves live
grants; UI navigation uses the same area mapping. No existing user receives the
new role automatically; administrators assign it explicitly in User Management.

## Migration and transaction boundary

- V1197 creates the table, backfills existing owners without granting roles,
  preserves deleted Organization owners as deleted links, removes the old scalar
  FK/index/column and adds the stored Revision code. V1198 seeds the new role,
  its two permissions and Persian/English translations. Apply both with the
  matching backend/frontend release; the old scalar API is replaced together.
- The Master Data count becomes 55 active business + one retained historical +
  two technical = 58 physical tables. The two administrative Basic Data type
  dictionaries and dataset/User Management tables are outside that count.
- The hierarchy key remains ORGANIZATION. Aggregate Create/Update acquire its
  PESSIMISTIC_WRITE Guard before hierarchy reads, including owner-only updates.
  Owner validation and writes, Organization version, Documents and Revision all
  remain inside TransactionalMasterDataRevisionCoordinator's database transaction.
  The existing dataset ADMINISTRATION coordination row is acquired first and
  serializes user/role/profile-access changes against business writes. The
  repository rejects unprotected mutations. No new Guard key or retry is added.

Verification is limited by the delivery contract to backend compile with
`-Dskip.ui=true -Dmaven.test.skip=true`, UI typecheck, lint and static inspection.
No tests, application, browser, Flyway/database connection or real concurrent
transaction verification is authorized. Compile/static inspection do not prove
Oracle migration execution or runtime concurrency.
