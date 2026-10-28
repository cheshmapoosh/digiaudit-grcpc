# Regulation Requirement Excel import

The saved Regulation modal owns a Requirements tab. Governance managers can download the
Persian template, select a workbook, validate all rows, inspect a paged preview, and explicitly
save the entire import for the Regulation shown in the modal. Regulation Create must finish
first. Import is disabled while editing the Regulation itself. Other catalog node types do
not expose this tab.

## Workbook contract

The downloadable source asset is
`grcpc-app/src/main/resources/templates/regulation-requirements-template.xlsx`.
It contains a blank `الزامات` sheet and a separate `راهنما` sheet with employee instructions
and examples. Examples are never imported. Native Excel sheet views use RTL, the header is
frozen, and date/code input cells preserve text. Display order has native whole-number
validation. The server remains authoritative for every field.

Keep these six headers in row 1, in this order:

| Header | Meaning | Validation / default |
| --- | --- | --- |
| عنوان الزام | Title | Required; existing catalog normalization and 255-character limit |
| شرح الزام | Description | Optional; trimmed; Excel's 32,767-character cell limit |
| کد الزام | Business code | Optional; existing uppercase normalization and 64 UTF-8 byte limit |
| ترتیب نمایش | Display order | Optional; integer 0–2147483647; blank uses Excel row order |
| اعتبار از | Valid from | Optional Persian text `1405/08/06` or Gregorian text `2026-10-28` |
| اعتبار تا | Valid to | Same date formats; must not precede valid from |

The file contains no database IDs, parent selection, lifecycle field, or Document inputs.
The endpoint path supplies the only authoritative Regulation. Persian and Arabic digits
are accepted in dates and ordering. Date cells intentionally contain text rather than
ambiguous Excel date serials. Gregorian `LocalDate` values remain the API/database format.
Persian conversion uses the same break-year algorithm as the existing UI5 calendar,
with strict month/day/leap-year validation; attribution and Apache license accompany the source.

Blank codes become stable `REQ-` codes derived from the target Regulation and normalized
title, description and validity. Reformatting/re-saving a workbook or moving an unchanged
row into another file does not generate another business key. Repeated normalized codes
within a workbook are errors. An existing ACTIVE code is an error. An existing INACTIVE
or DELETED code belonging to the same Regulation is previewed as ACTIVATE or RESTORE and
uses the existing row identity, matching catalog Create semantics. A code belonging to
another Regulation is rejected regardless of lifecycle.

Limits: `.xlsx` only, 2 MiB compressed, 16 MiB total expanded contents, 128 ZIP entries,
500 non-empty data rows, and no populated row beyond row 10001. Blank rows are skipped.
Headers, unexpected sheets/columns, merged input cells, formula/error/boolean cells,
unsupported workbook relationships and file structure are validated. Formula cached
values are never accepted as data. XML DTDs, external entities and resource access are
disabled. No third-party parser dependency, external storage or import staging table is added.

## Typed endpoints and state

All routes are under
`/api/master-data/central/regulations/{regulationId}/requirements/import`
and require `canManage('GOVERNANCE')`, retaining normal profile-scoped request protection.

| Method / suffix | Purpose |
| --- | --- |
| GET `/template` | Download the packaged XLSX template |
| POST `/preview` | Multipart `file`; return normalized rows only if all validation succeeds, otherwise row/column error codes |
| POST (base path) | Multipart `file` plus preview `fingerprint`; reparse, revalidate and atomically apply the import |

Preview is read-only and creates no Revision, import state, temporary upload or Document.
The fingerprint binds the exact workbook bytes, target version, and matched requirement
identities/versions/statuses. Commit never trusts browser-provided rows, operations, dates
or parent IDs. Changed preconditions return `REQUIREMENT_IMPORT_PREVIEW_STALE` (409), or
fresh row errors return `REQUIREMENT_IMPORT_INVALID` (422). The latter retains the error
envelope's code/message/details and adds the new invalid preview. A failed save clears Save
readiness until a new successful validation. There is no automatic mutation retry.

## Hierarchy and transaction boundary

The affected structure is Regulation Group / Regulation / Requirement: `REGULATION`.
Because occupied inactive/deleted keys can reactivate/restore Requirements, commit acquires
the full lifecycle Guard union `CONTROL`, then `REGULATION`, through
`TransactionalMasterDataRevisionCoordinator.executeStructural`.

`RegulationRequirementImportService.commit` is the single structural entry point; the REST
controller delegates to it. Parsing and value normalization perform no hierarchy reads.
Inside the coordinator's one Spring database transaction, both Guards are acquired with
the existing `PESSIMISTIC_WRITE` adapter before target/reference reads. The service checks
the Guard context, locks the target Regulation, then locks only matched Requirement rows
in ascending database ID. All row validation and preview-fingerprint checks finish before
the first source mutation. Saved rows are flushed once, then one CENTRAL Revision contains
one CREATE / ACTIVATE / RESTORE content per imported row in workbook order. Guards, validation,
all source writes and Revision persistence share the coordinator's transaction and connection.
Any conflict or error rolls back the entire import. Existing Guard timeout/missing-row behavior
is retained, with no runtime Guard creation or retry.

The response contains the primary requirement's `entityId`, `revisionId`, `version`, target
`regulationId` and `importedCount`. UI refresh is separate from mutation success. A failed
refresh offers a read retry and never re-enables Save for an already committed import.
Selected-file and in-flight state participate in the existing navigation/unload guard.
File selection or failed validation invalidates the previous preview. No migration or
configuration change is required.

## Verification boundary

Only backend compile (`-Dskip.ui=true -Dmaven.test.skip=true`), UI typecheck and lint are
authorized for application verification. No tests are created, modified or executed.
No application, browser, Flyway, database or external service is run. Guard ordering,
read-before-lock avoidance, targeted row ordering and transaction rollback scope are
reviewed in source. Compilation is not evidence of runtime concurrency correctness;
real Oracle concurrent-transaction verification remains unperformed under the repository restriction.
The XLSX was inspected, both sheets rendered locally, and native RTL/pane settings inspected
in the saved file. Native Excel and browser interaction were not exercised.
