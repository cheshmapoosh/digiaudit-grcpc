# تحویل یکسان‌سازی مودال‌های حاکمیت و کنترل — ۲۰۲۶-۱۰-۲۸

## نتیجه و مرز بررسی

اصلاح بعدی مالک در [قرارداد پیش‌نویس الزام‌های قانون](accepted-corrections/2026-10-28-regulation-requirement-aggregate.md) بر شرح Import مستقل این گزارش مقدم است: اکنون Excel آبی در ویرایش قانون فقط پیش‌نویس می‌سازد و lifecycle الزام‌ها با Save اصلی قانون ثبت می‌شود. طبق اصلاح نهایی، مشاهده و مودال فرزند حذف شدند و toolbar همان الگوی زیرفرآیند سازمان را دارد. عرض همهٔ مودال‌های کاتالوگ حاکمیت و کنترل از قاعدهٔ مشترک ۹۰vw/۹۶vw پیروی می‌کند.

Save اصلی هر مودال، مالک پیش‌نویس‌های رابطهٔ قابل‌ویرایش آن است. انتخاب، lifecycle، metadata و حذف نرم بدون write فوری در تب انجام می‌شوند؛ پاسخ canonical شامل هویت و نسخهٔ واقعی با baseline ادغام می‌شود. جدول‌های معکوس و projectionها فقط‌خواندنی مانده‌اند. این گزارش نتیجهٔ پیاده‌سازی و بازخوانی سورس است؛ رفتار runtime، SQL Oracle و هم‌زمانی واقعی آزموده نشده‌اند.

اصلاح صریح جدید مالک در نسخهٔ جاری سند درخواست نیز رعایت شد: **آپلود Excel الزام‌ها در همان تب الزام‌های مودال قانون باقی می‌ماند**؛ انتقال آن به منوی ایجاد لغو شد. مقصد از همان قانون ذخیره‌شدهٔ مودال گرفته می‌شود؛ مجوز، وضعیت، جلوگیری از تداخل با draft، preview/تأیید مستقل و refresh همان قانون و همان تب حفظ می‌شوند. متن پرامپتِ دارای ویرایش کاربر بازنویسی نشده است.

## فایل‌های اصلی

- نمایش مشترک: `grcpc-ui/src/shared/components/CatalogRelationTable.tsx`، `CatalogRelationToolbar.tsx`، `CatalogRelationStatus.tsx`، `CatalogRelationDate.tsx`، `CatalogTableViewport.tsx` و `shared/hooks/useCatalogTableViewport.ts`.
- سازمان: `organization/pages/OrganizationObjectPage.tsx`، `local-master-data/components/OrganizationLocalDraftWorkspace.tsx` و `OrganizationLocalDraftTable.tsx`، مدل/adapter `domain/organizationLocal.model.ts` و زنجیرهٔ model/schema/service/API/state سازمان.
- backend سازمان/Local: `OrganizationService`، `OrganizationOwnerAssignmentService`، `OrganizationLocalAggregateService`، هشت `Local*Service` با prepare/apply typed، `OrganizationLocalDtos`، `OrganizationLocalDrafts` و `OrganizationLocalDeletions`.
- B1/G1: `OrganizationObjectiveService`، `ObjectiveService`، `GlobalControlRegulationService`، `GlobalControlService` و ObjectPage/table/model/API/state متناظر؛ owner rows و linkهای canonical شامل lifecycle مستقل هستند.
- والدها: هفت Update فعال در `masterdata/catalog/{accountgroup,risk,regulation,policy}` و DTOهای `parentChange`؛ میزبان‌های واقعی و value helpهای هر feature.
- migration: `grcpc-app/src/main/resources/db/migration/oracle/V1202__relationship_inactive_status.sql`.
- قرارداد نهایی: [تصمیم پذیرفته‌شده](accepted-corrections/2026-10-28-governance-modal-relations.md)؛ AGENTSهای ریشه، UI، Organization و Objective نیز هماهنگ شدند.

## پوشش ۲۶ خانوادهٔ قابل‌نوشتن

نام فایل UI در جدول زیر نسبت به `grcpc-ui/src/features/` است. نام DTO به کد فعال backend اشاره می‌کند. وضعیت همهٔ ردیف‌ها «پیاده‌سازی و بازخوانی سورس» است، نه نتیجهٔ آزمون runtime.

