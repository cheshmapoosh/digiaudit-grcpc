# پوشش تب‌های روابط مرکزی و مالک سازمان — ۲۰۲۶-۱۰-۲۸

این گزارش بازخوانی سورس پیاده‌سازی است. آزمایش UI، تست خودکار، MCP، مرورگر، اجرای برنامه، Flyway، پایگاه‌داده، MinIO و هم‌زمانی واقعی اجرا نشده‌اند. نتیجهٔ نهایی فرمان‌های مجاز در گزارش اصلی تحویل ثبت می‌شود؛ بررسی ایستا اثبات رفتار runtime یا SQL Oracle نیست.

## قرارداد مشترک نمایش

`CatalogRelationTable` فقط renderer تایپ‌شده است: ستون‌های typed، `rowKey` پایدار، `TableSelectionMulti` در Edit و دامنهٔ select-all محدود به ردیف‌های نمایان. `CatalogRelationToolbar` فقط انتخاب/فعال‌سازی/غیرفعال‌سازی/حذف را عرضه می‌کند. `CatalogRelationDate` مقدار نامعتبر نمایان را در `PersianDatePicker` نگه می‌دارد و dirty/readiness را به مالک می‌رساند. `CatalogRelationStatus` از Information برای draft، Positive برای ACTIVE و None برای INACTIVE استفاده می‌کند. `CatalogTableViewport` و helper مشترک، بودجهٔ اندازه‌گیری‌شدهٔ مودال و اسکرول دو محور را تأمین می‌کنند.

state، baseline، تغییرات و payload در feature مربوط باقی مانده‌اند؛ backend عمومی Relation/Assignment/Scope ساخته نشده است. عملیات lifecycle روی new/restore تا Save اول نادیده گرفته می‌شود و حذف آنها draft را کنار می‌گذارد. بازگشت lifecycle و metadata به baseline هیچ change ایجاد نمی‌کند. انتخاب افزایشی است؛ uncheck در picker حذف ایجاد نمی‌کند. DELETE ذخیره‌شده در جدول نیست؛ pending DELETE تا Save آبی دیده می‌شود. ردیف دارای تاریخ dirty حتی هنگام جستجو/فیلتر پنهان نمی‌شود.

## خانواده‌های قابل ویرایش

مسیر UI زیر `grcpc-ui/src/features/` و نام DTO زیر backend همان feature است. تمام ردیف‌های جدول زیر در سورس پیاده‌سازی شده‌اند؛ هیچ‌کدام آزمون runtime نشده‌اند.

| ID | مالک Save و change field | فایل UI | DTO backend | canonical response |
| --- | --- | --- | --- | --- |
| S1 | Subprocess Create/Update؛ `controlScopeChanges` | `control-scope/components/SubprocessControlScopesTab.tsx` | `CentralControlScopeChangeRequest` | `controlScopes` پاسخ aggregate Process |
| S2 | Subprocess Create/Update؛ `riskScopeChanges` | `risk-scope/components/SubprocessRiskScopesTab.tsx` | `CentralRiskScopeChangeRequest` | `riskScopes` |
| S3 | Subprocess Create/Update؛ `controlObjectiveScopeChanges` | `control-objective-scope/components/SubprocessControlObjectiveScopesTab.tsx` | `CentralControlObjectiveScopeChangeRequest` | `controlObjectiveScopes` |
| S4 | Subprocess Create/Update؛ `requirementScopeChanges` | `requirement-scope/components/SubprocessRequirementScopesTab.tsx` | `CentralRequirementScopeChangeRequest` | `requirementScopes` |
| A1 | Control Save؛ `riskAssignments` | `risk-control-assignment/components/ControlRiskTemplateAssignmentsTab.tsx` | `CentralRiskControlAssignmentChangeRequest` | `riskAssignments` پاسخ Control |
| A2 | Control Objective Save؛ `riskAssignments` | `risk-control-objective-assignment/components/ControlObjectiveRiskTemplateAssignmentsTab.tsx` | `CentralRiskControlObjectiveAssignmentChangeRequest` | `riskAssignments` پاسخ Control Objective |
| A3 | Control Save؛ `controlObjectiveAssignments` | `control-control-objective-assignment/components/ControlControlObjectiveAssignmentsTab.tsx` | `CentralControlControlObjectiveAssignmentChangeRequest` | `controlObjectiveAssignments` |
| A4 | Control Save؛ `requirementAssignments` | `requirement-control-assignment/components/ControlRequirementAssignmentsTab.tsx` | `CentralRequirementControlAssignmentChangeRequest` | `requirementAssignments` |
| C1 | Control Save؛ `accountGroupChanges` | `control-account-group/components/ControlAccountGroupsTab.tsx` | `CentralControlAccountGroupChangeRequest` | `accountGroupClassifications` پاسخ Control |
| C2 | Control Objective Save؛ `accountGroupChanges` | `control-objective-account-group/components/ControlObjectiveAccountGroupsTab.tsx` | `CentralControlObjectiveAccountGroupChangeRequest` | `accountGroupClassifications` پاسخ Control Objective |
| P1 | Policy Save؛ `subprocessScopeChanges` | `policy/components/PolicyRelationTab.tsx` با `subprocess` | `CentralPolicyDtos.PolicySubprocessScopeChange` | `subprocessScopes` |
| P2 | Policy Save؛ `organizationScopeChanges` | همان، `organization` | `CentralPolicyDtos.PolicyOrganizationScopeChange` | `organizationScopes` |
| P3 | Policy Save؛ `controlScopeChanges` | همان، `control` | `CentralPolicyDtos.PolicyControlScopeChange`؛ مقصد exact `centralControlScopeId` | `controlScopes` |
| P4 | Policy Save؛ `requirementScopeChanges` | همان، `requirement` | `CentralPolicyDtos.PolicyRequirementScopeChange`؛ مقصد exact `centralRequirementScopeId` | `requirementScopes` |
| O1 | Organization Save؛ `ownerAssignments` | `organization/components/OrganizationOwnersTab.tsx` | `OrganizationOwnerChange` | `OrganizationOwnerView` شامل lifecycle، ID/version، نقش و eligibility مستقل |

