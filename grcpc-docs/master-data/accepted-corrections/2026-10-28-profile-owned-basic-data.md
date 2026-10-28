# Profile-owned Basic Data — 2026-10-28

The project owner requested Organization Types and Document Types, each with a
name and description, owned by an explicit profile and manageable by root or an
admin assigned to that profile. The administration pages follow Profile's native
UI5 Table, separate details and form Dialog pattern. Initial Data Management groups
Profile (root only), Document Types and Organization Types (root/profile admin).
The selected profile is visible in lists, details and editors; profile identity
cannot be reassigned by an editor payload.

## Ownership and access

- Two separate tables, `basic_organization_type` and `basic_document_type`, use
  UUID identities, immutable profile ownership, name, description, lifecycle,
  version and audit fields. Names are unique, ignoring case, within each profile
  and type family while non-deleted. Different profiles can use the same names.
- `/api/basic-data/organization-types` and `/api/basic-data/document-types` expose
  management List/Create/Update and activate/inactivate/delete. Management requires
  root or live profile-admin access. Their `/options` reads serve authenticated,
  authorized selected-profile users for business forms.
- `X-Profile-Id`, server ProfileContext and explicit repository predicates select
  the dataset. Payloads do not choose ownership. Cross-profile reads/edits and
  type references are rejected. Composite `(profile_id, type_id)` foreign keys
  also enforce reference ownership in Oracle.
- Inactive profiles are read-only. Inactive types remain visible to managers;
  new references require ACTIVE. Existing unchanged inactive references remain
  valid. Delete is blocked by any reference, including a soft-deleted record,
  so history and existing labels are retained. Lifecycle changes are audited.

## Form contracts and migration

- Organization commands add `organizationTypeId`; responses/tree and Business
  Revision snapshots include the controlled identity and name. The previous enum
  is a coarse compatibility field: the old seeded vocabulary keeps its codes,
  and arbitrary new types use OTHER. Forms use UUID choices and names.
- Documents add nullable `documentTypeId` plus response `documentTypeName`.
  New attachments require an active type in both standalone and parent-save
  flows. Type changes are metadata drafts and share the existing Save, dirty,
  navigation protection and readiness flow. Versions retain their document's
  type; file identities and version immutability are unchanged. Temporary upload
  remains immediate, file-only and target-independent.
- `V1196__profile_owned_basic_data_types.sql` creates both dictionaries and scoped
  foreign keys. It seeds all eleven existing Organization enum choices for each
  existing profile and backfills the matching Organization type IDs before making
  that FK non-null. Existing Documents remain unclassified and readable; there
  is no fabricated Document Type. Admins define types before adding new files.
  Newly created profiles start with their own empty dictionaries.
- Apply the new migration with the bundled backend/frontend deployment. No applied
  migration or generated UI assets are rewritten by this delivery.

### Applied V1196 checksum recovery (2026-10-28)

The reported startup failure was Flyway validation of V1196: the database stored
checksum `2060087078`, while a later local refinement resolved to `-921862317`.
The original migration text was recovered from this delivery's local edit history
and restored to the exact applied checksum. It has VARCHAR2(2000 CHAR)
descriptions and the original profile/lower(name) indexes. This is a restoration
of the applied file, not a new schema change inside V1196. Line endings are not
the cause; Flyway's checksum ignores them.

V1200 moves the two refinements into a separate forward migration: description
columns become CLOB through add/copy/drop/rename, preserving existing values;
name indexes ignore soft-deleted records while retaining profile and
case-insensitive uniqueness for live rows. Fresh databases execute the same
V1196 followed by V1200. Deploy both with this release. Do not run repair or
disable validation to conceal the mismatch. No schema-history row, database
connection, application or Flyway execution was used to prepare this fix.

Verification includes the Flyway-compatible local checksum of source and copied
build resource, backend compile with `-Dskip.ui=true -Dmaven.test.skip=true` and
static SQL/diff review. Actual Oracle execution remains unperformed under the
delivery restrictions. No hierarchy key, Guard entry point, API or UI changes.

## Persian names for untouched defaults (V1201)

V1196 inserted the eleven default Organization Type names as uppercase enum
codes. The Organization combo, details and Basic Data management correctly use
the stored name, so these seed values appeared as English codes instead of the
existing Persian titles. V1201 translates only untouched V1196 defaults to the
Persian vocabulary in `fa.organization.json` (for example COMPANY → شرکت and
DEPARTMENT → اداره). It requires the original name/code, ACTIVE status, version
zero and null creator/update metadata. The correction increments the dictionary
version and timestamps the migration change; it does not invent a user actor.

Admin-created/edited names, IDs, profiles, references and legacy codes are
preserved. If another live type in that same profile already uses a translated
name, that default is skipped to preserve the existing unique name and both
records. An administrator can resolve that profile's naming conflict normally.
New profiles retain empty dictionaries. Names remain administrator-controlled
business data; the UI does not translate custom names or replace them with enum
labels. V1196 and V1200 remain unchanged, avoiding applied-checksum mismatches.

Deploy the new forward migration with the backend. The visible correction takes
effect after V1201 is applied and the options are fetched again. Verification is
limited to backend compile/resource copying and static SQL/mapping inspection;
no database, Flyway, application or browser was run. This is a flat dictionary
name correction with no hierarchy boundary or API contract change.

## Transaction and concurrency evidence

Organization Create/Update remain structural under the `ORGANIZATION` Guard;
type lookup validation, parent validation, mutation, Documents and Business
Revision remain in the same coordinator transaction. The Guard is acquired
before hierarchy reads. No hierarchy key or hierarchical type structure is added.

`ProfileTransactionPolicy` now includes Basic Data writes. Dictionary changes
and all existing Organization/Document writes share the pre-existing
`dataset_profile_guard/ADMINISTRATION` row before business validation, while
retaining the hierarchy Guard order. Permission/profile mutability is checked
inside the protected write transaction; versions detect stale admin edits.
This serializes type deletion/inactivation against creation/reclassification.
The flat dictionaries do not introduce Business Revision types.

Backend `compile -Dskip.ui=true -Dmaven.test.skip=true`, UI `npm run typecheck`,
UI `npm run lint` and `git diff --check` passed. The compile used an already
installed JDK in that command's environment; no machine-wide setting changed.
Static review covered profile predicates, FK definitions,
permission checks, draft serialization and transaction order. No tests were
created/edited/run. No application, browser, database, Flyway or real concurrent
transaction verification was run under the delivery restrictions. Compile and
static inspection do not prove Oracle execution or runtime concurrency.