| ID | مالک Save | UI فعال / variant | DTO یا collection درخواست | canonical response |
| --- | --- | --- | --- | --- |
| L1 | Organization | `local-master-data/components/OrganizationSubprocessTable.tsx` | `LocalContextDtos.ContextChange`؛ `subprocesses` | `localRelationships.contexts` و `subprocesses.rows`؛ ID/version و tombstone |
| L2 | Organization | `OrganizationScopesTab.tsx` و `OrganizationScopesTable.tsx`؛ `control-scopes`، جدول یکپارچه بدون کمبوی زمینه، حفظ metadata کنترل | `OrganizationLocalDtos.ControlChange`؛ `localControlScopeChanges` | `localRelationships.controls: LocalControlDtos.Row[]` |
| L3 | Organization | `OrganizationRisksTab.tsx` و `OrganizationRisksTable.tsx`؛ جدول یکپارچهٔ سازمان، انتخاب Scope مرکزی از زیرفرآیندهای متصل همین سازمان، بدون کمبوی زمینه | `RiskChange`؛ `localRiskScopeChanges` | `localRelationships.risks: LocalRiskDtos.Row[]` |
| L4 | Organization | `OrganizationScopesTab.tsx` و `OrganizationScopesTable.tsx`؛ `control-objective-scopes`، انتخاب از زیرفرآیندهای متصل | `ObjectiveChange`؛ `localControlObjectiveScopeChanges` | `localRelationships.controlObjectives: LocalObjectiveDtos.Row[]` |
| L5 | Organization | همان؛ `requirement-scopes`، حفظ الزام به‌عنوان مقصد رابطهٔ تب قوانین | `RequirementChange`؛ `localRequirementScopeChanges` | `localRelationships.requirements: LocalRequirementDtos.Row[]` |
| L6 | Organization | `OrganizationLocalDraftTable.tsx`؛ `organization-policies` | `OrganizationPolicyChange`؛ `localOrganizationPolicyChanges` | `localRelationships.organizationPolicies: LocalOrganizationPolicyDtos.Row[]` |
| L7 | Organization | همان؛ `context-policies` | `ContextPolicyChange`؛ `localContextPolicyChanges` | `localRelationships.contextPolicies: LocalContextPolicyDtos.Row[]` |
| L8 | Organization | همان؛ `control-policies` | `ControlPolicyChange`؛ `localControlPolicyChanges`، `controlScopeRef` دقیق | `localRelationships.controlPolicies: LocalControlPolicyDtos.Row[]` |
| L9 | Organization | همان؛ `requirement-policies` | `RequirementPolicyChange`؛ `localRequirementPolicyChanges`، `requirementScopeRef` دقیق | `localRelationships.requirementPolicies: LocalRequirementPolicyDtos.Row[]` |
| B1 | Organization و Objective؛ یک رکورد مشترک | `objective/components/OrganizationObjectivesTab.tsx`، `OrganizationObjectiveRelations.tsx` و `pages/ObjectiveManagementPage.tsx` | `OrganizationObjectiveChange`؛ سمت سازمان `organizationObjectiveChanges`، سمت هدف `organizationChanges` | `localRelationships.objectives: Detail[]` و `ObjectiveDtos.AggregateResponse.organizations: OrganizationLink[]`؛ metadata/ID/version و tombstone |
| O1 | Organization | `organization/components/OrganizationOwnersTab.tsx` | `OrganizationOwnerChange`؛ `ownerAssignments` | `OrganizationOwnerView` با status/eligibility/role مستقل و assignmentId/version |
| S1 | Subprocess | `control-scope/components/SubprocessControlScopesTab.tsx` | `CentralControlScopeChangeRequest`؛ `controlScopeChanges` | `controlScopes` پاسخ Process/Subprocess |
| S2 | Subprocess | `risk-scope/components/SubprocessRiskScopesTab.tsx` | `CentralRiskScopeChangeRequest`؛ `riskScopeChanges` | `riskScopes` |
| S3 | Subprocess | `control-objective-scope/components/SubprocessControlObjectiveScopesTab.tsx` | `CentralControlObjectiveScopeChangeRequest`؛ `controlObjectiveScopeChanges` | `controlObjectiveScopes` |
| S4 | Subprocess | `requirement-scope/components/SubprocessRequirementScopesTab.tsx` | `CentralRequirementScopeChangeRequest`؛ `requirementScopeChanges` | `requirementScopes` |
| A1 | Control | `risk-control-assignment/components/ControlRiskTemplateAssignmentsTab.tsx` | `CentralRiskControlAssignmentChangeRequest`؛ `riskAssignments` | `riskAssignments` پاسخ Control |
| A2 | Control Objective | `risk-control-objective-assignment/components/ControlObjectiveRiskTemplateAssignmentsTab.tsx` | `CentralRiskControlObjectiveAssignmentChangeRequest`؛ `riskAssignments` | `riskAssignments` پاسخ Control Objective |
| A3 | Control | `control-control-objective-assignment/components/ControlControlObjectiveAssignmentsTab.tsx` | `CentralControlControlObjectiveAssignmentChangeRequest`؛ `controlObjectiveAssignments` | `controlObjectiveAssignments` |
| A4 | Control | `requirement-control-assignment/components/ControlRequirementAssignmentsTab.tsx` | `CentralRequirementControlAssignmentChangeRequest`؛ `requirementAssignments` | `requirementAssignments` |
| C1 | Control | `control-account-group/components/ControlAccountGroupsTab.tsx` | `CentralControlAccountGroupChangeRequest`؛ `accountGroupChanges` | `accountGroupClassifications` پاسخ Control |
| C2 | Control Objective | `control-objective-account-group/components/ControlObjectiveAccountGroupsTab.tsx` | `CentralControlObjectiveAccountGroupChangeRequest`؛ `accountGroupChanges` | `accountGroupClassifications` پاسخ Control Objective |
| P1 | Policy | `policy/components/PolicyRelationTab.tsx`؛ `subprocess` | `CentralPolicyDtos.PolicySubprocessScopeChange`؛ `subprocessScopeChanges` | `subprocessScopes` |
| P2 | Policy | همان؛ `organization` | `PolicyOrganizationScopeChange`؛ `organizationScopeChanges` | `organizationScopes` |
| P3 | Policy | همان؛ `control` | `PolicyControlScopeChange`؛ `controlScopeChanges` با `centralControlScopeId` | `controlScopes` |
| P4 | Policy | همان؛ `requirement` | `PolicyRequirementScopeChange`؛ `requirementScopeChanges` با `centralRequirementScopeId` | `requirementScopes` |
| G1 | Global Control | `global-control/components/GlobalControlRegulationsTab.tsx` و `pages/GlobalControlManagementPage.tsx` | `GlobalControlRegulationDtos.Change`؛ `regulationChanges` | `GlobalControlDtos.AggregateResponse`؛ مالک و روابط با id/version/status و regulationStatus مستقل |

