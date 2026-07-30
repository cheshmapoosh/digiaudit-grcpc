# Master Data V2 UI Compatibility Map

## 1. Purpose and comparison method

This map compares five inputs for future UI work:

1. Customer-provided Master Data UI Word documents.
2. Current React/UI5 user interface.
3. Current Backend/API and Legacy storage behavior.
4. The approved Master Data V2 Conceptual, Logical, and Physical models.
5. The required target UI and data flow.

The customer documents remain useful evidence of labels, forms, tabs, and workflows the customer expects to recognize.

They cannot add a Master Data concept that is absent from the approved final model.

Current UI/source is implementation evidence only.

The Final Logical Model owns target entity names and relationships.

The Physical Design Reference owns the upload/document technical flow.

Authoritative source files: `GRC_Master_Data_Reference_Conceptual_Model_FA.docx`, `GRC_Master_Data_Logical_Model_Final_FA.docx`, and `GRC_Master_Data_Physical_Design_Reference_FA.docx`.

This document plans later UI changes only.

It does not modify a route, component, store, API repository, i18n resource, or any application source file.

## 2. Status legend

| Status | UI interpretation |
| --- | --- |
| `KEEP` | Preserve the current behavior and data flow because it is compatible. |
| `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain useful UI5/FCL/List Report/Object Page/tree/search interaction, but replace API/state/storage behavior. |
| `REMAP` | Keep a recognizable customer intent while mapping it to an exact approved entity/use case. |
| `ADD` | Build a target capability absent from the current UI but required by the approved model. |
| `REMOVE` | Remove a UI/API feature because it conflicts with the approved model or has no approved counterpart. |
| `DEFER_OUT_OF_SCOPE` | Do not build it in Master Data V2; another governed module would need to own it. |

## 3. Current compatible presentation foundation

The following patterns should remain the visual foundation whenever the new data flow permits.

| Current evidence | Status | Target instruction |
| --- | --- | --- |
| SAP UI5 Web Components for React | `KEEP` | Retain UI5 controls, form behavior, tables, dialogs, and accessibility conventions. |
| Flexible Column Layout shells in feature pages | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain master/list/object composition; replace Legacy repository contracts. |
| List Report and Object Page layout | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain visual navigation and form organization; use typed V2 read DTOs and commands. |
| Tree navigation | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain tree interaction. Process/Subprocess may be combined only in a tree DTO. |
| Search, selection, expanded state | `KEEP` | Preserve user interaction state; re-key it with V2 UUIDs and routes. |
| RTL/Persian and i18n resources | `KEEP` | Preserve Persian-first label treatment and replace stale keys within the owning slice. |
| Value Help components | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Bind to typed Central catalog queries instead of generic assignment targets. |
| Reusable document progress/list/download components | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain presentation if compatible; replace direct-upload/generic-attachment state. |

Current route registration is in `grcpc-ui/src/app/router/AppRouter.tsx`.

Current feature hub is `grcpc-ui/src/features/master-data/pages/MasterDataFeaturePage.tsx`.

Current FCL shells include Organization, Process, Objective, Risk, Regulation, Policy, and Account Group feature pages.

The target hub must gain V2 relation/read-model entry points without retaining dead Legacy tiles.

## 4. Organization comparison

Customer source: `سازمان - فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current UI evidence: `features/organization/pages/OrganizationsFclShellPage.tsx`, `OrganizationObjectPage.tsx`, organization tree/components, organization state, and organization API repositories.

Current API/storage evidence: `/api/organizations`, generic organization-process/reference/risk assignments, and the current `organization` table.

