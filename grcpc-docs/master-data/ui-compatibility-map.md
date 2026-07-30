# Master Data V2 UI Compatibility Map

## 1. Purpose and evidence boundary

This map compares five inputs for each meaningful user-facing requirement.

The inputs are the customer UI DOCX files, current React UI, current backend/API, approved Master Data V2 model rules, and required target UI.

The customer mock-ups are Persian RTL UI specifications, not conceptual, logical, or physical model authority.

The separately named Conceptual, Final Logical, and Physical Design reference files were not present in the working tree during review.

Their task-issued rules govern the target model in this map.

Current source is evidence for present behavior and deletion work only.

## 2. Status vocabulary

`KEEP` retains a compatible behavior and data flow.

`KEEP_VISUAL_REPLACE_DATA_FLOW` retains useful appearance or interaction while replacing model, API, storage, and state.

`REMAP` preserves business intent through another approved V2 entity or use case.

`ADD` is a required V2 capability that is absent from both current UI and customer mock-ups.

`REMOVE` is a visible feature that must no longer be exposed.

`DEFER_OUT_OF_SCOPE` remains outside Master Data V2 and receives no new Master Data implementation.

## 3. Cross-cutting current UI baseline

The current application has FCL shells, List Reports, Object Pages, UI5 controls, Persian RTL, trees, search, dialogs, expanded-state tracking, and i18n feature packs.

Those mechanics are valuable presentation assets rather than model authority.

`OrganizationTree`, `ProcessTree`, `ProcessControlTree`, `ObjectiveTree`, `RiskTree`, `RegulationTree`, `PolicyTree`, and `AccountGroupTree` demonstrate the visual navigation pattern to retain selectively.

Current API repositories generally use list/get/create/PUT/delete/toggle-status flows without a request `version` or response `revisionId`.

Current Zustand state and service layers mirror those generic repository flows.

No current UI exists for Central Scope, Central Coverage, Local Context, Local Scope, Local Coverage, Central Policy Scope, Local Policy Scope, Effective, Diagnostic, Roll-up, Policy Applicability, immutable Document Version history, or revision-aware mutation results.

No current Master Data UI has a proper explicit restore operation.

No current Master Data UI has conflict-resolution behavior for optimistic locking.

## 4. Organization

Customer source: `سازمان - فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current route: `/organizations` with `OrganizationsFclShellPage.tsx`, `OrganizationsListReport.tsx`, and `OrganizationObjectPage.tsx`.

Current backend root: `/api/organizations` plus organization assignment endpoints backed by legacy `organization`, `organization_process_assignment`, `organization_reference_assignment`, and `organization_process_risk_assignment` storage.

| Customer requirement | Current UI page/component | Current API/storage | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Parent, code, name, type, active status, location, description, and dates | `OrganizationObjectPage.tsx`, `OrganizationTree.tsx`, `ParentValueHelpDialog.tsx` | Generic `/api/organizations`; legacy text UUID organization table | B01 Organization commands/read DTO | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain tree/form/value-help pattern; replace request/response and lifecycle flow | Fields are compatible only after V2 lifecycle/version/revision rules apply |
| Hierarchy list, display/create/delete actions | FCL shell, list report, tree selection and delete confirmation | Generic create/delete/status routes | Organization create, move, delete, restore commands | KEEP_VISUAL_REPLACE_DATA_FLOW | Keep visual actions; add explicit restore and version conflict UX | Current delete is physical/generic, unlike V2 explicit soft delete |
| Subprocess assignment wizard | Organization subprocess assignment dialogs and separate stores | `/api/organization-process-assignments` permits any process node | B31 Local Organization–Subprocess Context | REMAP | Retain stepwise wizard appearance but require Subprocess and matching Central Blueprint | Context is not a generic organization-process assignment |
| Subprocess risk/control selection in wizard | relationship views and selection dialogs | `organization_process_risk_assignment`, generic process/control relations | B32–B42 typed Local Scope/Classification/Coverage | REMAP | Make wizard enter Local Context, then typed scoped selection panes | V2 validates Central origin, local validity, and same context |
| Direct regulation, policy, and generic objective tabs | Organization object-page tabs / reference-assignment views | `/api/organization-reference-assignments`, string reference type/id | Local Requirement Scope/Coverage and Local Policy Scope | REMAP | Replace with context-scoped typed tabs; remove generic Objective target | Generic Organization references are prohibited |
| Documents list and document tab | generic document manager with `ORGANIZATION` target | `document_attachment` target type/id | Document / Document Version / controlled Document Link | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain file list/progress UI; show version history and secure download | Generic attachment target is replaced by controlled link |
| Owner tab | Organization object-page visible tab | legacy direct assignment/presentation | No separate V2 Master Data owner relation | DEFER_OUT_OF_SCOPE | Do not add a generic owner table/API/tab; retain only approved descriptive owner fields | No owner relation appears in the V2 table boundary |
| Performance assessment and risk appetite tabs | customer mock-up; current UI placeholders | no approved V2 storage | None | DEFER_OUT_OF_SCOPE | Remove visibility from Master Data V2 navigation | Assessment and appetite are outside scope |
| KPI and KRI tabs | customer mock-up; placeholder content | no current Master Data entity | None | REMOVE | Remove all visible Master Data KPI/KRI tabs and add no APIs | KPI/KRI are explicitly excluded |

Organization target decisions:

- Keep FCL list/search/tree/selection/expanded-state behavior.
- Keep Persian default labels and RTL layout.
- Treat Organization as a Central definition, not the owner of Central definitions.
- Show Local Context as an explicit child capability, not as a hidden assignment tab.
- Use a Local Context selector before displaying Local Scope or Local Coverage.
- Make context validity visible in the object-page summary.
- Add explicit delete and restore actions that prompt for current version.
- Show returned revision id and version after each mutation.
- Replace every generic organization reference picker with typed Value Help filtered by the selected Local Context.
- Remove KPI, KRI, risk appetite, performance assessment, and generic Objective actions from the V2 Organization UI.

## 5. Process and Subprocess

Customer source: `فرایند و زیرفرایند - فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current route: `/processes` with `ProcessesFclShellPage.tsx`, `ProcessesListReport.tsx`, `ProcessObjectPage.tsx`, `ProcessTree.tsx`, and `ProcessControlTree.tsx`.