`OrganizationLocalDraftWorkspace` همهٔ هشت variant محلی را به state مالک وصل می‌کند. Context و Scope pending با reference typed نمایش داده می‌شوند؛ UUID دیتابیس در Browser ساخته نمی‌شود. source و exact Central reference رکورد persisted تغییرپذیر نیستند. L2 تمام owner/frequency/execution/test/note/dateها، L3–L5 source/dateها، L6 action/propagation/dateها و L7–L9 action/dateها را حفظ می‌کنند. B1 نام محلی، description، owner متنی و تاریخ‌ها را نگه می‌دارد. O1/G1 تاریخ جدید ندارند.

پاسخ‌های Local، delta هستند و با بالاترین version بر اساس ID ادغام می‌شوند. tombstone فقط برای reconciliation است. خرابی GET بعد از commit به عنوان شکست mutation معرفی نمی‌شود. Scopeهای مرکزی چهار deleted GET داخلی جدید دارند؛ deleted readهای A/C/Policy/B1/O1/G1 نیز برای occupied-pair lookup استفاده می‌شوند. هیچ فیلتر Deleted یا کنترل Restore در جدول رابطه mount نمی‌شود.

## پوشش فقط‌خواندنی و میزبان‌ها

| سطح | UI فعال و رفتار |
| --- | --- |
| Control → Subprocess | `ControlSubprocessScopesTab.tsx`؛ جدول/Link/status/validity و فیلتر/اسکرول؛ بدون mutation |
| Control Objective → Subprocess | `ControlObjectiveSubprocessScopesTab.tsx`؛ مالک Scope همچنان Subprocess |
| Risk Template → Controls | `RiskTemplateControlAssignmentsTab.tsx` → `ReferenceRelationTable` |
| Risk Template → Control Objectives | `RiskTemplateControlObjectiveAssignmentsTab.tsx` → `ReferenceRelationTable` |
| Control Objective → Controls | `ControlObjectiveControlAssignmentsTab.tsx` → `ReferenceRelationTable` |
| Requirement → Controls | `RequirementControlAssignmentsTab.tsx` → `ReferenceRelationTable` |
| Account Group → Controls | `AccountGroupControlsTab.tsx`؛ inverse classification |
| Account Group → Control Objectives | `AccountGroupControlObjectivesTab.tsx`؛ inverse classification |
| Subprocess → Account Groups | `SubprocessAccountGroupsTab.tsx`؛ projection deduplicated دو مسیر موجود؛ بدون persistence/draft تازه |
| Regulation → Requirements | `RegulationRequirementsTab.tsx`؛ فرزندان ساختاری واقعی، Excel آبی جای انتخاب و بدون View؛ lifecycle و CREATEهای Excel با `requirementChanges` در Save اصلی قانون ثبت می‌شوند |
| Risk/Control Objective/Requirement و چهار Policy reverse | `LocalReverseList.tsx`؛ جدول current کامل با Link سازمان و context/row، بدون Deleted/Restore/write |