| Customer field, tab, action, or relationship | Current UI/API/storage | Approved target entity or use case | Status | Future action and rationale |
| --- | --- | --- | --- | --- |
| Organization hierarchy and parent selection | Organization FCL/tree and `/api/organizations` | `organization` tree | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Keep tree, search, parent Value Help, and Object Page; use V2 lifecycle/version/revision command flow. |
| Organization code/basic identity fields | Current organization form | `organization` | `REMAP` | Retain compatible core identity fields only; apply approved business-key/lifecycle validation. |
| Organization description and basic metadata | Current object page/form | `organization` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Preserve compatible form layout; field names must follow the detailed V2 entity contract. |
| Process/Subprocess tab | Generic organization-process assignments | `local_organization_subprocess_scope` | `REMAP` | Replace generic Process assignment with exact Organization + Subprocess Context; only Subprocess is selectable. |
| Organization-to-risk tab | `organization_process_risk_assignment` and generic UI | Typed Local Risk Scope/Coverage under `local_organization_subprocess_scope` | `REMAP` | Expose risk as a typed Local Scope or Coverage view, not a direct Organization–Risk relation. |
| Organization-to-control tab | Generic reference/assignment UI | Local Control Scope and Local Coverage | `REMAP` | Render approved context-bound control data after Local Context exists. |
| Organization-to-regulation tab | Generic reference/assignment UI | Local Requirement Scope and Requirement–Control Coverage | `REMAP` | Replace Regulation target with atomic Requirement relationships only. |
| Organization-to-policy tab | Generic reference assignment | `local_policy_organization_scope` | `REMAP` | Provide include/exclude and propagation mode UI for Policy Version applicability. |
| Organization-to-objective tab | Generic objective assignment | Local Control Objective Scope | `REMAP` | Rename/remap only for genuine Control Objectives; remove generic objective vocabulary. |
| Organization owner display | Current basic assignment display | Local Control Scope actual owner where execution ownership is intended | `REMAP` | Do not create an organization-level generic owner relationship; show execution owner in Local Control Scope. |
| Organization document tab | Generic document attachment manager | Version-specific `document_link` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain document panel visual flow; target an approved document-link target and exact version. |
| Organization multi-step wizard | Customer workflow combining org/process/risk/control | Compound typed Business Commands | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain guided sequencing only after Context/Scope/Coverage APIs exist; browser must not compose revision contents. |
| Risk appetite | Customer tab | None | `DEFER_OUT_OF_SCOPE` | Do not add to Master Data V2; it needs separate governed design. |
| KPI/KRI tabs | Customer tabs | None | `DEFER_OUT_OF_SCOPE` | Do not add KPI or KRI UI, API, or storage to Master Data V2. |
| Performance-related fields | Customer form/tab | None | `DEFER_OUT_OF_SCOPE` | Monitoring/performance capability is outside the approved domain. |

## 5. Process and Subprocess comparison

