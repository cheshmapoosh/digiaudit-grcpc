# Master Data area authorization

## Delivered model

Areas are a closed authorization/navigation grouping, not persisted business data.
Security Scope remains separate from Central/Local, business Scope and Coverage.

| Area | Existing backend features | UI routes |
| --- | --- | --- |
| PROCESS | `masterdata.process`: Central Process and Subprocess | `/processes` |
| RISK | `masterdata.catalog.risk`: Risk Category and Risk Template | `/risks` |
| CONTROL | `masterdata.catalog.control`, `controlobjective`: Control Group, Control, Control Objective | `/controls`, `/control-objectives` |
| GOVERNANCE | `masterdata.catalog.regulation`, `policy`: groups, definitions, requirements and policy versions | `/regulations`, `/policies` |
| REFERENCE | `organization`, `masterdata.catalog.accountgroup` | `/organizations`, `/account-groups` |

Organization is reference data here; placing its maintenance under REFERENCE does
not make the Organization business hierarchy a security scope.

Each Area has `MD_<AREA>_VIEW` and `MD_<AREA>_MANAGE` BusinessPermissions.
MANAGE includes VIEW. No system Permission is granted by this delivery.

| Seeded role | Granted BusinessPermissions |
| --- | --- |
| MASTER_DATA_ADMIN | VIEW and MANAGE for all five Areas |
| PROCESS_MASTER_DATA_MANAGER | MD_PROCESS_VIEW, MD_PROCESS_MANAGE |
| RISK_MASTER_DATA_MANAGER | MD_RISK_VIEW, MD_RISK_MANAGE |
| CONTROL_MASTER_DATA_MANAGER | MD_CONTROL_VIEW, MD_CONTROL_MANAGE |
| MASTER_DATA_VIEWER | VIEW for all five Areas |

No new role receives User Management, Role Management, ACL management or root
authority. Root bypass uses the authenticated user's existing `rootUser` flag.

## Enforcement and related resources

`MasterDataAuthorizationService` reads current BusinessPermission assignments from
the database. An assignment qualifies only when it is active, its role is enabled,
its validity includes the current database timestamp, its scope is GLOBAL, and its
organization identifier is null. A disabled or locked non-root user is denied.
Expired/deactivated assignments and changed role grants therefore affect backend
Master Data checks even in an existing session.

The shared authority queries also exclude non-GLOBAL assignments, including role
IDs used by existing resource ACL evaluation. The assignment entity and its scope
fields/enums remain intact; no organization-scoped assignment is flattened into a
global authority. The assignment API deliberately accepts only GLOBAL/null in this
phase. `/api/auth/me` refreshes Master Data permissions from current assignments;
the UI loads them at login/page reload. An already open page can retain old button
visibility until reload; backend enforcement remains authoritative.

Controllers use the Area service for all current Master Data endpoints. Typed
Subprocess Scope reads/options/reverse queries require PROCESS VIEW and the
referenced Area VIEW. Scope drafts in Subprocess Save require PROCESS MANAGE and
the referenced Area VIEW. Control/Control Objective Account Group classifications
require CONTROL VIEW plus REFERENCE VIEW for reads, and CONTROL MANAGE plus
REFERENCE VIEW for drafts. The derived Subprocess Account Group projection also
requires PROCESS VIEW. Parent Save responses filter unauthorized related rows.
An Area manager can maintain its own definitions without being granted unrelated
catalog access; cross-Area relationship tabs require additional explicit roles.

Documents use the resolved typed target's Area for viewing/downloading/managing.
The existing per-version accessible-link filtering remains in place. Linking an
existing version additionally requires access to the source version, and adding a
version requires an existing active link to the submitted target. Temporary upload
requires MANAGE in at least one Area and retains uploader ownership validation;
it remains target-independent. No global Document permission is seeded for the new
roles, and existing resource ACL grants do not substitute for Area permission.

The UI filters the launcher, guards direct URLs, hides management actions from
viewers, and reuses typed relationship permission hooks. User creation and GLOBAL
role assignment are Root-only dialogs in the existing user list/detail flow.
All new labels have Persian and English translations and use UI5 controls.

## Migration and operational impact

`V1180__seed_master_data_area_authorization.sql` adds ten BusinessPermissions, five
roles, Persian/English translations and their role grants using the existing seed
pattern. It creates no table and changes no earlier migration. Existing users are
not automatically assigned new roles. Existing fine-grained Master Data permission
rows remain historical data; V2 enforcement requires the new Area permissions.
Root can assign the appropriate seeded roles after the migration has run.