تمام ۱۱ میزبان واقعی سقف `70vh`/`70dvh` و marker مشترک دارند: Organization، Process/Subprocess، Control/Group، Control توکار Process، Control Objective، Risk، Regulation، Policy، Account Group، Objective و Global Control. چند جدول یک تب بودجه را مشترک مصرف می‌کنند. جدول‌های hidden اندازهٔ صفر را baseline نمی‌کنند و ResizeObserver/visualViewport/cleanup در helper مشترک وجود دارد. header/footer در slot بومی می‌مانند.

Strategy فقط General/Documents دارد و Organizations picker/assignment برای آن mount یا خوانده نمی‌شود. Process صرفاً General/Documents دارد. Global Control Group تب تازه ندارد. Regulations غیرفعال Control، Risks غیرفعال Account Group و بخش‌های غیرفعال قبلی Risk بازفعال نشده‌اند. Coverage source/API/data/dependency حفظ و manager/inverse تازه‌ای mount نشده است. `DocumentManager`، temporary upload، نوع مستند، dirty/readiness و اسناد Local موجود قرارداد قبلی خود را حفظ کرده‌اند.

## Guard، قفل و transaction/Revision

تمام کلیدها با `Comparator` نام مرتب می‌شوند؛ ترتیب enum مبنا نیست. حفاظت زندهٔ پروفایل و قفل ADMINISTRATION پیش از business reads برقرار است. هیچ Guard جدید، قفل JVM/cache/table، retry خودکار یا REQUIRES_NEW اضافه نشده است.

| aggregate / entry point | کلیدهای hierarchy | قفل و مرز Revision |
| --- | --- | --- |
| Organization Create/Update | پایه ORGANIZATION؛ L1:+PROCESS؛ L2:+CONTROL/PROCESS؛ L3:+PROCESS/RISK؛ L4:+PROCESS؛ L5:+PROCESS/REGULATION؛ L6:+POLICY؛ L7:+POLICY/PROCESS؛ L8:+CONTROL/POLICY/PROCESS؛ L9:+POLICY/PROCESS/REGULATION؛ B1:+OBJECTIVE؛ union کامل قبل از hierarchy read | سازمان، Subprocessهای مرتب، Control → Risk Template → Control Objective → Requirement، سپس Policy/Objective/مرجع‌های Central Scope؛ بعد owner/pairهای typed. prepare کامل L1–L9/B1/O1 پیش از apply رابطه. CENTRAL سازمان+O1 owner-first؛ سپس LOCAL واحد L1–L9/B1 با causedBy؛ Documents همان outer transaction |
| Objective Create/Update | OBJECTIVE → ORGANIZATION | endpointهای سازمان/هدف و pairهای مرتب؛ یک CENTRAL و LOCAL جدا برای هر Organization واقعاً تغییریافته؛ یک outer transaction |
| Global Control Create/Update | GLOBAL_CONTROL → REGULATION | قفل مالک، Regulationهای مرتب و linkها؛ یک CENTRAL با G1 پس از مالک، اسناد و canonical مشترک |
| Subprocess Save | PROCESS و union موجود command/lock coordinator | چهار Scope typed، یک CENTRAL مالک؛ initialSubprocess در Create کنترل حفظ شده |
| Control Save | CONTROL؛ ACCOUNT_GROUP/RISK/REGULATION و initialSubprocess:+PROCESS حسب تغییر، با حفظ union بزرگ‌تر موجود | ترتیب endpoint مرکزی موجود؛ چهارچوب typed فعلی و owner-first CENTRAL |
| Control Objective Save | union موجود ACCOUNT_GROUP/RISK و lifecycle، بدون hierarchy جدید برای Control Objective | targeted owner lock، canonical classification/assignment و یک CENTRAL |
| Policy Save | POLICY و union موجود ORGANIZATION/PROCESS/CONTROL/REGULATION؛ کاهش داده نشده | چهار collection typed در CENTRAL همان مالک |
| Account Group parent Update | ACCOUNT_GROUP | source lock، parent/cycle/version/lifecycle، یک mutation نهایی و یک owner UPDATE Content+Documents |
| Risk Category parent Update | RISK | همان مرز transaction |
| Risk Template parent/status Update | CONTROL → RISK | union lifecycle موجود حفظ شده؛ یک source mutation/Revision |
| Regulation Group/Regulation parent Update | REGULATION | یک command، parentChange typed و یک Revision |
| Requirement parent/status Update | CONTROL → REGULATION | union lifecycle موجود حفظ شده؛ یک source mutation/Revision |
| Policy Group parent Update | POLICY | یک source mutation/Revision؛ بدون زنجیرهٔ Update/Move/Lifecycle |