Customer source: `فرایند و زیرفرایند - فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current UI evidence: `features/process/pages/ProcessesFclShellPage.tsx`, `components/ProcessTree.tsx`, `ProcessControlTree.tsx`, and `utils/process.tree.ts`.

Current API/storage evidence: `/api/processes`, legacy process assignment endpoints, and combined `process_node` persistence.

| Customer field, tab, action, or relationship | Current UI/API/storage | Approved target entity or use case | Status | Future action and rationale |
| --- | --- | --- | --- | --- |
| Combined Process/Subprocess tree | Current tree backed by `process_node` | `central_process` + `central_subprocess` tree DTO | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Preserve one navigable tree; Backend returns combined read DTO while persistence stays separated. |
| Create Process | Current process form/API | `central_process` create command | `REMAP` | Use typed Process create/update/status commands and hierarchy cycle validation. |
| Create Subprocess | Current node-type form/API | `central_subprocess` create command | `REMAP` | Use distinct Subprocess form/command with exactly one parent Process. |
| Parent move/reorder | Current tree behavior | Process parent and sort order | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Preserve drag/select UX only if it maps to typed move/reorder commands and version validation. |
| Process basic fields | Current combined node form | Separate Process/Subprocess fields | `REMAP` | Keep shared visual fields but use two DTOs; do not use a node-type switch as persistence. |
| Controls tab | `ProcessControlsTab.tsx`, generic assignments | Central/Local Control Scope and typed Coverage | `REMAP` | Replace generic Process-to-Control assignment with Subprocess Scope view/commands. |
| Risks tab | `ProcessRisksTab.tsx`, generic process-risk assignment | Central/Local Risk Template Scope and Coverage | `REMAP` | Requirement is scope-specific; use typed Scope/Coverage, no raw risk relation. |
| Regulation tab | `ProcessRegulationsTab.tsx`, process-regulation assignment | Central/Local Requirement Scope | `REMAP` | Show Regulation hierarchy for context, but commands select a Requirement Scope. |
| Control Objective tab | `ProcessObjectivesTab.tsx`, generic objective assignment | Central/Local Control Objective Scope | `REMAP` | Remove generic objective data flow and use exact Control Objective Scope. |
| Account Group tab | `ProcessAccountGroupsTab.tsx` | None at Process/Subprocess scope | `REMOVE` | No approved Process/Subprocess-to-Account Group Scope exists. |
| Documents tab | Generic attachment UI | Version-specific Document Link | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Reuse visual panel only for approved document-link targets. |
| Process-level coverage editing | Current generic links/controls | Central Coverage under Subprocess | `REMAP` | Move entry point to selected Subprocess; enforce Scope-before-Coverage. |
| Tree selection/expanded state/search | Current process tree UX | V2 combined read DTO | `KEEP` | Preserve user interaction state and route synchronization. |

## 6. Control and Control Objective comparison

Customer sources: `کنترل- فرم ایجاد اطلاعات پایه -Master Data.docx` and `هدف کنترلی- فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current UI evidence: `features/control/pages/ControlObjectPage.tsx`, control tabs/state/API repository, and nested control route under process control assignment; Control Objective currently uses `features/objective/**`.

Current API/storage evidence: `/api/controls`, `/api/control-assignments/**`, `/api/objectives`, `control_assignment`, generic `objective_node`, direct link tables, and `control_document`.

| Customer field, tab, action, or relationship | Current UI/API/storage | Approved target entity or use case | Status | Future action and rationale |
| --- | --- | --- | --- | --- |
| Control code/title/basic definition | Control Object Page and `/api/controls` | `central_control` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain core definition form visual design; use Central Control command/read DTOs. |
| Control objective text on control form | Legacy control fields | `central_control_objective` plus direct typed Coverage | `REMOVE` | Do not retain a duplicate generic objective text in Control. |
| Control Objective catalog/form | Generic Objective FCL/API | `central_control_objective` | `REPLACE` | Replace generic Objective feature with Control Objective catalog and correct labels/routes. |
| Control-to-Control Objective tab | Current direct/generic links | `central_subprocess_control_control_objective_coverage` and Local counterpart | `REMAP` | Present typed direct Coverage in a selected Subprocess/Local Context; never derive from Risk path. |
| Control-to-Risk tab | `control_risk_link` | Risk–Control Coverage | `REMAP` | Rewire to typed Scope endpoint Coverage, central or local based on context. |
| Control-to-Requirement tab | `control_requirement_link` | Requirement–Control Coverage | `REMAP` | Use exact Requirement Scope and Control Scope, enforcing same Subprocess/Context. |
| Control-to-Regulation tab | `control_regulation_link` | None | `REMOVE` | Direct Control–Regulation relation is forbidden; show requirement-based coverage instead. |
| Control-to-Account Group tab | `control_account_group_link` | `central_control_account_group` | `REMAP` | Retain relationship list/value-help visual pattern; use direct Central classification. |
| Control Objective-to-Account Group | Customer/customer implied classification | `central_control_objective_account_group` | `ADD` | Add explicit typed classification UI absent from current generic Objective flow. |
| Control steps | `control_step` tabs/API | None | `REMOVE` | Execution steps are not Master Data V2. |
| Control performance plan | `control_performance_plan` tab/API | None | `DEFER_OUT_OF_SCOPE` | Do not retain in Master Data; performance/monitoring is a separate concern. |
| Control actual owner | Customer control fields | `local_subprocess_control_scope.actual_owner_id` | `REMAP` | Display/edit only in selected Local Context, never in Central Control. |
| Frequency/execution/test method | Customer control fields | Local Control Scope fields | `REMAP` | Move to Local Scope tab and keep Central recommended values distinct. |
| Control documents | `control_document` and generic manager | `document_link` to exact Document Version | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain document list UX; remove control-assignment-specific storage. |
| Control test result/effectiveness | Customer control material | None | `DEFER_OUT_OF_SCOPE` | No testing/effectiveness result UI/API is added. |
| Control nested route under legacy assignment | `/processes/control-assignments/:controlAssignmentId` | Central/Local Control Scope context routes | `REPLACE` | Remove route dependence on legacy assignment; route by typed scope/context. |
| Control form documents/add action | Current attachment direct upload | Temporary upload then version link | `REMAP` | Final command includes `tempUploadId`; user sees immutable version result. |