Backend and UI should be delivered together. GLOBAL/null auditing now handles
null safely; reversed validity intervals and disabled-role assignments are rejected.
Root cannot be disabled, locked or given an organization default by user update.
No revoke endpoint was needed for this demo. Future revocation should deactivate an
assignment instead of deleting it.

## Hierarchy and transaction preservation

This change adds authorization and response filtering; it does not change hierarchy
reads, parent eligibility, cycle checks, lock acquisition, transaction propagation,
revision allocation, mutation ordering or persistence.

| Existing boundary | Entry points protected by the existing transaction/Guard |
| --- | --- |
| ORGANIZATION | Organization Create, aggregate Update, Move, Delete, Restore |
| PROCESS | Process/Subprocess Create, aggregate Update, Move, Delete, Restore; Subprocess Scope aggregate mutations |
| CONTROL | Control Group structural commands and Control Save/lifecycle; classification Save retains ACCOUNT_GROUP then CONTROL |
| RISK | Risk Category/Template structural and lifecycle commands |
| ACCOUNT_GROUP | Account Group structural/lifecycle commands and Control Objective classification Save |
| REGULATION | Regulation Group, Regulation and Requirement structural/lifecycle commands |
| POLICY | Policy Group/Policy structural/lifecycle commands and existing Policy Version allocation/publication locking |

The existing revision coordinator retains Guard acquisition, hierarchy validation,
source mutation and Business Revision persistence in the same transaction. Document
aggregate work still joins the parent transaction without creating Revision Content.
Authorization failures during draft preparation roll back that parent transaction.
Non-structural command lock rules are unchanged.

## Verification

Completed on this branch:

- Backend compile and package with `mvnw.cmd -Dskip.ui=true -Dmaven.test.skip=true package`.
- `npm run typecheck` and `npm run lint`.
- `npm run build -- --outDir ../.codex-build/master-data-auth-ui`; checked source
  `grcpc-ui/dist` was not changed. Vite reported its large-chunk advisory.
- `git diff --check` and static review of endpoint, document and aggregate authorization.
- Fresh Oracle schema: all 41 Flyway migrations applied through V1180; Hibernate
  schema validation and repository initialization succeeded. A read-only inspection
  confirmed role BusinessPermission counts of 10/2/2/2/5 and zero system grants.
- Complete Spring Boot/Tomcat startup succeeded with Java 21 in a temporary container
  using the existing development Oracle Free server (reported Oracle 23.26).
  The default Docker context worked; the configured desktop-linux context did not.
  Native Windows Java reached Hibernate validation but failed to initialize a
  Tomcat loopback socket; the container run completed successfully. MinIO was disabled
  for this database/startup verification. The temporary container and schema were
  removed afterwards, leaving the application's existing schema untouched.

No automated test was created, modified or executed, as required by the repository
instructions. The browser demo, file-storage flow and real concurrent transactions
have not been exercised. Oracle 19c itself was not available for verification.
The backend package uses the pre-existing static UI because UI packaging
was explicitly skipped; it is a compile/package check, not a combined deployment.

Manual acceptance when the runtime is available: Root creates a user, assigns
RISK_MASTER_DATA_MANAGER with GLOBAL/null, and logs in as that user. Only Risk should
be offered in the launcher; Risk definitions/documents should be manageable; direct
Process/Control/Governance/Reference and IAM access should be forbidden. Repeat with
MASTER_DATA_VIEWER (reads only) and MASTER_DATA_ADMIN (all Master Data, no IAM).
Check reversed dates, future/expired assignments, root disable/lock attempts,
cross-Area document identifiers and injected unauthorized relationship drafts.

## Intentionally deferred

No DelegationPolicy change, organizational security enforcement, IAM framework,
Area table, Central/Local redesign, business Scope/Coverage redesign, new hierarchy
key, workflow or compatibility API is included. No commit is created.

ORG_UNIT/ORG_SUBTREE must later resolve the exact resource/organization context,
authorize create destinations and move source/destination, and filter list/tree,
document and relationship read models. Extend the authorization boundary and typed
queries for that work; simply removing the GLOBAL predicate would be unsafe. The
existing assignment model already preserves the needed scope fields, but this
delivery intentionally supplies no organization resolver or subtree evaluator.