CENTRAL header قبل از LOCAL ذخیره و flush می‌شود تا FK فوری `fk_masterdata_revision_caused` معتبر باشد. prepareها داخل callback محافظت‌شده انجام می‌شوند؛ LOCAL بعد از برگشت coordinator مرکزی، در همان outer transaction و با قفل‌های نگه‌داشته‌شده اعمال می‌شود. token اسناد به همان transaction وابسته و یک بار finalize می‌شود. هر خطای apply/finalize، منبع، O1، Local و هر دو Revision را rollback می‌کند. محتوای Central/Local مخلوط نمی‌شود و مجموعهٔ Local بی‌تغییر Revision تازه ندارد.

حذف‌های صریح Policy پیش از Scope و سپس Context اعمال می‌شوند؛ plan حذف typed، معافیت ناشی از UUID خانوادهٔ دیگر نمی‌سازد. وابستگی خارج از درخواست cascade نمی‌شود. eligibility با وضعیت نهایی Context/Scope همان plan و endpointهای زیرین بررسی می‌شود؛ DELETE وابسته با والدِ در حال حذف مجاز است و ساخت/فعال‌سازی زیر والدِ نهایی حذف‌شده رد می‌شود.

برای والدهای هفت Update زنجیره‌ای قبلی، `parentChange` حذف‌شده یعنی حفظ والد، object حاضر با ID null فقط برای نوع ریشه‌پذیر یعنی clear. status/sortOrder حذف‌شده حفظ می‌شوند و Browser bundled مقدار نهایی را صریح می‌فرستد. والدهای اجباری در UI/backend اجباری‌اند؛ Strategy ریشه، Objective زیر یک Strategy ریشهٔ non-DELETED و Control Objective مستقل است. inactive بودن والد Organization/Process/Strategy بی‌دلیل نامجاز نشده است.

## migration و بررسی مجاز

V1202 فقط دو جفت constraint مربوط به O1/G1 را تغییر می‌دهد: ACTIVE/INACTIVE/DELETED و deletion metadata فقط برای DELETED. هیچ مقدار داده، UUID/profile/version، uniqueness، جدول، stored Revision code یا تاریخچه عوض نمی‌شود. V1187/V1197/V1201 بازنویسی نشده‌اند؛ schema history/repair دستکاری نشده است. انتشار backend/UI هماهنگ با اعمال این migration لازم است؛ migration در این تحویل اجرا نشده است.

| فرمان | نتیجهٔ ثبت‌شده |
| --- | --- |
| `grcpc-app: .\mvnw.cmd -o -Dskip.ui=true -Dmaven.test.skip=true compile` | موفق؛ JDK 21 موجود، آفلاین، ۷۰۱ source؛ شامل اصلاح نهایی ترتیب FK و prepare/apply |
| `grcpc-ui: npm run typecheck` | موفق پس از اصلاح نهایی Import |
| `grcpc-ui: npm run lint` | موفق پس از اصلاح نهایی Import؛ بدون خطا یا هشدار |
| `git diff --check` | موفق پس از آخرین ویرایش مستندات |

هیچ test file ایجاد/ویرایش نشده و هیچ تست، MCP، browser/computer-use، سرویس خارجی، اجرای اپ، MinIO، DB، Flyway یا concurrency واقعی اجرا نشده است. compile/typecheck/lint و بازخوانی سورس، اثبات runtime UI، DDL Oracle یا هم‌زمانی واقعی نیستند. commit/deploy انجام نشده است.

جزئیات تکمیلی: [مرکزی و inverseها](governance-modal-relations-central-coverage.md)، [B1/G1/L1](governance-modal-relations-objective-global-coverage.md)، [والدها، میزبان‌ها و Import](governance-modal-parent-host-coverage.md).