## 7. Risk Category and Risk Template comparison

Customer source: `ریسک- فرم ایحاد اطلاعات پایه .docx`.

Current UI evidence: `features/risk/pages/RisksFclShellPage.tsx`, risk tree/state/API repository.

Current API/storage evidence: `/api/risks` and combined `risk_node` persistence.

| Customer field, tab, action, or relationship | Current UI/API/storage | Approved target entity or use case | Status | Future action and rationale |
| --- | --- | --- | --- | --- |
| Risk Category tree | Current combined risk tree | `central_risk_category` tree | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Preserve hierarchy visual pattern; load category-only tree nodes separately from Templates. |
| Risk Template form | Current combined node form | `central_risk_template` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Preserve compatible fields/description presentation; use typed template DTO/API. |
| Category-to-Template parent relationship | Current node type hierarchy | `risk_category_id` FK | `REMAP` | Use explicit parent reference rather than a generic node type. |
| Causes/effects narrative fields | Customer template tabs | Risk Template detailed attributes when compatible | `REMAP` | Treat as descriptive template content only; do not infer scoring/result structures. |
| Existing controls relationship | Customer risk tab | Risk–Control Coverage | `REMAP` | Expose only selected Subprocess/Local Context typed Coverage. |
| Control Objective relationship | Customer risk tab | Risk–Control Objective Coverage | `ADD` | Add typed coverage UI because approved model includes it and current UI lacks it. |
| Risk response | Customer tab | None | `DEFER_OUT_OF_SCOPE` | Risk treatment/response belongs outside approved Master Data V2. |
| KRI | Customer tab | None | `DEFER_OUT_OF_SCOPE` | Do not add KRI capability. |
| Likelihood/impact/score | Customer risk material | None | `DEFER_OUT_OF_SCOPE` | Do not add risk assessment fields, calculations, or result pages. |
| Inherent/residual assessment | Customer terminology | None | `DEFER_OUT_OF_SCOPE` | Excluded from Master Data V2. |
| Template documents | Generic attachment manager | Version-specific Document Link | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Reuse document visual elements after V2 Document flow is available. |

## 8. Regulation Group, Regulation, and Regulation Requirement comparison