چهار Scope از GET داخلی جدید `subprocesses/{id}/{control,risk,control-objective,requirement}-scopes/deleted` برای occupied-pair lookup استفاده می‌کنند. همان مجوز view و profile predicate فعلی حفظ شده است؛ endpoint عادی DELETED را نمی‌پذیرد. A/C و Policy از deleted read موجود استفاده می‌کنند. وضعیت DELETED در mapper baseline به ACTIVE تبدیل نمی‌شود. Restore همراه metadata از CREATE_OR_RESTORE همان خانواده و metadata واقعی baseline استفاده می‌کند؛ سرور occupied pair و ID قبلی را برمی‌گرداند. شکل Context به payload سایر خانواده‌ها منتقل نشده است.

O1 picker تخت چندانتخابی native UI5 و فقط برای مدیر مجاز است؛ وضعیت رابطه از eligibility و role جداست. نمایش INACTIVE مالکیت مؤثر ایجاد نمی‌کند. جدول ناشناخته یا گزینهٔ بدون label را با UUID به عنوان نام قابل قبول تکمیل نمی‌کند. deleted lookup از `/api/master-data/organizations/{id}/owner-assignments/deleted` دریافت می‌شود.

## پوشش فقط‌خواندنی

| سطح | renderer و رفتار نهایی سورس |
| --- | --- |
| Control → Subprocess | `control-scope/components/ControlSubprocessScopesTab.tsx`؛ جدول مشترک، Link به Subprocess، status/اعتبار، جستجو و فیلتر سه‌گزینه‌ای؛ mutation ندارد. |
| Control Objective → Subprocess | `control-objective-scope/components/ControlObjectiveSubprocessScopesTab.tsx`؛ همان نمایش فقط‌خواندنی؛ Scope مالک Subprocess می‌ماند. |
| Risk Template → Controls | `RiskTemplateControlAssignmentsTab.tsx` → `ReferenceRelationTable`؛ Link مالک Control، وضعیت/اعتبار endpoint مستقل از رابطه. |
| Risk Template → Control Objectives | `RiskTemplateControlObjectiveAssignmentsTab.tsx` → `ReferenceRelationTable`؛ Link مالک Control Objective. |
| Control Objective → Controls | `ControlObjectiveControlAssignmentsTab.tsx` → `ReferenceRelationTable`؛ مالک Control است. |
| Requirement → Controls | `RequirementControlAssignmentsTab.tsx` → `ReferenceRelationTable`؛ مالک Control است. |
| Account Group → Controls | `control-account-group/components/AccountGroupControlsTab.tsx`؛ Link مجاز Control، status/اعتبار رابطه و فیلتر/اسکرول مشترک. |
| Account Group → Control Objectives | `control-objective-account-group/components/AccountGroupControlObjectivesTab.tsx`؛ Link مجاز Control Objective، status/اعتبار رابطه. |
| Subprocess → Account Groups | `control-account-group/components/SubprocessAccountGroupsTab.tsx`؛ projection deduplicated API موجود؛ هر دو مسیر Control/Control Objective و statusهای Scope/classification حفظ شده‌اند. persistence و draft مستقیم ندارد. |
| Local reverseها در Risk/Control Objective/Requirement/Policy | `local-master-data/components/LocalReverseList.tsx`؛ همهٔ صفحات current خوانده می‌شوند، جدول UI5 با Link سازمان و context/row deep link، وضعیت و اعتبار؛ DELETED و restore/refresh دائمی ندارد. |
| Regulation → Requirements | `RegulationRequirementsTab.tsx` توسط host ساختاری تنظیم شده؛ فرزند واقعی Requirement است و به Assignment تبدیل نشده است. طبق اصلاح صریح جدید مالک، Import مستقل در toolbar همان تب الزام‌های مودال قانون باقی می‌ماند؛ guard/مجوز و تازه‌سازی همان قانون/تب حفظ می‌شوند. |