Current backend root: `/api/processes`, backed by combined `process_node` with `nodeType` values `process` and `subProcess`.

| Customer requirement | Current UI page/component | Current API/storage | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| One Process → Subprocess → Control tree | `ProcessTree.tsx`, `ProcessControlTree.tsx` | Combined `process_node`, control assignment | Separate B02 Process, B03 Subprocess, plus combined read projection | KEEP_VISUAL_REPLACE_DATA_FLOW | Preserve tree visual and state; replace source with projection endpoint | Backend must physically separate Process and Subprocess |
| Process general fields: code/name/category/owner/operation cycle/description | `ProcessObjectPage.tsx` | generic ProcessNode DTO and table fields | Process Create/Update commands | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain compatible form fields after model validation | Current node type and generic CRUD are legacy |
| Subprocess general fields and documents | same object page/tree | generic ProcessNode and attachment target | Subprocess commands and Document Link | KEEP_VISUAL_REPLACE_DATA_FLOW | Split form by read type; preserve shared page layout | Subprocess is independent physical entity |
| Direct risks tab | `ProcessRisksTab.tsx` | `/api/process-risk-assignments` | Central Risk Template Scope and typed Coverage | REMAP | Replace tab with Central Scope/coverage view under selected Subprocess Scope | Legacy assignment is not typed/locality-safe |
| Direct account-groups tab | `ProcessAccountGroupsTab.tsx` | `/api/process-account-group-assignments` | Central Account Group Scope and Control–Account Group Coverage | REMAP | Replace with typed scope and coverage pickers | Current endpoint is generic assignment |
| Direct objectives tab | `ProcessObjectivesTab.tsx` | `/api/process-objective-assignments` to generic Objective | Central Control Objective Scope and Classification | REMAP | Replace generic Objective list with Control Objective scope/classification | Generic Objective is not retained |
| Direct regulations/laws tab | `ProcessRegulationsTab.tsx` | `/api/process-regulation-assignments` | Requirement Scope and Requirement–Control Coverage | REMAP | Replace law picker with requirement-level typed coverage UI | Direct law/regulation relation is not approved |
| Controls tab | `ProcessControlsTab.tsx` / nested control UI | `control_assignment` | Central/Local Control Scope and typed coverage | REMAP | Preserve list/table visual only after scope context is explicit | Control assignment mixes central/local concerns |