Customer source: `گروه قوانین - فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current UI evidence: `features/regulation/pages/RegulationsFclShellPage.tsx`, hierarchy components, and `RegulationRequirementsSummaryTab.tsx`.

Current API/storage evidence: `/api/regulations` and combined `regulation` persistence.

| Customer field, tab, action, or relationship | Current UI/API/storage | Approved target entity or use case | Status | Future action and rationale |
| --- | --- | --- | --- | --- |
| Regulation Group tree | Current combined hierarchy | `central_regulation_group` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Keep tree navigation but create a typed group read model. |
| Regulation row/form | Current combined node API | `central_regulation` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Keep object page structure; map to Regulation with group parent FK. |
| Regulation Requirement form/list | Requirements summary UI | `central_regulation_requirement` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain summary/list visual workflow; Requirement is a first-class typed entity. |
| Requirement-to-Subprocess relation | Customer/process flow | `central_subprocess_requirement_scope` | `ADD` | Add a typed Scope workflow absent from current UI. |
| Requirement-to-Control relation | Current direct control requirement link | Requirement–Control Coverage | `REMAP` | Provide central/local Coverage views with exact Scope endpoints. |
| Direct Regulation-to-Control relation | Current control regulation tab/API | None | `REMOVE` | Do not present editable direct link; explain requirement-level route in UX. |
| Regulation Group direct operational link | Customer grouping expectation | None | `REMOVE` | Group is classification only, never a Scope/Coverage endpoint. |
| Regulation/Requirement documents | Generic attachments | V2 Document Link | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Preserve panel visual treatment with exact version links. |
| Requirement search/value help | Current regulation query | Typed Requirement Value Help | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Preserve search/select patterns, scoped by authorized Central catalog. |

## 9. Policy Group, Policy, and Policy Version comparison

Customer source: `سیاست- فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current UI evidence: `features/policy/pages/PoliciesFclShellPage.tsx`, policy tree/state/API repository.

Current API/storage evidence: `/api/policies` and combined `policy_node` persistence with workflow-oriented behavior.

| Customer field, tab, action, or relationship | Current UI/API/storage | Approved target entity or use case | Status | Future action and rationale |
| --- | --- | --- | --- | --- |
| Policy Group tree | Current policy tree | `central_policy_group` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain tree navigation and hierarchy search. |
| Policy stable identity form | Combined policy node | `central_policy` | `REMAP` | Separate identity fields from version content in the UI. |
| Policy Version tab | Current mutable version/status behavior | `central_policy_version` | `REPLACE` | Present Version as a first-class immutable content item after publish. |
| Draft Policy Version editing | Current policy form | DRAFT Policy Version | `REMAP` | Allow typed content metadata editing only while the domain status permits; publish workflow itself remains external. |
| Published content editing | Current UI may allow mutable node edits | New Policy Version | `REMOVE` | Replace edit-in-place with create-next-version UX. |
| Approval/review workflow | Customer mock-up tabs/actions | None in Master Data V2 | `DEFER_OUT_OF_SCOPE` | Do not build approval task, queue, or workflow UI in this domain. |
| Policy documents | Generic attachment UI | Document Version/Link; primary-document semantics | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain document panel but bind to immutable versions and exact links. |
| Policy-to-Subprocess Scope | Customer generic scope section | `central_policy_version_subprocess_scope` | `ADD` | Add Central baseline policy-scope page/dialog. |
| Policy-to-Control Scope | Customer generic target selection | `central_policy_version_control_scope` | `ADD` | Add exact Central Control Scope selector; never select raw Control. |
| Policy-to-Requirement Scope | Customer generic target selection | `central_policy_version_requirement_scope` | `ADD` | Add exact Central Requirement Scope selector; never select raw Requirement/Regulation. |
| Policy-to-Risk Scope | Customer scope expectation | None | `REMOVE` | The approved model has no Policy-to-Risk scope. |
| Organization policy applicability | Customer organization policy tab | `local_policy_organization_scope` | `ADD` | Add Include/Exclude and Direct/Descendant behavior with target explanation. |
| Local Subprocess Policy | Customer scope/workflow | `local_policy_subprocess_scope` | `ADD` | Add Local Context policy decision UI. |
| Local Control Policy | Customer target workflow | `local_policy_control_scope` | `ADD` | Add exact Local Control Scope policy decision UI. |
| Local Requirement Policy | Customer target workflow | `local_policy_requirement_scope` | `ADD` | Add exact Local Requirement Scope policy decision UI. |
| Policy propagation result | Customer expects applicability | Read-only Policy Applicability | `ADD` | Add result page/panel showing selected source, action, propagation, and evaluation date. |
| Policy review/history | Customer workflow expectation | Business Revision read feedback, not workflow | `REMAP` | Show revision-aware mutation/history information only where authorized; no approval workflow. |