هیچ Coverage manager/inverse جدیدی mount نشده است. فایل‌ها، APIها، داده و dependencyهای Coverage نگهداری شده‌اند. `PolicyReferenceView` دارای marker/سقف مودال مشترک است و ObjectPageهای داخلی با مجوزهای فقط‌خواندنی باز می‌شوند.

## Guard و transaction

S1–S4 در Save ساختاری Subprocess زیر PROCESS و union فعلی command/lock coordinator هستند. A1/A3/A4 در Control Save از CONTROL و در صورت نیاز RISK/REGULATION/ACCOUNT_GROUP استفاده می‌کنند؛ `initialSubprocess` موجود PROCESS را اضافه می‌کند. A2/C2 در Control Objective Save از union فعلی RISK/ACCOUNT_GROUP و targeted row lock استفاده می‌کنند؛ Guard تازه‌ای به نام OBJECTIVE یا CONTROL_OBJECTIVE اضافه نشده است. Policy Save از POLICY و union فعلی کلیدهای Organization/Process/Control/Regulation استفاده می‌کند. O1 زیر ORGANIZATION و ADMINISTRATION فعلی است.

Guardها با نام و ترتیب لغوی، پیش از hierarchy/eligibility/dependency read، داخل transaction protected مالک گرفته می‌شوند. ترتیب endpoint مرکزی موجود Control → Risk Template → Control Objective → Requirement و سپس ID حفظ شده است. S/A/C/P همان DTO و aggregateهای typed موجود، owner version و CENTRAL Revision واحد را حفظ می‌کنند. چهار deleted GET فقط read-only هستند و Guard یا Revision ایجاد نمی‌کنند.

در بازخوانی و تکمیل Organization Local، `OrganizationLocalDeletions` مجموعه‌های حذف را به تفکیک خانواده نگه می‌دارد؛ UUID متعلق به خانوادهٔ دیگر معافیت dependency نمی‌سازد. prepareهای هشت سرویس، metadata نرمال‌شدهٔ نهایی را داخل plan typed حمل می‌کنند تا validation، no-op و apply دقیقاً یک مقدار را ببینند. حذف صریح Policy → Scope → Context در همان درخواست مجاز است؛ reference به parent با final DELETED فقط برای DELETE dependent پذیرفته می‌شود. Coverage خارج از درخواست همچنان مانع حذف است. LOCAL Revision واحد و CENTRAL مالک در یک outer transaction و commit/rollback باقی می‌مانند.

در فاز endpointهای Organization، چهار helper مشخص lockAggregateReferences در سرویس‌های Local Control/Risk/Control Objective/Requirement، IDهای Central Scope ارسال‌شده و reference immutable رکورد Local موجود را جمع می‌کنند و پیش از owner/context/relation rows با ترتیب ID قفل می‌گیرند. prepare فقط همین قفل‌های ازپیش‌گرفته‌شده را دوباره مطالبه می‌کند؛ endpoint تازه‌ای پس از relation lock اضافه نمی‌شود.

در L7/L8/L9، prepare علاوه بر وضعیت Policy و target، وضعیت Subprocess، Context نهایی برنامه‌ریزی‌شده و در L8/L9 تعریف Control/Requirement را بررسی می‌کند. Context و Scope تازه از plan همان aggregate تأمین می‌شوند؛ قبل از persist به lookup رکورد هنوز ذخیره‌نشده وابسته نیستند. Create/restore/reactivate به endpointهای ACTIVE نیاز دارند، تغییر metadata و غیرفعال‌سازی non-DELETED را می‌پذیرند و DELETE وابسته می‌تواند همراه حذف صریح والد اعمال شود. همهٔ اینها بازخوانی ایستای سورس است.