Process/Subprocess target decisions:

- The backend state, domain types, schemas, factories, services, and repositories split Process from Subprocess.
- The UI may display both through one read-model tree with distinct node rendering and valid create actions.
- Child creation menus must expose only relationships approved by the parent entity type.
- A Central Subprocess Scope entry point must be available from a selected Subprocess.
- A Local Context entry point must be available from a selected Organization/Subprocess pairing, not the Process alone.
- Direct assignment tabs are replaced one vertical slice at a time, never maintained as compatibility tabs.
- Control rows show Central/Local scope status rather than legacy `control_assignment` status.
- Documents use Document Link and Document Version, not a generic ProcessNode attachment target.
- Any legacy free-text “objective” field is removed or remapped to typed Control Objective selection where appropriate.
- No Process/Subprocess UI adds KPI, KRI, risk assessment, control results, or workflow.

## 6. Control

Customer source: `کنترل- فرم ایجاد اطلاعات پایه -Master Data.docx`; additional combined-tree evidence in `فرایند و زیرفرایند - فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current route: no standalone Control route; controls are nested at `/processes/control-assignments/:controlAssignmentId`.

Current backend roots: `/api/control-structure`, `/api/controls`, `/api/sub-processes/{id}/controls`, and `/api/control-assignments/**`.

| Customer requirement | Current UI page/component | Current API/storage | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Code/name/group/description/nature/automation/importance | control create dialog and `ControlObjectPage.tsx` | Control plus ControlAssignment mixed DTO | B04 Control definition | KEEP_VISUAL_REPLACE_DATA_FLOW | Keep compatible inputs but move to independent Control command | Current create flow combines definition and assignment |
| Parent Subprocess selection | create control dialog | creates control and legacy assignment together | Central Scope or Local Scope command after Control creation | REMAP | Split into explicit scope step or approved compound business command | Central Control must not depend on Subprocess persistence |
| Operation cycle / time-event / primary-secondary / activity level | control form | legacy Control/Assignment fields | Delegated Control attributes only if cataloged | REMAP | Retain only approved descriptive fields; remove non-cataloged fields | Customer UI cannot add absent model concepts |
| Test direction, method, plan, and testing fields | control general tab | legacy assignment fields | None | DEFER_OUT_OF_SCOPE | Remove from Master Data control form | Control testing/results are excluded |
| Control Objective | free-text `objective` and related control data | legacy Control fields / generic Objective assignment | B05 and B26/B38 typed Control Classification | ADD | Add typed Control Objective Value Help and classification list | V2 requires separate Control Objective rather than free text |
| Control Steps tab | `ControlStepsTab.tsx` | `control_step` CRUD | None | REMOVE | Remove tab, component, DTO/repository/service endpoints | Steps are not a V2 Master Data feature |
| Law tab | `ControlRegulationsTab.tsx` | direct `control_regulation_link` | None | REMOVE | Remove direct regulation picker/tab | Direct Control–Regulation relation is prohibited |
| Requirements tab | `ControlRequirementsTab.tsx` | `control_requirement_link` | B29/B41 Requirement–Control Coverage | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain picker/table UX with scope/context filter | This is closest legacy visual precursor to approved coverage |
| Risks tab | `ControlRisksTab.tsx` | `control_risk_link` | B28/B40 typed Control–Risk Coverage | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain picker/table UX; require typed scoped members | Legacy link lacks same scope/context validation |
| Account Groups tab | `ControlAccountGroupsTab.tsx` | `control_account_group_link` | B30/B42 typed Control–Account Group Coverage | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain picker/table UX; use typed coverage command | Current link is generic assignment-style |
| Documents tab | document manager plus old control document types | generic attachment and `control_document` | Document/Version/Link | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain upload/progress/version-list visual | Current documents are generic/mutable |
| Performance Plan tab | `ControlPerformancePlanTab.tsx` | `control_performance_plan` CRUD | None | REMOVE | Remove tab and corresponding UI state | Performance planning is outside Master Data |

Control target decisions:

- Add a standalone or clearly separated Central Control definition view; it must not be addressed as a legacy assignment id.
- Keep UI5 form/list/dialog patterns and Persian i18n, but move data flows to typed command repositories.
- Make Central Scope and Local Scope context visible whenever a Control is shown in a scoped relationship.
- Limit Requirement Value Help to Requirement Scope members in the chosen Central Scope or Local Context.
- Prevent arbitrary UUID entry; remove the current manual fallback in `ControlLinkTab.tsx`.
- Show no direct Regulation selector anywhere in V2 Control UI.
- Present association read tables as typed classification/coverage, not as generic assignment grids.
- Hide test plans, test results, effectiveness, performance plans, workflow, KPIs, and KRIs.
- Add version/revision feedback and explicit soft-delete/restore behavior.
- Use Document Version history with secure download rather than a mutable file reference.

## 7. Control Objective and generic Objective

Customer sources: `هدف کنترلی- فرم ایجاد اطلاعات پایه- Master Data  .docx` and `اهداف- فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current route: `/objectives` is a generic Objective feature with FCL/tree/Object Page.

Current backend root: `/api/objectives`, backed by combined generic `objective_node` and direct organization assignment.

| Customer requirement | Current UI page/component | Current API/storage | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Generic objective tree/strategy/parent | `ObjectiveTree.tsx`, `ObjectiveObjectPage.tsx` | `objective_node` hierarchy | None as generic Objective | REMOVE | Remove generic Objective feature and route | V2 does not retain conflicting generic Objective |
| Generic objective class, organization unit, documents | objective object page | generic Objective and document target | None as generic Objective | REMOVE | Remove direct organization/unit/document objective flow | It cannot override Control Objective model |
| Control Objective catalog code/name/class/description/dates | customer control-objective mock-up; no current dedicated UI | no dedicated backend aggregate | B05 Control Objective | ADD | Build separate Central definition List Report/Object Page | Approved V2 concept is absent from current UI |
| Control Objective ↔ Subprocess list | customer Control Objective Subprocess tab | legacy process/generic objective assignments | B21/B33 typed Scope | ADD | Add scoped association view with filtered Subprocess Scope selectors | Relationship must be typed and scoped |
| Control Objective ↔ Risk list | customer Control Objective Risk tab | generic control-risk/objective flows | B27/B39 typed Coverage | ADD | Add typed coverage picker/list with locality validation feedback | Customer intent remains only via typed Coverage |
| Control Objective Documents tab | customer mock-up | generic `OBJECTIVE_NODE` attachment flow | Document Link | ADD | Add V2 document version/history tab to Control Objective page | V2 documents are not generic attachment targets |

Control Objective target decisions:

- Generic Objective i18n, route, page, tree, store, repository, service, and API contract are removed with the Central definitions slice.
- The new Control Objective page reuses the FCL/tree visual pattern only if the approved aggregate benefits from hierarchy browsing.
- Any category/type vocabulary is loaded from approved definition rules, not copied wholesale from generic Objective mock-ups.
- Control Objective selection is typed and never represented by a free-text Control field.
- Organization assignment is represented only by Local Context and local typed relations where approved.
- Documents attach through controlled Document Link and immutable Document Version.
- Mutations show entity, revision, and version outcome.
- No Objective UI introduces strategy-management, KPI, or performance-management scope.

## 8. Risk Category and Risk Template

Customer source: `ریسک- فرم ایحاد اطلاعات پایه .docx`.

Current route: `/risks` with FCL/tree/Object Page under `features/risk`.

Current backend root: `/api/risks`, backed by combined `risk_node` with `riskCategory` and `riskTemplate` node types.

| Customer requirement | Current UI page/component | Current API/storage | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Combined category/template tree | `RiskTree.tsx`, split button, list/object pages | one `risk_node` table/nodeType | B06/B07 plus combined read projection | KEEP_VISUAL_REPLACE_DATA_FLOW | Keep familiar tree but read separate entity API | Physical persistence must be separate |
| Category parent/code/name/description/dates/profile/reference permission | risk category form | generic risk node fields | B06 Risk Category | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain approved descriptive fields with version/revision | Combined node generic API is replaced |
| Category risk summary tab | risk page placeholder | no target result model | None | DEFER_OUT_OF_SCOPE | Omit from V2 | Risk assessment/result content is outside scope |
| Category KRI template tab | risk page/customer mock-up | no current KRI entity | None | REMOVE | Remove KRI tab/key/component; add no KRI APIs | KRI is explicitly excluded |
| Template company/operation, risk type, causes/effects | risk template form/schema | combined node and effect converter | B07 Risk Template | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain descriptive summaries only | No score, likelihood, impact, or assessment result may be added |
| Existing risk, response template, control center tabs | risk page placeholders/customer mock-up | no approved V2 storage | None | DEFER_OUT_OF_SCOPE | Remove/omit V2 tabs | These are assessment/response/monitoring adjacent concepts |
| Risk documents | generic document tab | generic attachment target | Document Link | KEEP_VISUAL_REPLACE_DATA_FLOW | Use V2 upload/version/download flow | Document storage must be immutable/controlled |

Risk target decisions:

- Separate client domain types and schemas for Risk Category and Risk Template.
- Let the tree projection retain selection and expansion state across navigation.
- Retain create-menu choices only for valid entity relationships.
- Add scope-aware Risk Template Value Help for Central and Local typed relationships.
- Remove KRI labels, tabs, i18n keys, and no-op placeholder actions.
- Do not add likelihood, impact, risk score, response result, or assessment summary UI.
- Keep cause/effect descriptions strictly descriptive and model-approved.
- Add explicit soft-delete/restore and version conflict handling.
- Send documents through the common temporary-upload/version history components.
- Do not allow direct Organization risk assignment outside Local Context.

## 9. Regulation Group, Regulation, and Regulation Requirement

Customer source: `گروه قوانین - فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current route: `/regulations` with FCL/tree/Object Page and a requirements summary tab.

Current backend root: `/api/regulations`, backed by one self-referential `regulation` table and node type.

| Customer requirement | Current UI page/component | Current API/storage | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Group → Regulation → Requirement tree | `RegulationTree.tsx`, `RegulationsFclShellPage.tsx` | combined `regulation` node | B08/B09/B10 plus combined hierarchy projection | KEEP_VISUAL_REPLACE_DATA_FLOW | Preserve visual tree/read navigation | V2 physical tables are separate |
| Group fields: parent/code/name/description/dates/documents | regulation object page | legacy node fields | Regulation Group commands/Document Link | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain form pattern with typed Group API | Node discriminator is removed |
| Regulation fields: issuer/owner/effective dates | regulation page schema/object page | legacy node fields | B09 Regulation | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain approved fields after Central-definition command split | Central definitions remain Organization-independent |
| Requirement fields and nested creation/list | `RegulationRequirementsSummaryTab.tsx` | legacy child node CRUD | B10 Regulation Requirement | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain requirement browsing/edit UX over separate entity API | Requirement remains leaf entity |
| Direct relationship from Control to law/regulation | Control regulation tabs | `control_regulation_link` | None | REMOVE | Remove all law/regulation Control selectors | Direct Control–Regulation is prohibited |
| Requirement-to-Control selection | Control requirements tab | `control_requirement_link` | B29/B41 typed Requirement–Control Coverage | REMAP | Replace with scope/context-aware coverage UI | Requirement is the approved regulatory endpoint |
| Regulation documents | generic attachment target | `document_attachment` | controlled Document Link | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain document visual tab with V2 version history | Generic target/storage is replaced |

Regulation target decisions:

- Use a combined UI tree as a read projection only.
- Restrict create menus to Group, Regulation, and Requirement parent-child rules.
- Preserve tree expansion, selection, and FCL navigation under new read DTOs.
- Make Requirement Value Help reusable for Central and Local Coverage screens.
- Never expose a generic Regulation relationship form with a caller-selected target type.
- Do not add requirement assessment or compliance-test result views.
- Make direct Control–Regulation removal visible in migration notes and change management.
- Add revision-aware mutation feedback and explicit restore state.
- Replace legacy document cards with immutable version history.
- Retain Persian i18n names only through V2 keys; remove dead legacy node-type labels.

## 10. Policy Group, Policy, and Policy Version

Customer source: `سیاست- فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current route: `/policies` with FCL/tree/Object Page and placeholder scope/review tabs.

Current backend root: `/api/policies`, backed by combined `policy_node` with mutable version string and workflow-like statuses.

| Customer requirement | Current UI page/component | Current API/storage | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Policy Group/Policy combined tree | `PolicyTree.tsx`, FCL shell, split button | `policy_node` node type | B11/B12 and combined read tree | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain hierarchy visual, split models/API | Physical Policy Group and Policy are separate |
| Policy type/name/description/owner/date/communication/review/note | `PolicyObjectPage.tsx` | legacy mutable policy node | B12 Policy and B13 Policy Version | REMAP | Allocate stable identity vs immutable issued-version fields | Current node conflates identity and issue content |
| Mutable version string | policy form | `policyVersion` text field | B13 backend-owned immutable version number | REMOVE | Remove editable version textbox; show issued version history | Version is immutable/backend-owned |
| Draft/review/approval actions | review/approval tab and status UI | statuses `draft`, `underReview`, `pendingApproval`, `approved` | None | REMOVE | Remove actions, status workflow, tabs, keys, and APIs | Policy approval workflow is excluded |
| Policy Document tab | document manager | generic policy-node attachment/temp flow | Document/Document Version/Document Link | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain visual document list; use temporary upload and versions | Generic attachment and mutable metadata are replaced |
| Policy Scope with process/activity/org/people/result targets | placeholder/customer scope tab | no approved V2 storage | B25/B37 Policy Scope | REMAP | Implement Central Policy Scope and Local Policy Scope with typed scope/context | Generic target polymorphism and people/result state are excluded |
| Direct risks and controls tabs | placeholder/customer tabs | legacy generic link intent | typed Scope/Coverage only where cataloged | REMAP | Expose relevant typed reads, not direct generic assignment CRUD | Customer workflow cannot create missing model concepts |
| Sources and roles tabs | customer UI/placeholder | no approved V2 table | None | DEFER_OUT_OF_SCOPE | Omit unless a later approved model revision introduces it | No source/role table exists in exact 47 boundary |
| Review & approval | policy review tab | workflow-shaped UI | None | REMOVE | Delete tab and i18n controls | Explicitly prohibited |

Policy target decisions:

- Separate policy identity creation from immutable Policy Version issue command.
- Show version history as immutable records, including validity and document links.
- Use Central Policy Scope and Local Policy Scope pages/tabs as real V2 additions.
- No UI sends version number, before/after content, or approval state to the backend.
- Policy Applicability is a read-only query with evaluation date, not a workflow approval screen.
- Retain FCL/tree/RTL/selection behavior where it does not imply node persistence.
- Keep compatible communication fields only on the cataloged version entity.
- Remove surveys, approval, roles, generic target selectors, test/effectiveness UI, and no-op placeholders.
- Make secure Document Version download available from issue/version history.
- Use mutation-result feedback and optimistic locking for mutable Policy identity and scope facts.

## 11. Account Group

Customer source: `گروه حساب ها-فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current route: `/account-groups` with tree/FCL/Object Page.

Current backend root: `/api/account-groups`, backed by `account_group` plus CLOB JSON relationship fields.

| Customer requirement | Current UI page/component | Current API/storage | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Hierarchy/code/name/description/materiality/reasonable assurance/dates | Account Group tree/list/object page | `account_group` generic CRUD | B14 Account Group | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain form/tree visual with V2 command/read DTOs | Lifecycle/version/raw UUID flow is replaced |
| Audit assertions existence/completeness/valuation/disclosure | checkboxes on account-group page | booleans/JSON conversion | B15 Account Group Assertion | REMAP | Replace checkboxes with typed normalized relation editor | Avoid JSON/boolean schema lock-in and support revision |
| GL account ranges from/to | account range placeholder/display | `accountRanges` JSON | B16 Account Group Account Range | REMAP | Add typed range list/dialog with validity | V2 needs relational integrity |
| Related generic objectives | model arrays/view placeholders | `objectives` JSON | B17 Account Group–Control Objective | REMAP | Replace with typed Control Objective picker | Generic Objective is removed |
| Related risks | model arrays/view placeholders | `risks` JSON | B18 Account Group–Risk Template | REMAP | Replace with typed Risk Template picker | V2 uses separate Risk Template |
| Account Group documents | generic document count/tab | generic attachment target | Document Link | KEEP_VISUAL_REPLACE_DATA_FLOW | Use common V2 document flow/version history | `documentsCount` is not editable state |

Account Group target decisions:

- Retain the compact tree/list/object-page visual pattern.
- Replace JSON-shaped frontend models, Zod schemas, factories, stores, API repositories, and backend converters.
- Present assertions, account ranges, Control Objectives, and Risk Templates as typed relation tables/dialogs.
- Treat materiality as a descriptive catalog field, not a risk score.
- Derive document count from authorized links rather than editing it.
- Add revision/version mutation feedback for each normalized relation command.
- Use scope-aware Value Help when Account Group is included in Central or Local Scope.
- Do not add generic account-group-to-control assignments outside typed coverage.
- Preserve Persian labels through new i18n keys.
- Remove dead legacy JSON key names after the normalized UI slice lands.

## 12. Document and temporary upload experience

Customer sources: all nine mock-ups include document tabs or document rows; strongest detail is in Organization and Policy documents.

Current UI implementation: `features/document/domain/document.model.ts`, `document.api.repo.ts`, `document-attachment.state.ts`, `DocumentAttachmentsManager.tsx`, and `DocumentAttachmentsTab.tsx`.

Current backend implementation: `/api/documents` direct final upload, `/api/documents/temp`, `/api/documents/commit`, generic `targetType`/`targetId`, `tempSessionId`, `document_attachment`, and legacy `document_temp_upload`.

| Customer requirement | Current UI page/component | Current API/storage | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| File selection, progress, size/error handling | `DocumentAttachmentsManager.tsx` | generic upload API | Temporary Upload initiation | KEEP_VISUAL_REPLACE_DATA_FLOW | Retain controls but receive backend-issued `tempUploadId` | Current client session/direct upload flow is incompatible |
| Direct final attach after choosing file | generic manager | `POST /api/documents` / `document_attachment` | Parent Business Command consumes Temp Upload | REMOVE | Remove direct final upload path | V2 requires temporary upload first |
| Client `tempSessionId` grouping | document repo and FCL call sites | `temp_session_id` table column | T01 `tempUploadId` | REMOVE | Remove client UUID generation and session UI assumptions | Backend owns upload identity |
| Standalone commit button/flow | document repo `commit` | `/api/documents/commit` | Document-owning create/update command | REMOVE | Remove generic commit API/UI | Backend owns transaction and revision order |
| Mutable attachment title/version | title patch and attachment row | mutable `document_attachment` | B43 Document and B44 immutable Document Version | REMAP | Show Document metadata plus immutable version history | File version payload cannot be overwritten |
| Generic target type/id attachment list | state keyed by target | generic attachment table | B45 controlled Document Link | REMAP | Bind document tab to allow-listed V2 aggregate relation | Controlled polymorphism only in Document Link |
| Download URL opened in browser | document repo / component | presigned URL response with storage details | secure authorized download | KEEP_VISUAL_REPLACE_DATA_FLOW | Keep download action, replace API and hide storage details | No permanent MinIO URL exposure |
| Document rows: type/title/version/size/file type/creator | Organization/Policy customer rows | generic attachment response | Document/Version read DTO | KEEP_VISUAL_REPLACE_DATA_FLOW | Keep table columns where authorized | Data comes from immutable version/read model |

Document target decisions:

- Add a temporary-upload state presentation with expiry and one-time-consumption feedback.
- Disable repeated consume actions after a command returns successful revision result.
- Show a clear expired or already-consumed error without exposing storage identifiers.
- Add immutable version-history list on document-owning pages.
- Add authorized secure-download action for an available version.
- Display purged version state without offering a broken download link.
- Use the parent aggregate mutation result to refresh document/version state.
- Delete unused `DocumentAttachmentsPanel.tsx` during document-slice cleanup.
- Remove generic `targetType`, `targetId`, `bucketName`, `objectKey`, and `tempSessionId` from frontend domain types.
- Do not create a direct permanent MinIO URL or an independent final-attachment screen.

## 13. Required V2 UI additions

These additions are not present in the customer mock-ups or current UI, but are mandated by the approved V2 model rules.

| Required target UI | Customer document filename | Current UI/API | Approved target entity or use case | Status | Future action | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Central Scope workspace | Not present in customer docs; approved V2 rule | No page, route, store, or API | B19–B24 Central Scope | ADD | Add route, FCL/List/Object Page or scoped workspace, typed value help, and read DTOs | Central Blueprint must be managed explicitly |
| Central Coverage workspace | Not present in customer docs; approved V2 rule | No page or API | B26–B30 Classification/Coverage | ADD | Add typed coverage tables/dialogs with same-Subprocess feedback | Direct/generic links are replaced |
| Local Organization–Subprocess Context | Not present as V2 concept; customer has legacy wizard | generic organization-process assignment | B31 Local Context | ADD | Add context creation, list, validity/lifecycle summary, and scoped navigation | Local data has this mandatory root |
| Local Scope workspace | Not present as V2 concept | legacy org assignments | B32–B36 Local Scope | ADD | Add context-bound typed scope selectors and tables | Prevents generic org assignment use |
| Local Coverage workspace | Not present as V2 concept | legacy org/process/control links | B38–B42 Local Coverage | ADD | Add context-bound typed coverage dialogs and diagnostics | Enforces same-context relationship |
| Central Policy Scope | Not present as real feature; policy scope placeholder only | no real storage/API | B25 | ADD | Add policy-version-to-Central-Scope UI | Required V2 applicability fact |
| Local Policy Scope | Not present as real feature | no real storage/API | B37 | ADD | Add context-bound policy applicability UI | Required V2 local applicability fact |
| Document Versioning | Customer rows imply version; legacy attachment mutable | no immutable history | B43–B45 | ADD | Add immutable version list, metadata, purge state, secure download | Approved Document model is new |
| Temporary upload flow | Customer upload tab; no V2 flow | `tempSessionId` generic flow | T01 | ADD | Add backend-issued `tempUploadId` lifecycle UI | One-time consumption required |
| Effective status | Not present | No query API/page | Effective Read DTO | ADD | Add read-only evaluation-date status page/tab | Approved Effective View |
| Diagnostics | Not present | No query API/page | Diagnostic DTO | ADD | Add read-only explanation drawer/page | Approved Diagnostic read model |
| Roll-up | Not present | No query API/page | Roll-up query | ADD | Add read-only aggregation view with evaluation date | Approved read model |
| Policy Applicability | Not present | policy scope placeholder only | Policy Applicability query | ADD | Add read-only applicability result view | Must not become workflow |
| Revision-aware mutation result | Not present | generic entity response | common mutation envelope | ADD | Add toast/banner with entity/revision/version and conflict handling | Backend-owned Business Revision is mandatory |

## 14. Read-model UX principles

Effective, Diagnostic, Roll-up, and Policy Applicability pages are read-only.

They all expose a common evaluation-date control using localized display but `YYYY-MM-DD` API values.

Effective result lists identify Central or Local origin without allowing a user to mutate derived facts inline.

Diagnostic views explain inclusion, exclusion, validity, scope, coverage, and policy reasoning in human-readable terms.

Roll-up views aggregate only approved read facts and do not display calculated risk scores or control effectiveness.

Policy Applicability displays immutable Policy Version references and valid applicability reasoning without approval actions.

All query pages use pagination and server-approved sort fields for collection results.

All query pages preserve RTL, Persian default labels, UI5, loading, empty-state, and error patterns.

No read-model page writes cache, audit, workflow, or local derived rows.

## 15. UI validation and authorization principles

Typed Value Help is required wherever a Scope or Coverage command selects an entity.

Value Help filters by Central Subprocess Scope or Local Context before allowing selection.

The UI validates required dates and version before submit, while backend validation remains authoritative.

The UI displays duplicate business-key, hierarchy-cycle, local-validity, cross-Subprocess, cross-context, and temporary-upload errors using i18n keys.

The UI never asks users to paste arbitrary IDs as a relationship fallback.

The UI never builds Revision Content, snapshots, sequences, or transaction steps.

Action visibility follows permissions, but backend resource authorization is authoritative.

Restore actions are explicit and version-aware.

Conflict UX offers refresh/review behavior rather than silent overwrite.

No dead route, permission, store, API repository, component, or i18n key remains once its vertical slice replaces it.

## 16. Explicit removals and exclusions

Do not add KPI to Master Data UI.

Do not add KRI to Master Data UI.

Do not add likelihood, impact, risk score, or assessment-result UI.

Do not add control-test result or control-effectiveness UI.

Do not create a Policy approval workflow, review queue, or approval status UI.

Do not retain Generic Objective when it conflicts with Control Objective.

Do not retain direct Control-to-Regulation UI.

Do not retain generic attachment target/type UI.

Do not retain direct final upload or standalone temporary commit UI.

Do not add materialized Effective, Diagnostic, Roll-up, or Policy Applicability editing screens.