## 10. Account Group comparison

Customer source: `گروه حساب ها-فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current UI evidence: `features/account-group/pages/AccountGroupsFclShellPage.tsx`, account-group tree/state/API repository.

Current API/storage evidence: `/api/account-groups`, `account_group` with JSON payloads and control account-group links.

| Customer field, tab, action, or relationship | Current UI/API/storage | Approved target entity or use case | Status | Future action and rationale |
| --- | --- | --- | --- | --- |
| Account Group hierarchy | Current tree | `central_account_group` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain tree/search/value-help interaction; use typed parent FK/hierarchy commands. |
| Account Group basic fields | Current form | `central_account_group` | `REMAP` | Keep compatible core catalog presentation only. |
| Control classification | Current Control Account Group link | `central_control_account_group` | `REMAP` | Use direct typed Central classification UI. |
| Control Objective classification | Customer relation | `central_control_objective_account_group` | `ADD` | Add the approved second classification UI. |
| Assertions | Customer tab / JSON payload | None | `REMOVE` | Do not introduce assertion UI or a relation table absent from final model. |
| Account/GL ranges | Customer tab / JSON payload | None | `REMOVE` | Do not introduce ranges or JSON relation fields absent from final model. |
| Materiality/reasonable-assurance attributes | Customer fields | None | `DEFER_OUT_OF_SCOPE` | Do not treat accounting assurance metrics as Master Data V2 structures. |
| Account Group-to-Risk relation | Customer tab | None | `REMOVE` | No approved direct Account Group–Risk relation. |
| Account Group documents | Generic attachment UI | Document Link when target is approved | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Use shared V2 Document presentation only. |

## 11. Generic Objective customer document comparison

Customer source: `اهداف- فرم ایجاد اطلاعات پایه- Master Data  .docx`.

Current UI evidence: `features/objective/**`, Objective FCL shell, generic Objective state/API repository, and `/api/objectives`.

Current API/storage evidence: `objective_node` and `objective_organization_assignment`.

| Customer field, tab, action, or relationship | Current UI/API/storage | Approved target entity or use case | Status | Future action and rationale |
| --- | --- | --- | --- | --- |
| Generic objective hierarchy | Objective FCL/tree | None | `REMOVE` | Remove generic objective tree; only Control Objective catalog remains. |
| Objective code/title/description | Generic Objective form | `central_control_objective` when semantic meaning is control objective | `REMAP` | Migrate visual label/field pattern only where it represents Control Objective; do not retain generic semantics. |
| Strategy/objective type | Customer generic fields | None unless approved detailed Control Objective attribute | `DEFER_OUT_OF_SCOPE` | Do not add unapproved generic objective fields. |
| Organization assignment | Generic objective-organization assignment | Local Control Objective Scope | `REMAP` | Only show a Control Objective in a Local Context via typed Scope. |
| Subprocess relation | Current generic Process objective assignment | Central/Local Control Objective Scope | `REMAP` | Use exact Subprocess Scope; no Process-level generic assignment. |
| Risk relation | Customer tab | Risk–Control Objective Coverage | `REMAP` | Use typed Coverage in one Central/Local Subprocess context. |
| Documents | Generic attachments | V2 Document Link | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Reuse document panel only after generic attachment flow is removed. |

## 12. Central Scope, Coverage, and Local Context additions

These approved capabilities are not implemented in the current UI and must be classified as `ADD`.

| Required target capability | Current UI/API/storage | Approved entity/use case | Status | Required target UI |
| --- | --- | --- | --- | --- |
| Central Control Scope | No typed screen; generic process-control assignments only | `central_subprocess_control_scope` | `ADD` | Selected Subprocess tab/dialog with Control Value Help, validity, recommendations, and revision result. |
| Central Risk Scope | No typed screen | `central_subprocess_risk_scope` | `ADD` | Selected Subprocess tab/dialog with Risk Template Value Help and validity. |
| Central Control Objective Scope | No typed screen | `central_subprocess_control_objective_scope` | `ADD` | Selected Subprocess Scope list/dialog. |
| Central Requirement Scope | No typed screen | `central_subprocess_requirement_scope` | `ADD` | Selected Subprocess Requirement Scope list/dialog. |
| Central Risk–Control Coverage | Generic risk/control link only | `central_subprocess_risk_control_coverage` | `ADD` | Scope-picker dialog that exposes only scopes in the selected Subprocess. |
| Central Risk–Control Objective Coverage | No equivalent | `central_subprocess_risk_control_objective_coverage` | `ADD` | Typed Scope-pair dialog, no generated relation. |
| Central Control–Control Objective Coverage | No exact contextual equivalent | `central_subprocess_control_control_objective_coverage` | `ADD` | Direct typed coverage list/dialog independent of Risk path. |
| Central Requirement–Control Coverage | Legacy direct link lacks context | `central_subprocess_requirement_control_coverage` | `ADD` | Typed requirement/control Scope-pair dialog. |
| Central Policy Scope | No approved model equivalent | Three `central_policy_version_*_scope` tables | `ADD` | Policy Version scope tab with type-specific selectors and baseline explanation. |
| Local Organization–Subprocess Context | Generic organization-process assignment only | `local_organization_subprocess_scope` | `ADD` | Organization Object Page Local Context tab with exact Subprocess selection and validity. |
| Local Control/Risk/Objective/Requirement Scope | Generic local/reference assignments only | Four `local_subprocess_*_scope` tables | `ADD` | Context-scoped typed tabs, source type, inherited reference indication, and validity checks. |
| Local Coverage | Generic links/assignments only | Four `local_subprocess_*_coverage` tables | `ADD` | Context-scoped typed Coverage dialogs that select only same-context Scope endpoints. |
| Local Policy Scope | No typed policy applicability UI | Four `local_policy_*_scope` tables | `ADD` | Organization/Context/exact-target policy tabs with decision/preference feedback. |

## 13. Document, Business Revision, and read-model UX additions

| Required target capability | Current UI/API/storage | Approved entity/use case | Status | Required target UI |
| --- | --- | --- | --- | --- |
| Temporary upload first | `/api/documents/temp` plus session-oriented client state | `document_temp_upload` | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Keep progress UI; replace session state with `tempUploadId`, expiry, and authorization feedback. |
| No direct final upload | `POST /api/documents` direct upload | Final typed Business Command | `REMOVE` | Remove direct final-upload action; final save consumes temporary upload inside the command. |
| Immutable Document Version list | Generic attachment list | `document` + `document_version` | `ADD` | Add version history, version number, file metadata, storage state, and immutable replacement action. |
| Retention policy display | No current V2 equivalent | `document_retention_policy` | `ADD` | Add retention policy selection/read information where authorized. |
| Document Hold display/action | No current V2 equivalent | `document_hold` | `ADD` | Add authorized hold/release panel and purge-block explanation. |
| Controlled Document Link | Generic `targetType`/`targetId` binding | `document_link` | `REPLACE` | UI chooses an approved typed target context; it never exposes an open generic target list. |
| Secure download | Presigned download URL flow | Authorized document-version download use case | `KEEP_VISUAL_REPLACE_DATA_FLOW` | Retain download button; request controlled stream/short-lived URL without exposing permanent key. |
| Revision-aware mutation result | Current CRUD feedback only | `masterdata_revision` result | `ADD` | Show successful entity ID, revision ID, and new version; link to authorized revision summary if available. |
| Business Revision history | No current V2 UI | `masterdata_revision` and read projection | `ADD` | Add read-only revision panel separated from generic Audit Trail. |
| Effective status | No current UI | Effective Read DTO | `ADD` | Add read-only status badge with common evaluation date and source. |
| Diagnostic detail | No current UI | Diagnostic DTO | `ADD` | Add read-only support/admin diagnostic panel listing every blocker/dependency. |
| Roll-up | No current V2 UI | Roll-up read DTO | `ADD` | Add read-only organization/process roll-up views retaining source identity. |
| Policy Applicability | No current V2 UI | Policy Applicability DTO | `ADD` | Add read-only result explaining selected policy scope, action, propagation, and precedence. |

## 14. Current API and storage compatibility summary

| Current endpoint/storage behavior | Status | Approved target correction |
| --- | --- | --- |
| `/api/organizations` basic tree CRUD | `REMAP` | Retain Organization capability under revision/version/lifecycle rules. |
| `/api/processes` over combined process nodes | `REPLACE` | Separate Process/Subprocess route families and combined read-tree DTO. |
| `/api/objectives` generic objective API | `REMOVE` | Replace with Control Objective API only. |
| `/api/risks` combined risk nodes | `REPLACE` | Separate Category and Template endpoints. |
| `/api/regulations` combined hierarchy | `REPLACE` | Separate Group/Regulation/Requirement endpoint families. |
| `/api/policies` combined hierarchy/version/workflow | `REPLACE` | Separate Group/Policy/Policy Version and typed policy scope APIs. |
| `/api/account-groups` JSON relationship behavior | `REPLACE` | Hierarchy plus only two approved direct classifications. |
| `/api/control-assignments/**` legacy tab APIs | `REMOVE` | Replace individual approved relation interactions with typed Scope/Coverage commands. |
| `/api/organization-process-assignments` | `REMOVE` | Replace with Local Organization–Subprocess Scope command/query. |
| `/api/organization-risk-assignments` and generic reference endpoints | `REMOVE` | Replace only with typed Local Scope/Coverage/Policy Scope flows. |
| `POST /api/documents` direct final upload | `REMOVE` | Temporary upload then document-aware business command. |
| `/api/documents/temp` and `/api/documents/commit` session flow | `REPLACE` | `tempUploadId` staging and one-time server-side consumption. |
| Generic document attachment storage | `REPLACE` | Document, immutable Version, Retention, Hold, controlled Link. |

## 15. Explicit exclusions in target UI

The target Master Data V2 UI must not add a KPI page.

The target Master Data V2 UI must not add a KRI page.

The target Master Data V2 UI must not add likelihood, impact, inherent score, residual score, or assessment-result fields.

The target Master Data V2 UI must not add control-test results or control-effectiveness fields.

The target Master Data V2 UI must not add a Policy approval workflow, task queue, approval history, or acknowledgement screen.

The target Master Data V2 UI must not add monitoring, jobs, scheduler, cache, outbox, or generic Audit management views.

The target Master Data V2 UI must not expose a generic Objective feature.

The target Master Data V2 UI must not expose a direct Control-to-Regulation relation.

The target Master Data V2 UI must not expose arbitrary generic Scope/Coverage target selection.

## 16. UI delivery order and cleanup rule

First deliver V2 navigation and read-only Central catalog tree/query routes while preserving compatible UI5/FCL patterns.

Next deliver Central Scope/Classification/Coverage and Policy Scope screens.

Next deliver Local Context before Local Scope/Coverage/Policy Scope screens.

Next deliver Document Version/temporary-upload/hold/link UI and Revision-aware mutation feedback.

Next deliver Effective, Diagnostic, Roll-up, and Policy Applicability read-only pages/panels.

Each vertical slice removes its replaced Legacy page, route, store, API repository, dialog, permission reference, and i18n key before the slice is accepted.

No Legacy UI is kept as a compatibility screen.

No existing visual workflow is retained if it would cause a generic relation, direct regulation link, browser-owned revision, direct final upload, or out-of-scope feature.

The final target preserves useful customer workflows visually while enforcing the approved V2 model underneath.
