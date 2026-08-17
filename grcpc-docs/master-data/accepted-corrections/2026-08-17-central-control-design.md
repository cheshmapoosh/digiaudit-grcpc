# Accepted Project-Owner Correction — Central Control Design

Date: 2026-08-17

This correction is authoritative for the Central Control slice and supersedes conflicting older customer mock-up details and older catalog wording where noted.

## Control Group

- Add `central_control_group` as a recursive categorization hierarchy, following the same category-only role as Policy Group.
- A Control Group may have another Control Group as parent.
- `central_control.control_group_id` is the only direct Master Data relation to Control Group in this slice.
- No Risk, Regulation, Requirement, Account Group, Subprocess, Scope, Coverage, or other Master Data entity relates directly to Control Group.
- Existing delivered rows must remain upgradeable, so the new Control Group FK is nullable at schema introduction.
- Control Group object modals use the same summary/header pattern as Policy Group object modals.

## Central Control attributes

Keep the existing Control identity/lifecycle fields and add these compatible detailed-design attributes:

- `control_risk`: `LOW | MEDIUM | HIGH`.
- `nature`: `ADJUSTMENT | AUTHORIZATION | INITIATION | MATCH | PROCESSING | RECONCILIATION | RECORDING | RESTRICTED_ACCESS | REVIEW | SAFEGUARDING_OF_ASSETS | SEGREGATION_OF_DUTIES`.
- `control_relevance`: multi-valued controlled vocabulary: `CONTROL_ACTIVITIES | CONTROL_ENVIRONMENT | INFORMATION_AND_COMMUNICATION | MONITORING | FRAUD_PREVENTION_AND_DETECTION | RISK_ASSESSMENT`.
- `trigger_type`: `EVENT | DATE`; Persian UI label: `محرک اجرا`.
- `event_description`: nullable text; Persian UI label: `شرح رخداد`; enabled and persisted only when `trigger_type = EVENT`.
- `operation_frequency`: `ANNUAL | BI_WEEKLY | CONTINUAL | DAILY | MONTHLY | QUARTERLY | SEMI_MONTHLY | WEEKLY`; Persian UI label: `تناوب اجرا`; valid only with `DATE` trigger.
- `to_be_tested`: nullable Boolean.
- `test_automation_type`: `AUTOMATED | MANUAL | SEMI_AUTOMATED`.
- `testing_technique`: `ATTRIBUTE_SAMPLING | DOCUMENT_INSPECTION_WITH_INQUIRY | CONTROL_OBSERVATION_WITH_INQUIRY | CONTROL_REPERFORMANCE_WITH_INQUIRY`; Persian UI label: `روش آزمون`.
- `evidence_level`: `NO_TESTING | SELF_ASSESSMENT | CONTROL_DESIGN_AND_EFFECTIVENESS | NOT_APPLICABLE`.

Do not add a Test Plan relation in this slice. Show the field disabled in UI only.

Do not add test Input/Output fields in this slice.

## Dates

Do not use a generic `تاریخ اعتبار` field. The Control UI exposes:

- `تاریخ ایجاد` from system-owned `createdAt`, read-only;
- `تاریخ اعتبار از` (`validFrom`);
- `تاریخ اعتبار تا` (`validTo`).

`تاریخ اعتبار از` and `تاریخ اعتبار تا` are rendered in one form row on desktop layouts.

## Control tabs and relations

Control is not owned by one Subprocess. A future Control–Subprocess association is many-to-many/typed, but that relationship is not implemented in this slice.

Control tabs are ordered as:

1. `اطلاعات کلی` — enabled.
2. `زیرفرآیندها` — disabled.
3. `قوانین` — disabled.
4. `الزام‌ها` — disabled.
5. `ریسک‌ها` — disabled.
6. `گروه حساب‌ها` — disabled.
7. `مستندات` — enabled.

Do not add `برنامه عملکرد`.

No cross-entity Control relationships are implemented in this slice beyond Control → Control Group categorization.

## UI component rules

- Render `حوزه‌های کنترلی` with UI5 `MultiComboBox` and let the field span the full form row so selected tokens have the maximum available display width.
- Do not expose untranslated internal UI5 strings such as `Select All` or token overflow text such as `3 Items`. Persian-facing internal MultiComboBox text is supplied through the application UI5 i18n bridge and application resource bundles.
- Keep Control documents on the existing parent-save/temp-finalize document flow. Use UI5 `FileUploader` for file selection and UI5 `UploadCollection` / `UploadCollectionItem` for pending-upload progress instead of a standalone ProgressIndicator.
- UploadCollection built-in retry/terminate/delete actions remain hidden when they would bypass the existing DocumentManager temp/finalize lifecycle. Internal UploadCollection status text is translated through the same application UI5 i18n bridge and inherits application RTL direction.
- Parent/group selection uses Value Help behavior rather than a separate Move button.
- Control Group and Control are presented in one mixed categorization tree, analogous to Policy Group/Policy.
- Closing a Control/Control Group modal must unmount its draft form so a stale dirty state cannot trigger a false unsaved-changes warning on the next create action.

## Flyway compatibility

A customer test version already exists. Do not modify or renumber previously delivered Flyway migrations. Schema changes from this correction must be introduced only by later migrations. The implementation begins with `V1171__enhance_central_control_catalog.sql` after the existing `V1170` migration. `event_description` is introduced separately by `V1172__add_central_control_event_description.sql`.
