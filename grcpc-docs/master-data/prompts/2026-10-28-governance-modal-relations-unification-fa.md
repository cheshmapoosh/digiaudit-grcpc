# پرامپت اجرایی Codex: یکسان‌سازی تب‌های مودال‌های حاکمیت و کنترل

تاریخ بررسی سورس: ۲۰۲۶-۱۰-۲۸. مبنای Git: `f5fb950` به‌علاوهٔ تغییرات موجود و ثبت‌نشدهٔ workspace در زمان این بررسی. این فایل دستور **پیاده‌سازی** است؛ در مرحلهٔ تهیهٔ آن فقط سورس و مستندات بررسی شده‌اند و کد برنامه تغییر نکرده است.

## ۱. دستور اجرا و حدود اختیار

کار را مطابق تصمیم‌های بسته‌شدهٔ این سند پیاده‌سازی کن؛ به ارائهٔ طرح، پرسیدن دوبارهٔ موارد تأییدشده یا اصلاح ظاهری چند تب اکتفا نکن. فایل‌های معرفی‌شده را برای اجرای دقیق و تطبیق وضعیت جاری بخوان؛ بازتحلیل دامنه و بازطراحی مدل کسب‌وکار لازم نیست. اگر سورس بعد از این بررسی تغییر کرده، تغییر مرتبط را با تصمیم‌های این سند تطبیق بده؛ تغییرات کاربر را بازنویسی نکن.

مالک پروژه هشت خواستهٔ زیر و سپس پنج تکمیل بند ۲ را صریحاً تأیید کرده است:

1. حذف دکمه‌های اضافی تب‌های رابطه.
2. نمایش آیتم‌های انتخاب‌شده در جدول UI5.
3. انتخاب، فعال‌سازی، غیرفعال‌سازی و حذف نرم رابطه؛ انتخاب دوبارهٔ رابطهٔ حذف‌شده، همان رکورد را فعال کند؛ حذف‌شدهٔ ذخیره‌شده دیده نشود.
4. اصلاح فیلتر وضعیت فهرست.
5. عملیات گروهی فقط روی ردیف‌هایی اثر بگذارد که وضعیتشان واقعاً تغییر می‌کند. عنوان‌های آبی: «پیش‌نویس فعال»، «پیش‌نویس غیرفعال»، «پیش‌نویس حذف».
6. حداکثر ارتفاع مودال ۷۰٪ ارتفاع viewport؛ جدول پرردیف داخل کادر اسکرول عمودی و افقی باشد.
7. حذف والد فقط برای نوع‌هایی که می‌توانند ریشه باشند. انتخاب والد آبی و حذف والد قرمز با حالت‌های استاندارد UI5. قانون، الزام و هدف، ریشه نمی‌شوند؛ استراتژی همیشه ریشه است.
8. جدول رابطه ویرایش/ذخیرهٔ مستقل ندارد؛ ویرایش و ذخیرهٔ اصلی مودال مالک تمام draftهای قابل‌ویرایش آن مودال است.

دامنه: کاتالوگ‌های حاکمیت و کنترل، شامل Organization، Process/Subprocess، Control Group/Control، Control Objective، Risk Category/Template، Regulation Group/Regulation/Requirement، Policy Group/Policy، Account Group، Strategy/Objective، Global Control Group/Global Control؛ همراه با value helpها، نمایش‌های معکوس و جدول‌های وابستهٔ فعال این مودال‌ها. کاربران، نقش‌ها، پروفایل و انواع دادهٔ اولیه خارج از دامنه‌اند.

**تب مستندات از تغییر UX و منطق آن مستثناست.** `DocumentManager`، temporary upload، فیلد نوع مستند، dirty/readiness و finalize روی Save اصلی را حفظ کن. محدودیت کلی ارتفاع مودال می‌تواند بر ظرف آن اعمال شود؛ کنترل‌ها و قرارداد مستندات را بازنویسی نکن. حذف دکمهٔ ذخیره از فرم والد یا از پنجرهٔ انتخاب به معنای حذف تأیید انتخاب نیست.

**ممنوعیت اجرا:** تست ایجاد/ویرایش/اجرا نکن. هیچ MCP، مرورگر، computer-use، سرویس خارجی، اتصال پایگاه‌داده، MinIO، اجرای برنامه یا Flyway استفاده نکن. تست هم‌زمانی واقعی و آزمون UI نیز اجرا نکن. ابزار محلی فایل و shell برای ویرایش و بررسی ایستا مجاز است. `dist` و build output را دستی تغییر نده؛ migration اعمال‌شده را بازنویسی نکن؛ repair و دستکاری schema history ممنوع است. کاربر درخواست commit/deploy نکرده است.

## ۲. پنج تکمیل تأییدشده

- Edit و Save، تب جاری را نگه می‌دارند. تعویض تب پیش‌نویس را از بین نمی‌برد. بستن مودال، ترک صفحه و unload محافظ تغییرات ذخیره‌نشده دارند. Cancel اصلی پس از تأیید صرف‌نظر، draft را کنار می‌گذارد و نوشتن دیتابیس ندارد.
- انتخاب با SearchDialog چندانتخابی انجام می‌شود. مقصد درختی با اجدادش دیده می‌شود و فقط نوع برگ مجاز انتخاب می‌شود. انتخاب تکراری ممنوع است. بازیابی از انتخاب دوباره و با همان ID رابطه انجام می‌شود.
- یک Save اصلی، تمام تغییرات قابل‌ویرایش مودال را اتمیک ثبت می‌کند. خطا draftها را نگه می‌دارد. حذف انتخاب تازه‌ای که هنوز ذخیره نشده، صرفاً draft را حذف می‌کند.
- inverseها و projectionهای محاسباتی فقط‌خواندنی می‌مانند؛ مالک رابطه، مجوزها و metadata تخصصی حفظ می‌شوند. تب عمومی همچنان فرم است. Coverageهای حذف‌شده از UI برنمی‌گردند.
- رکوردی که در دیتابیس `DELETED` است در جدول اصلی دیده نمی‌شود. ردیف `پیش‌نویس حذف` هنوز حذف ثبت‌شده نیست؛ تا Save آبی دیده می‌شود و پس از Save از جدول خارج می‌شود. در هیچ جدول اصلی فیلتر/دکمهٔ Restore یا نمایش سطل حذف‌شده نداریم.

## ۳. مراجع و اختصار مسیرها

در ادامه:

| اختصار | ریشهٔ واقعی |
| --- | --- |
| `U/` | `grcpc-ui/src/` |
| `A/` | `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/` |
| `M/` | `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/masterdata/` |
| `D/` | `grcpc-docs/master-data/` |
| `SQL/` | `grcpc-app/src/main/resources/db/migration/oracle/` |

`AGENTS.md` ریشه، `grcpc-ui/AGENTS.md`، `grcpc-app/AGENTS.md`، `grcpc-ui/UI5_COMPONENT_GUIDE.md` و AGENTSهای featureهای درگیر را رعایت کن. این درخواست، فقط بندهای ناسازگار با UX/ذخیرهٔ جدید را جایگزین می‌کند؛ محدودیت مدل، امنیت، Guard و تاریخچه حفظ می‌شود. توصیهٔ قدیمی اجرای test در بعضی AGENTSها با ممنوعیت صریح این دستور کنار گذاشته می‌شود.

مراجع تصمیم:

- `D/accepted-corrections/2026-10-28-organization-subprocess-selection.md`: مبنای draft table و ذخیرهٔ اتمیک Organization.
- `D/accepted-corrections/2026-10-27-central-reference-assignments.md`: مالکیت چهار Assignment مستقیم، inverse و ترتیب قفل.
- `D/accepted-corrections/2026-10-28-organization-owner-assignments.md`: مجوز و صلاحیت مالکان؛ در این کار سه‌حالته شدن lifecycle آن توسعه می‌یابد.
- `D/accepted-corrections/2026-10-28-objective-strategy-corrections.md`: Strategy ریشه و Objective زیر یک Strategy ریشه؛ انتخاب چندهدف در این تحویل جایگزین محدودیت تک‌انتخاب قبلی در picker رابطه می‌شود.
- `D/accepted-corrections/2026-10-28-subprocess-control-creation.md`: نمایش Control Scope در درخت فرآیند و Create اتمیک Control از Subprocess حفظ شود.
- `D/accepted-corrections/2026-10-28-main-catalog-display-order.md`: DnD فقط روی درخت‌های اصلی؛ هیچ provider ترتیب نمایشی در مودال، picker یا تب رابطه mount نشود.
- `D/implementation-contract.md`، `D/table-catalog.md`، `D/api-conventions.md`، `D/hierarchy-guard-row-contract.md` و `grcpc-docs/architecture/decisions/ADR-0001-database-hierarchy-guard-row.md`.

تغییرات ثبت‌نشدهٔ موجود شامل کارهای قبلی همین محصول است. `git reset/clean`، برگرداندن جمعی فایل‌ها، تغییر migration قدیمی و جایگزینی سورس با HEAD مجاز نیست. کد فعال `M/catalog/...` را با ماژول‌های legacy هم‌نام اشتباه نگیر.

## ۴. نقشهٔ کامل مودال‌ها و تب‌ها

مسیرهای جدول زیر نسبت به `U/features/` هستند. «نمایشی» شامل جدول، وضعیت، فیلتر و اسکرول است؛ مجوز نوشتن اضافه نمی‌کند.

| مودال / ObjectPage | تب‌ها و تصمیم قطعی |
| --- | --- |
| `organization/pages/OrganizationObjectPage.tsx` | عمومی فرم؛ زیرفرآیند draft موجود؛ ریسک، کنترل، الزام، هدف کنترل و چهار بخش سیاست Local به draft اصلی متصل شوند؛ اهداف کسب‌وکار به Save اصلی متصل شود؛ مالکان draft با سه lifecycle؛ مستندات حفظ شود. |
| `process/pages/ProcessObjectPage.tsx` با `PROCESS` | فقط عمومی و مستندات؛ جدول رابطهٔ جدید نساز. |
| همان با `SUBPROCESS` | Controls، Requirements، Control Objectives، Risk Templates چهار Scope مالک‌دار قابل‌ویرایش؛ Account Groups projection محاسباتی؛ مستندات حفظ شود. |
| `control/pages/CentralControlGroupObjectPage.tsx` | عمومی و مستندات؛ فقط parent و حفظ تب/ارتفاع. |
| `control/pages/CentralControlObjectPage.tsx` | Subprocesses inverse؛ Requirements، Risks، Control Objectives سه Assignment مالک Control؛ Account Groups classification مالک Control؛ Regulations غیرفعال فعلی باقی بماند؛ عمومی/مستندات حفظ شوند. |
| `control-objective/pages/CentralControlObjectiveObjectPage.tsx` | Subprocesses inverse؛ Risks Assignment مالک Control Objective؛ Controls inverse؛ Account Groups classification مالک Control Objective؛ نمایش‌های Local پایین بدنه نیز فقط‌خواندنی؛ عمومی/مستندات حفظ شوند. |
| `risk/pages/CentralRiskObjectPage.tsx` با category | عمومی و مستندات؛ parent اختیاری. |
| همان با template | عمومی؛ Risk غیرفعال فعلی؛ Control Center شامل دو inverse مستقل Controls و Control Objectives؛ LocalReverseList پایین بدنه نمایشی؛ مستندات حفظ شود. |
| `regulation/pages/CentralRegulationObjectPage.tsx` با GROUP | عمومی و مستندات؛ parent اختیاری. |
| همان با REGULATION | عمومی؛ Requirements فرزندان ساختاری، نه Assignment؛ مستندات. بند ۱۰ رفتار import را مشخص می‌کند. |
| همان با REQUIREMENT | عمومی؛ Controls inverse؛ LocalReverseList مربوط به requirement scope نمایشی؛ مستندات. |
| `policy/pages/CentralPolicyObjectPage.tsx` با GROUP | عمومی و مستندات؛ parent اختیاری. |
| همان با POLICY | چهار collection مالک Policy: Subprocess، Organization، Control Scope، Requirement Scope؛ چهار LocalReverseList پایین بدنه فقط‌خواندنی؛ عمومی/مستندات حفظ شوند. |
| `account-group/pages/CentralAccountGroupObjectPage.tsx` | عمومی؛ Controls و Control Objectives دو inverse classification؛ Risks غیرفعال باقی بماند؛ مستندات حفظ شود. |
| `objective/pages/ObjectiveManagementPage.tsx` با STRATEGY | فقط عمومی و مستندات؛ هیچ Organization picker/assignment بارگذاری یا mount نشود؛ هیچ parent قابل انتخاب نیست. |
| همان با OBJECTIVE | عمومی؛ Organizations رابطهٔ موجود `organization_objective`، قابل‌ویرایش با draft صریح؛ مستندات حفظ شود. همان رابطه از Organization نیز مدیریت می‌شود؛ جدول دوم یا کپی معکوس نساز. |
| `global-control/pages/GlobalControlManagementPage.tsx` با Group | عمومی موجود؛ parent اختیاری. تب کسب‌وکاری/مستندات جدید اختراع نکن. |
| همان با Global Control | عمومی؛ Regulations رابطهٔ موجود با draft سه‌حالته؛ مستندات حفظ شود. |

مودال Control از صفحهٔ Process هم باز می‌شود: `U/features/control/components/CentralControlDialog.tsx`. تغییرات همان ObjectPage و حفاظت draft در این مسیر هم اعمال شود و قرارداد `initialSubprocess` از بین نرود. پنجره‌های نمایش تعریف مرکزی که در Scopeها باز می‌شوند فقط‌خواندنی‌اند؛ جدول رابطه داخل آنها به مالکیت غلط تبدیل نشود.

دو کامپوننت `U/features/central-catalog/components/DefinitionObjectPage.tsx` و `CatalogObjectDialog.tsx` در ممیزی، مصرف‌کنندهٔ فعال JSX نداشتند؛ برای پوشش مودال‌های واقعی، تغییر این فایل‌های عمومیِ بدون مصرف کافی نیست. مسیرهای واقعی از `central-catalog/routes.tsx` به featureهای بالا می‌روند.

## ۵. فهرست قطعی ۲۶ خانوادهٔ رابطهٔ قابل‌نوشتن

در ستون UI، مسیر از `U/features/` است. B1 فقط‌خواندنیِ معکوس نیست: زوج Objective–Organization عمداً از هر دو مودال فعلی مدیریت می‌شود و باید یک رکورد مشترک داشته باشد.

| ID | زوج / collection | UI فعلی و اقدام |
| --- | --- | --- |
| L1 | Organization–Subprocess Local Context | `local-master-data/components/OrganizationSubprocessTable.tsx`؛ مبنا، با renderer/viewport مشترک جدید تطبیق داده شود. |
| L2 | Context–Local Control | `local-master-data/components/LocalSectionPane.tsx`، spec `control-scopes`؛ فرم و Save مستقل به جدول draft سازمان تبدیل شود. |
| L3 | Context–Local Risk Template | همان، `risk-scopes`. |
| L4 | Context–Local Control Objective | همان، `control-objective-scopes`. |
| L5 | Context–Local Requirement | همان، `requirement-scopes`. |
| L6 | Organization–Local Policy | همان، `organization-policies`؛ `scopeAction` و `propagationMode` حفظ شوند. |
| L7 | Context–Local Policy | همان، `context-policies`. |
| L8 | Local Control Scope–Local Policy | همان، `control-policies`؛ target دقیق Local Scope حفظ شود. |
| L9 | Local Requirement Scope–Local Policy | همان، `requirement-policies`؛ target دقیق Local Scope حفظ شود. |
| B1 | Organization–Business Objective | `objective/components/OrganizationObjectivesTab.tsx` و تب Organizations در `ObjectiveManagementPage.tsx`؛ دو surface و یک خانوادهٔ داده. |
| O1 | Organization–User Owner Assignment | `organization/components/OrganizationOwnersTab.tsx`؛ افزودن → «انتخاب»، حذف row Undo، lifecycle سه‌حالته، eligibility جدا از lifecycle. |
| S1 | Central Subprocess–Control Scope | `control-scope/components/SubprocessControlScopesTab.tsx`. |
| S2 | Central Subprocess–Risk Scope | `risk-scope/components/SubprocessRiskScopesTab.tsx`. |
| S3 | Central Subprocess–Control Objective Scope | `control-objective-scope/components/SubprocessControlObjectiveScopesTab.tsx`. |
| S4 | Central Subprocess–Requirement Scope | `requirement-scope/components/SubprocessRequirementScopesTab.tsx`. |
| A1 | Control–Risk Template Assignment | `risk-control-assignment/components/ControlRiskTemplateAssignmentsTab.tsx`. |
| A2 | Control Objective–Risk Template Assignment | `risk-control-objective-assignment/components/ControlObjectiveRiskTemplateAssignmentsTab.tsx`. |
| A3 | Control–Control Objective Assignment | `control-control-objective-assignment/components/ControlControlObjectiveAssignmentsTab.tsx`. |
| A4 | Control–Requirement Assignment | `requirement-control-assignment/components/ControlRequirementAssignmentsTab.tsx`. |
| C1 | Control–Account Group classification | `control-account-group/components/ControlAccountGroupsTab.tsx`. |
| C2 | Control Objective–Account Group classification | `control-objective-account-group/components/ControlObjectiveAccountGroupsTab.tsx`. |
| P1 | Policy–Subprocess Scope | `policy/components/PolicyRelationTab.tsx` با kind `subprocess`. |
| P2 | Policy–Organization Scope | همان با kind `organization`. |
| P3 | Policy–exact Central Control Scope | همان با kind `control`؛ ID مقصد `centralControlScopeId` است، نه `controlId`. |
| P4 | Policy–exact Central Requirement Scope | همان با kind `requirement`؛ ID مقصد `centralRequirementScopeId` است، نه `requirementId`. |
| G1 | Global Control–Regulation | `global-control/pages/GlobalControlManagementPage.tsx`، regulationPanel؛ از `regulationIds` به changeهای صریح تبدیل شود. |

L2–L9 را فقط با مخفی کردن footer `LocalSectionPane` اصلاح نکن؛ state و API فعلی آن هنوز write فوری دارند. `LocalOrganizationWorkspace.tsx` و `domain/local.sections.ts` منبع mapping هستند. specهای `*-coverages` عمداً خارج از FORM_SECTIONS هستند و خارج می‌مانند.

S1–S4، A1–A4، C1–C2 و P1–P4 از قبل draftهای aggregate دارند؛ آنها را دوباره با command/framework عمومی ننویس. مشکل فعلی عمدتاً renderer، ActionSheet/ویرایش ردیفی، picker، فیلتر، وضعیت، چندانتخابی و حفاظت pending است. readهای deleted برای بازیابی داخلی حفظ شوند ولی در جدول اصلی نمایش داده نشوند.

## ۶. inverse، projection و فرزندان ساختاری

این موارد فقط renderer/وضعیت/فیلتر/اسکرول می‌گیرند؛ checkbox عملیاتی، Select، Activate، Inactivate، Delete یا change set ندارند:

| فایل / سطح | مالک واقعی یا منبع |
| --- | --- |
| `U/features/control-scope/components/ControlSubprocessScopesTab.tsx` | مالک Scope، Subprocess است. |
| `U/features/control-objective-scope/components/ControlObjectiveSubprocessScopesTab.tsx` | مالک Scope، Subprocess است. |
| `U/features/risk-control-assignment/components/RiskTemplateControlAssignmentsTab.tsx` | مالک Assignment، Control است. |
| `U/features/risk-control-objective-assignment/components/RiskTemplateControlObjectiveAssignmentsTab.tsx` | مالک Assignment، Control Objective است. |
| `U/features/control-control-objective-assignment/components/ControlObjectiveControlAssignmentsTab.tsx` | مالک Assignment، Control است. |
| `U/features/requirement-control-assignment/components/RequirementControlAssignmentsTab.tsx` | مالک Assignment، Control است. |
| `U/features/control-account-group/components/AccountGroupControlsTab.tsx` | مالک classification، Control است. |
| `U/features/control-objective-account-group/components/AccountGroupControlObjectivesTab.tsx` | مالک classification، Control Objective است. |
| `U/features/control-account-group/components/SubprocessAccountGroupsTab.tsx` | union دقیق و deduplicated دو مسیر Control Scope/classification و Control Objective Scope/classification؛ هیچ persistence/draft مستقیم برای Subprocess نساز. |
| `U/features/regulation/components/RegulationRequirementsTab.tsx` | فرزند ساختاری Requirement زیر Regulation؛ بند ۱۰. |
| `U/features/local-master-data/components/LocalReverseList.tsx` | projectionهای Local زیر Risk Template، Control Objective، Requirement و چهار نوع Policy؛ در حال حاضر لیست متنی، فیلتر DELETED و دکمهٔ بازکردن دارد؛ جدول فقط‌خواندنی با Link مالک سازمان و فیلتر بدون DELETED شود. |

`U/shared/components/ReferenceRelationTable.tsx` renderer مشترک چهار inverse Assignment است؛ حداقل اسکرول/فیلتر/ستون‌های آن را در همان مسیر اصلاح کن. ستون وضعیت مقصد و وضعیت رابطه مستقل بمانند. وضعیت غیرفعال endpoint را با غیرفعال بودن رابطه یکی نکن.

`CoverageInverseTable.tsx` و `TypedCoverageSection.tsx` را به این بهانه در ObjectPageها mount نکن. کدهای Coverage نگهداری‌شده، APIها، داده و dependency check آنها حذف یا تبدیل نشود.

## ۷. جدول والد و ریشه؛ بدون تصمیم مجدد

| نوع | والد معتبر | حذف والد؟ | Guard ساختاری |
| --- | --- | --- | --- |
| Organization | Organization همان پروفایل | بله، ریشه مجاز | ORGANIZATION |
| Process | Process همان پروفایل | بله | PROCESS |
| Subprocess | دقیقاً یک Process | خیر | PROCESS |
| Central Control Group | Central Control Group | بله | CONTROL |
| Central Control | Control Group | خیر؛ قبلی‌های بدون گروه فقط قابل خواندن بمانند، Save باید گروه معتبر داشته باشد | CONTROL |
| Central Control Objective | کاتالوگ مستقل | والد/حذف والد ندارد | Guard تازه با نام OBJECTIVE برای آن نساز |
| Risk Category | Risk Category | بله | RISK |
| Risk Template | Risk Category | خیر | RISK |
| Regulation Group | Regulation Group | بله | REGULATION |
| Regulation | Regulation Group | خیر | REGULATION |
| Regulation Requirement | Regulation | خیر | REGULATION |
| Policy Group | Policy Group | بله | POLICY |
| Policy | Policy Group | خیر | POLICY |
| Account Group | Account Group | بله | ACCOUNT_GROUP |
| Strategy | هیچ؛ همیشه ریشه | picker/clear ندارد | OBJECTIVE |
| Business Objective | دقیقاً یک Strategy ریشه و حذف‌نشده | خیر | OBJECTIVE |
| Global Control Group (`control_group`) | Global Control Group | بله | GLOBAL_CONTROL |
| Global Control | Global Control Group | خیر | GLOBAL_CONTROL |

فیلتر self و descendants و صلاحیت parent فعلی هر catalog حفظ شود. تبدیل انتخاب رابطه به چندانتخابی، parent/owner ساختاری را چندانتخابی نمی‌کند. در Organization، Process و Strategy/Objective، INACTIVE بودن والد طبق قرارداد ساختاری مجاز است؛ برای یکدستی ظاهری، آن را بی‌دلیل ACTIVE-only نکن.

`U/shared/components/CatalogParentHeader.tsx` مبنای مشترک است: `required` و `standalone`، نمایش root/unavailable و permission حفظ شوند. `selection` در ObjectPageهای بالا با `CatalogActionButton design="Emphasized"` ساخته شود. clear با `design="Negative"` فقط هنگام parent اختیاریِ موجود و حالت Edit/Create نشان داده شود؛ busy آن را غیرفعال کند. رنگ سفارشی/CSS روی theme نگذار. «انتخاب نشده» در parent اجباری، root واقعی نیست و Save را نامعتبر می‌کند. انتخاب null برای parent اختیاری صرفاً draft است، نه درخواست Move فوری.

Pickerهای والد موجود را تطبیق بده: Organization `ParentValueHelpDialog.tsx`، Process `ProcessParentValueHelpDialog.tsx`، Control `ControlGroupValueHelpDialog.tsx`، Risk `RiskCategoryValueHelpDialog.tsx`، Regulation `RegulationParentValueHelpDialog.tsx`، Policy `PolicyParentValueHelpDialog.tsx`، Account Group `AccountGroupParentValueHelpDialog.tsx` و pickerهای inline در صفحات Objective/Global Control. دکمهٔ clear داخل picker نیز قرمز و تابع همین شرط باشد.

## ۸. قرارداد مشترک UI و state

### ۸.۱. دکمه‌ها و جدول

در tab قابل‌ویرایش فقط toolbar جمعی `انتخاب`، `فعال‌سازی`، `غیرفعال‌سازی` و `حذف` قرار بده. Select آبی `Emphasized`، Delete قرمز `Negative`، دو lifecycle با design عادی UI5. همه `CatalogActionButton` با عرض مشترک فعلی باشند. در View، toolbar نوشتن و checkbox عملیاتی نمایش داده نشود. جستجو و فیلتر وضعیت ابزار مشاهده‌اند و می‌توانند در View باقی بمانند. retry فقط هنگام خطای دریافت مجاز است؛ refresh دائمی اضافه نکن.

حذف کن: «ایجاد ردیف»، Save/Edit/Cancel مستقل تب، دکمهٔ Restore، Undo/بازگردانی هر ردیف و ActionSheetی که همان عملیات جمعی را تکرار می‌کند. دکمهٔ «مشاهده» را با Link مجاز مقصد در سلول جایگزین کن؛ لینک، صلاحیت مشاهده و محافظ ترک draft را رعایت کند. جدول چندانتخابی با `TableSelectionMulti` و rowKey پایدار است؛ از checkbox HTML یا انتخاب تک‌ردیفی برای batch استفاده نکن.

حداقل ستون‌ها کد، نام و وضعیت **رابطه** است. ستون‌های تخصصی فعلی حذف نشوند. در owners، username شناسهٔ معنادار کاربر و displayLabel نام است؛ برای رسیدن مصنوعی به ستون کد، UUID نشان نده. نقش و eligibility کاربر ستون‌های جدا از lifecycle Assignment هستند. کد و نام مقصد مرکزی در جدول رابطه قابل ویرایش نیستند.

برای ویرایش metadata، در حالت Edit اصلی از UI5 Input/Select/PersianDatePicker/TextArea داخل ردیف یا پنل وابستهٔ بدون دکمهٔ Save مستقل استفاده کن؛ تغییر فوراً وارد draft مالک شود. دیگر به `*ScopeEditorDialog` و `*ValidityDialog` با Edit/Save جدا متکی نباش. تاریخ نامعتبرِ قابل‌مشاهده باید باقی بماند، dirty شود و Save اصلی را مسدود کند. دکمهٔ تأیید SearchDialog فقط «انتخاب» است و write دیتابیس ندارد.

metadata قابل حفظ و ویرایش:

| خانواده | فیلدهای تخصصی |
| --- | --- |
| S1 | recommendedFrequencyCode، recommendedExecutionMethodCode، recommendedTestMethodCode، validFrom/validTo |
| S2–S4، A1–A4، C1–C2 و P1–P4 | validFrom/validTo و status رابطه؛ ستون‌های endpoint/context فعلی حفظ شوند. |
| L2 | actualOwnerId، frequencyCode، executionMethodCode، testMethodCode، localContextNote، validFrom/validTo |
| L3–L5 | validFrom/validTo؛ sourceType و exact Central reference هویت رابطه‌اند و با lifecycle عوض نمی‌شوند. |
| L6 | scopeAction، propagationMode، validFrom/validTo |
| L7–L9 | scopeAction، validFrom/validTo |
| B1 | نام محلی name، description، owner متنی فعلی، validFrom/validTo؛ این owner را با Owners سازمان جایگزین نکن. |
| O1 و G1 | lifecycle و هویت؛ تاریخ اعتبار/فیلد کسب‌وکاری تازه برای آنها نساز. |

### ۸.۲. ماشین حالت و عملیات گروهی

هر ردیف baseline canonical، ID/version رابطه، هویت زوج و metadata اولیه دارد. draft UI را از lifecycle دیتابیس جدا نگه دار. برای خانواده‌های typed فعلی آداپتر بساز؛ enum و payload همهٔ آنها را به زور یکسان نکن.

| حالت اولیه / عمل | نتیجهٔ لازم |
| --- | --- |
| زوج موجود نیست + انتخاب | یک draft جدید ACTIVE در جدول؛ write ندارد؛ وضعیت «پیش‌نویس» آبی. |
| رابطهٔ ACTIVE + انتخاب دوباره | غیرقابل انتخاب/بدون تغییر؛ ردیف تکراری نساز. |
| رابطهٔ INACTIVE موجود | در جدول هست؛ افزودن دوباره لازم نیست، از فعال‌سازی استفاده شود. |
| رابطهٔ DELETED ذخیره‌شده + انتخاب | draft restore به ACTIVE با همان ID؛ فیلدهای قبلی حفظ شوند مگر کاربر صریحاً metadata را ویرایش کند. |
| ACTIVE + فعال‌سازی | no-op؛ هیچ draft یا change set جدیدی تولید نشود. |
| INACTIVE + غیرفعال‌سازی | no-op، بدون draft جدید. |
| INACTIVE + فعال‌سازی | «پیش‌نویس فعال»، آبی. |
| ACTIVE + غیرفعال‌سازی | «پیش‌نویس غیرفعال»، آبی. |
| persisted non-DELETED + حذف | «پیش‌نویس حذف»، آبی تا Save؛ سپس رکورد DELETED از جدول پنهان شود. |
| draft جدید/restore که هنوز Save نشده + حذف | همان draft از state حذف شود؛ create/restore سپس delete به سرور نفرست. |
| draft lifecycle به status اولیه برگردد | اگر metadata هم مثل baseline است draft کامل حذف شود؛ در غیر این صورت فقط UPDATE metadata باقی بماند. |
| pending DELETE + انتخاب دوباره | حذفِ pending لغو شود؛ baseline و draftهای باقی‌ماندهٔ معتبر با هویت پایدار برگردند. |

دکمهٔ batch وقتی فعال است که **حداقل یک** ردیف انتخاب‌شدهٔ مجاز نیاز به آن عمل داشته باشد؛ از `every` برای یکسان بودن وضعیت همه استفاده نکن. عمل روی ردیف‌های eligibleِ متفاوت از target اجرا شود و باقی ردیف‌ها دست‌نخورده بمانند. new/restore draft در این الگو ابتدا ACTIVE ذخیره می‌شود؛ تا اولین Save برای آن ادعای غیرفعال‌سازی‌ای که payload واقعاً ذخیره نمی‌کند نشان نده. در انتخاب ترکیبی، چنین draftهایی برای lifecycle نادیده گرفته می‌شوند ولی حذفشان مجاز است.

اگر ردیفی پیش از batch، تغییر واقعیِ ذخیره‌نشده دارد و وضعیت target آن تغییر نمی‌کند، همان draft واقعی را حفظ کن؛ شرط no-op به معنی پاک‌کردن draft قبلی نیست. در backend هم operation بی‌تغییر نباید Revision Content رابطه تولید کند. backend دارای NO_CHANGE فعلی را حفظ کن و Save خالی در UI غیرفعال باشد.

رنگ‌ها فقط semantic UI5: Draft = Information/آبی، ACTIVE canonical = Positive/سبز، INACTIVE canonical = None/خنثی. عنوان metadata-only «پیش‌نویس ویرایش» می‌تواند با i18n مشترک اضافه شود؛ نباید تغییر صرف metadata را «پیش‌نویس فعال» نامید. متن‌های مشترک حداقل در fa/en قرار گیرند؛ کلیدهای فعلی `local.subprocessTable.draftActive/draftInactive/draftDelete` منبع عنوان فارسی‌اند.

### ۸.۳. فیلتر، SearchDialog و خواندن داده

گزینه‌های فیلتر فقط: مقدار خالی/ALL با متن **«انتخاب نشده»**، ACTIVE «فعال»، INACTIVE «غیرفعال». انتخاب نشده یعنی محدودیت وضعیت اعمال نشده، نه پاک‌کردن selection. در UI متن «فعال و غیرفعال»، «همه»، FINAL، DRAFT_NEW، DRAFT_PENDING_DELETE و DELETED به عنوان گزینهٔ فیلتر باقی نماند. برای APIهایی که ALL مصرف می‌کنند آن را در آداپتر نگه دار؛ وضعیت lifecycle جعلی نفرست. ردیف‌های pending برای گم نشدن تغییرات، در هر فیلتر وضعیت دیده شوند؛ فقط canonical current rows با filter محدود شوند.

جستجو/فیلتر selectionها و draftهای پنهان‌شده را پاک نکند. تأیید picker **افزایشی** باشد؛ انتخاب نکردن یک ردیف موجود در نتایج جستجو به معنای حذف ارتباط نیست. Delete فقط با دکمهٔ صریح حذف انجام شود. انتخاب‌ها هنگام جستجو، باز/بسته کردن شاخه و صفحه‌بندی حفظ شوند. select-all جدول فقط دامنهٔ ردیف‌های قابل مشاهدهٔ همان جدول را مدیریت کند و batch به ردیف‌های دیگری که چک نشده‌اند اثر نگذارد.

در picker درختی، اجداد غیرقابل انتخاب ولی قابل بازکردن باشند؛ جستجو مسیر اجداد نتیجه را نگه دارد. ساختارهای موردنیاز: Organization؛ Process→Subprocess؛ Control Group→Control؛ Risk Category→Risk Template؛ Regulation Group→Regulation→Requirement؛ Account Group؛ Strategy→Objective. P3 و P4 باید scope دقیق در زیر context Subprocess را انتخاب کنند؛ دو وقوع یک Control/Requirement زیر دو Subprocess، دو مقصد جدا هستند. Users انتخابگر تخت چندانتخابی دارد.

`U/shared/components/HierarchyMultiSelectionDialog.tsx` را برای ساختارهای سازگار reuse کن؛ جدول/درخت/جستجوی HTML جای UI5 نساز. برای leaves از catalog permission و ACTIVE eligibility فعلی استفاده کن؛ parent درخت را برای نمایش ناپدید نکن. خطا و loading، تأیید را مسدود کنند. هر picker pending باید به dirty/readiness مودال اصلی برسد؛ تعداد آیتم انتخابی صفر، مجوز Save پنهانی هنگام باز بودن ویرایش ناتمام نیست.

وجود کل زوج‌ها مهم است: دادهٔ paginated Local را به صفحهٔ اول/۲۵ یا ۱۰۰ ردیف محدود نکن. deleted rows را فقط برای occupied-pair lookup، metadata و restore داخلی بخوان. آنها وارد گزینهٔ فیلتر، جدول اصلی یا انتخاب فعال تکراری نشوند. `allContexts` در `local.api.repo.ts` نمونهٔ پیمایش تمام صفحات است، نه مجوز ساخت read همه‌منظورهٔ بدون profile.

## ۹. ارتفاع و اسکرول مشترک همهٔ مودال‌های واقعی

الگوی فعلی `U/features/local-master-data/hooks/useOrganizationTableViewport.ts` فقط با `.organizationObjectDialogContent` کار می‌کند و اکنون فقط Organization سقف `70dvh` دارد؛ کپی کردن CSS جدول در بقیه تب‌ها کافی نیست.

1. رفتار را به helper مشترک `U/shared/hooks/useCatalogTableViewport.ts` و ظرف نمایشی `U/shared/components/CatalogTableViewport.tsx` تعمیم بده. نام کلاس Organization را از lookup مشترک حذف کن؛ wrapper محتوای مودال‌های کاتالوگ یک marker مانند `data-catalog-dialog-content` بگیرد.
2. max-height کل host Dialog برابر `70dvh`، با fallback معتبر `70vh` باشد. height ثابت ۷۰٪ نگذار؛ مودال کوچک باید کوچک بماند. قاب جدول `min-width:0; max-width:100%; overflow:auto` داشته باشد؛ Table با `overflowMode="Scroll"`. اندازه‌گیری ظرف باید ارتفاع header، تب‌ها، toolbar، پیام‌ها، padding و footer اصلی را کم کند.
3. ارتفاع ثابت header را حدس نزن. تغییر عرض، شکستن toolbar در RTL، viewport resize/visualViewport، ظاهر شدن پیام draft/error و تغییر View/Edit با ResizeObserver پوشش داده شود. در تب display:none اندازهٔ صفر را baseline نکن؛ با برگشت به تب اندازه دوباره معتبر شود. observer/listener/animation cleanup داشته باشد و loop بی‌پایان resize نسازد.
4. در مودالی با چند جدول، مجموع قاب‌های فعال از فضای باقیمانده بیشتر نشود؛ بودجه را بین جدول‌های visible تقسیم کن یا یک قاب مشترک برای مجموعهٔ جدول‌های همان تب بساز. بودجهٔ کامل را به هر جدول جداگانه نده. Control Center دو inverse و Policy reverseها مصداق‌اند.
5. اسکرول افقی ستون‌های آینده داخل همان ناحیه باقی بماند و footer را همراه خود حرکت ندهد. دسترسی صفحه‌کلید و فوکوس به ناحیهٔ اسکرول حفظ شود. CSS فقط layout باشد؛ theme، shadow DOM یا ارتفاع/رنگ سطرهای UI5 reskin نشوند. header/footer در slot بومی Dialog بمانند.
6. در نمایشگر بسیار کوتاه، native content scrolling خود Dialog، کنترل‌های ثابت و حداقل یک ناحیهٔ قابل استفادهٔ جدول را در دسترس نگه دارد؛ ناحیهٔ جدول را صفر نکن.

hostهای لازم نسبت به `U/features/`:

- `organization/pages/OrganizationsFclShellPage.tsx`
- `process/pages/ProcessesFclShellPage.tsx`
- `control/pages/CentralControlsFclShellPage.tsx` و `control/components/CentralControlDialog.tsx`
- `control-objective/pages/CentralControlObjectivesFclShellPage.tsx`
- `risk/pages/CentralRiskPage.tsx`
- `regulation/pages/CentralRegulationsPage.tsx`
- `policy/pages/CentralPoliciesPage.tsx`
- `account-group/pages/CentralAccountGroupsPage.tsx`
- `objective/pages/ObjectiveManagementPage.tsx`
- `global-control/pages/GlobalControlManagementPage.tsx`

تغییر activeTab به `general` در Edit/Save این hostها بررسی و اصلاح شود: فقط باز کردن یک entity یا نوع جدید مجاز است تب پیش‌فرض بدهد. در View→Edit و Save موفق همان entity، تب معتبر قبلی حفظ شود. URL tab/context/deep-link که مربوط به همان entity است حفظ شود؛ ID مربوط به entity قبلی حمل نشود. remount به علت عوض شدن تب، هیچ draftی را نابود نکند؛ remount به علت entity/mode جدید فقط بعد از تصمیم guard انجام شود.

## ۱۰. استثنای ساختاری Regulation Requirements و Import موجود

`RegulationRequirementsTab.tsx` فهرست فرزندان واقعی Regulation است، نه زوج Assignment. Requirement فقط یک regulationId دارد. برای آن DELETE یک «ارتباط» جدا، جدول join، reselect برای restore رابطه یا چندوالدی نساز. تغییر والد/حذف خود Requirement از فرم و درخت Requirement و Guard REGULATION انجام می‌شود. جدول این تب فقط‌خواندنی است و وضعیت/کد/نام/اعتبار و scroll را حفظ می‌کند.

دکمهٔ Import Excel فعلی عملیات مستقل ساختاری است و نباید از داخل تب، الگوی Save رابطه را دور بزند. قابلیت را حذف نکن: entry آن را از toolbar تب به منوی ایجاد صفحهٔ Regulation منتقل کن (`RegulationCreateMenu.tsx`، `CentralRegulationListReport.tsx` و `CentralRegulationsPage.tsx`). فقط با Regulation منتخب یا Requirementی که Regulation والدش مشخص است، GOVERNANCE manage و وضعیت مناسب فعال شود. پیش از ترک draft مودال، guard فعلی برقرار باشد. `RequirementImportDialog.tsx`، preview، تأیید Import، template و command/Revision موجود حفظ شوند؛ Import به Save رابطه یا mutation پنهان در SearchDialog تبدیل نشود. بررسی اسکرول preview نیز لازم است، بدون تغییر قالب Excel یا اجرای Import.

## ۱۱. ذخیرهٔ اتمیک: یافته‌های backend و تغییرات لازم

هر کلیک Save اصلی فقط **یک درخواست mutation aggregate از مرورگر** دارد. GET پس از Save و temporary upload مستقلِ فعلی مستندات، mutation زنجیره‌ای محسوب نمی‌شوند. از Browser فراخوانی متوالی Update→Move→Lifecycle یا Organization Save→چند Local Save ممنوع است. صرف حذف دکمه، atomicity ایجاد نمی‌کند.

### ۱۱.۱. Organization و تمام Local draftها

نقاط فعال:

- `A/organization/application/OrganizationService.java`، Create/Update اکنون outer `@Transactional` هستند؛ contextهای Subprocess با `LocalContextService.prepareOrganizationSave/saveSubprocesses` از همین درخواست ذخیره می‌شوند.
- DTOهای `A/organization/api/dto/CreateOrganizationRequest.java`، `UpdateOrganizationRequest.java` و `OrganizationAggregateMutationResponse.java`؛ فیلد `subprocesses` فعلی را حفظ کن.
- `M/local/application/LocalContextService.java`، `LocalControlService.java`، `LocalRiskService.java`، `LocalObjectiveService.java`، `LocalRequirementService.java`، `LocalOrganizationPolicyService.java`، `LocalContextPolicyService.java`، `LocalControlPolicyService.java`، `LocalRequirementPolicyService.java`.
- `M/local/api/dto/Local*Dtos.java` منبع فیلدهای create/update فعلی هر خانواده‌اند؛ `LocalCommandRules.java`، `LocalStrictBodyAdvice.java` و dependencyهای موجود حفظ شوند.

قرارداد جدید: به همان Organization Create/Update، collectionهای typed زیر اضافه کن، همگی nullable و empty/omitted = no-op:

| فیلد aggregate | خانواده / محتوا |
| --- | --- |
| `subprocesses` | L1 موجود؛ ContextChange فعلی را حفظ کن. |
| `localControlScopeChanges` | L2؛ contextRef، controlId، operation، scopeId/version، source و metadata LocalControlDtos |
| `localRiskScopeChanges` | L3؛ contextRef، riskTemplateId، operation، scopeId/version، source و dates |
| `localControlObjectiveScopeChanges` | L4؛ contextRef، controlObjectiveId، operation، scopeId/version، source و dates |
| `localRequirementScopeChanges` | L5؛ contextRef، requirementId، operation، scopeId/version، source و dates |
| `localOrganizationPolicyChanges` | L6؛ policyId، operation، relationId/version، scopeAction، propagationMode و dates |
| `localContextPolicyChanges` | L7؛ contextRef، policyId، operation، relationId/version، scopeAction و dates |
| `localControlPolicyChanges` | L8؛ controlScopeRef، policyId، operation، relationId/version، scopeAction و dates |
| `localRequirementPolicyChanges` | L9؛ requirementScopeRef، policyId، operation، relationId/version، scopeAction و dates |
| `organizationObjectiveChanges` | B1 از سمت Organization؛ objectiveId، operation، assignmentId/version و metadata OrganizationObjective |
| `ownerAssignments` | O1 موجود، با عملیات سه‌حالتهٔ بند ۱۱.۴ |

برای context جدیدی که در تب زیرفرآیند draft است، UUID دیتابیس را در Browser نساز و کاربر را مجبور به Save زودهنگام نکن. typed `contextRef` دقیقاً یکی از `contextId` موجود یا `subprocessId` مربوط به Context create/restore همین aggregate دارد. selector تب‌های دیگر باید contextهای pending را هم با کلید client مبتنی بر subprocess نشان دهد. سرور بعد از apply Context، reference را resolve می‌کند؛ context دیگر سازمان، Context بدون draft معتبر یا final state حذف‌شده رد شود.

`controlScopeRef` دقیقاً یکی از Local Control Scope ID موجود یا tuple `contextRef + controlId` برای draft scope همین aggregate است؛ `requirementScopeRef` مشابه با requirementId. اینها referenceهای typed و محدودند، نه graph عمومی، `entityType/targetId` یا client-controlled Unit of Work.

`sourceType`های `LOCAL_ADDED` و `INHERITED_FROM_CENTRAL` و زوج exact reference را حفظ کن؛ Central Scope را هنگام انتخاب Local خودکار ایجاد نکن. برای INHERITED، تطبیق definition/subprocess، ACTIVE eligibility و containment تاریخ‌ها مثل service فعلی اعتبارسنجی شود. context/target/source هویت immutable یک persisted row هستند؛ تغییر آنها با UPDATE metadata انجام نشود.

توابع local فعلی write فوری و Revision مخصوص خود دارند و create آنها معمولاً زوج اشغال‌شده را duplicate می‌دانند. برای aggregate، به prepare/apply typed داخلی با transaction propagation MANDATORY تفکیک شوند؛ occupied deleted row را با نسخه/هویت درست restore کنند. از حلقه روی create/update/lifecycle فعلی که برای هر ردیف Revision مستقل می‌سازد استفاده نکن. APIهای مستقل دیگر برای مصرف‌کنندهٔ باقی‌مانده لازم‌اند؟ آنها می‌توانند همان منطق typed داخلی را صدا بزنند؛ UI جدید مودال آنها را برای Save صدا نمی‌زند.

ترتیب فازها server-owned است: full Guard union → permission/profile → lock endpointهای لازم → prepare و validate تمام تغییرات و final references → ایجاد/restore Contextهای لازم → Scopeها → Policy targetها → finalize اسناد با قرارداد فعلی → Revision و پاسخ canonical، همه داخل همان outer transaction. حذف‌های صریح dependentهایی که در همان درخواست حذف می‌شوند قبل از حذف parent اعمال شوند؛ dependency دیگری که در change set نیست هرگز cascade نشود. Coverage/Document dependency موجود مانع حذف باقی بماند. خواندن و بررسی dependency باید final planned state را حساب کند؛ صرف ترتیب apply جای validation کامل را نگیرد.

برای Organization Save، Organization و Owners در یک CENTRAL Revision و تمام L1–L9 و B1 همان Organization در **یک LOCAL Revision** قرار بگیرند؛ LOCAL با `causedByRevisionId` به CENTRAL وصل شود. محتوای Central/Local را مخلوط نکن. دو Revision و همهٔ sourceها/اسناد یک commit/rollback دارند. مجموعهٔ Local خالی، Revision Local تازه نسازد.

پاسخ typed Organization canonical را به همهٔ collectionهای دست‌خورده توسعه بده؛ نسخهٔ Organization، ID/version و metadata واقعی رابطه‌ها برگردد. state/baseline فقط بعد از موفقیت mutation پاک شود. پاسخ authoritative را به cacheها و selectorها اعمال کن. tombstoneهای deleted اگر برای reconciliation برگشتند، جدول آنها را render نکند.

frontend زنجیرهٔ کامل فراموش نشود: `organization/domain/organization.model.ts`، `organization.schema.ts`، `service/organization.service.ts`، `infra/organization.api.repo.ts`، state، ObjectPage و FCL. Zod و normalize در سورس فعلی فیلد ناشناخته را حذف می‌کنند؛ اضافه کردن prop به جدول بدون عبور از تمام این لایه‌ها قابل قبول نیست.

### ۱۱.۲. S/A/C/P: قراردادهای aggregate موجود را نگه دار

| خانواده | مالک Save / change field / backend فعال |
| --- | --- |
| S1–S4 | Subprocess Create/Update؛ `controlScopeChanges/riskScopeChanges/controlObjectiveScopeChanges/requirementScopeChanges`؛ `M/process/application/ProcessService.java` و `M/scope/{control,risk,controlobjective,requirement}/application/CentralSubprocess*ScopeAggregateService.java` |
| A1/A3/A4 | Control Save؛ `riskAssignments/controlObjectiveAssignments/requirementAssignments`؛ `M/catalog/control/application/CentralControlCommandService.java` و `M/assignment/{riskcontrol,controlcontrolobjective,requirementcontrol}/application/*AggregateService.java` |
| A2 | Control Objective Save؛ `riskAssignments`؛ `M/catalog/controlobjective/application/CentralControlObjectiveCommandService.java` و `M/assignment/riskcontrolobjective/application/CentralRiskControlObjectiveAssignmentAggregateService.java` |
| C1/C2 | Control / Control Objective Save؛ `accountGroupChanges`؛ `M/classification/{controlaccountgroup,controlobjectiveaccountgroup}/application/*AggregateService.java` |
| P1–P4 | Policy Save؛ `subprocessScopeChanges/organizationScopeChanges/controlScopeChanges/requirementScopeChanges`؛ `M/catalog/policy/application/CentralPolicyCommandService.java` و چهار `CentralPolicy*ScopeAggregateService.java` همان package |

Read/DTO/permission هر feature در پوشه‌های `domain`، `infra` و `security` آن است. اینها generic CRUD نیستند. Subprocess و Control/Control Objective responseهای canonical فعلی را حفظ کن. یک CENTRAL Revision با ترتیب owner-first و ترتیب typed family موجود باقی بماند. Coverage payload جدید اضافه نشود؛ omitted Coverage = no-op فعلی باقی بماند.

**تفاوت شکل restore را رعایت کن:** Local Context برای زوج موجود `contextId/version` می‌خواهد. برعکس، CREATE_OR_RESTORE فعلی A/C، `assignmentId/classificationId/version/requestedStatus` را منع می‌کند؛ S نیز scopeId در CREATE_OR_RESTORE نمی‌پذیرد. برای A/C/P که RESTORE صریح موجود دارند، restore بدون تغییر metadata می‌تواند ID/version همان deleted row را بفرستد. برای S یا restore همراه metadata، مسیر CREATE_OR_RESTORE معتبر همان خانواده و metadata قبلی/ویرایش‌شده را استفاده کن؛ guard و نسخهٔ aggregate مالک محافظ stale state هستند. payload Context را در بقیهٔ خانواده‌ها کپی نکن. restore همیشه زوج اشغال‌شدهٔ فعلی را reuse کند، metadata را با null/default ناخواسته پاک نکند و هویت/نسخه را از server بگیرد.

`ControlScopeEditorDialog`، `RiskScopeEditorDialog`، `ControlObjectiveScopeEditorDialog`، `RequirementScopeEditorDialog`، `ClassificationValidityDialog`، `ControlObjectiveClassificationValidityDialog` و چهار `AssignmentValidityDialog` پس از مهاجرت ویرایش metadata، دیگر از تب‌ها به عنوان editor دارای Save مستقل mount نشوند. فایل با مصرف‌کنندهٔ واقعی دیگر را بدون بررسی reference حذف نکن.

### ۱۱.۳. B1: Organization Objective از دو سطح موجود

فایل‌های backend: `M/objective/application/OrganizationObjectiveService.java` و `ObjectiveService.java`؛ `M/objective/api/OrganizationObjectiveDtos.java`، `ObjectiveDtos.java`، `OrganizationObjectiveController.java` و `ObjectiveController.java`؛ entity/repositoryهای `OrganizationObjective` و `Objective` در همان feature.

وضعیت فعلی: جدول `organization_objective` از قبل ACTIVE/INACTIVE/DELETED و uniqueness زوج دارد، ولی entity/service فقط create/update/restore/delete را عرضه می‌کنند. تب سازمان editor مستقل و write فوری دارد. صفحهٔ Objective با `organizationIds` فهرست نهایی را synchronize می‌کند، در حالی که status و نسخه و metadata تک‌تک رابطه‌ها در payload نیست.

کار قطعی:

- یک DTO typed `OrganizationObjectiveChange` با operationهای CREATE_OR_RESTORE، UPDATE، ACTIVATE، INACTIVATE، DELETE، RESTORE بساز. `assignmentId/version` برای operation روی رکورد موجود لازم باشد؛ فیلد identity در Organization Save، `objectiveId` و در Objective Save، `organizationId` است. metadata فعلی name/description/owner/validFrom/validTo حفظ شود. زوج repeated در یک collection رد شود.
- به Objective Create/Update فیلد `organizationChanges` اضافه کن. Browser جدید دیگر `organizationIds` نفرستد. legacy `organizationIds` اگر برای caller غیرجدید موقتاً نگهداری شد فقط به همان prepare/apply تبدیل شود؛ حضور هر دو قالب در یک درخواست خطای validation باشد و مسیر دوم مستقل ننویسد. null/empty changes = no-op؛ تشخیص حذف از غایب بودن ID انجام نشود.
- Organization modal از `organizationObjectiveChanges` بند ۱۱.۱ استفاده کند؛ `OrganizationObjectivesTab.tsx` هیچ `assign/updateAssignment/removeAssignment` مستقلی روی Save ردیف صدا نزند و روی Create سازمان هم بتواند draft انتخاب کند.
- فعال/غیرفعال‌سازی واقعی به entity و service اضافه شود، با نسخه و snapshot. حذف نرم و restore همان ID برقرار بماند. restore، نام محلی/توضیح/owner/اعتبار قبلی را با نام مرکزی پیش‌فرض یا null پاک نکند.
- فقط Objective با Strategy ریشهٔ معتبر مقصد مجاز است. Strategy هرگز به Organization تخصیص نمی‌یابد. picker رابطه چندهدف مجاز، اجداد Strategy غیرقابل انتخاب؛ selector parent استراتژی همچنان تک‌انتخاب است.
- readهای `/api/organizations/{organizationId}/objectives` و `/api/objectives/{id}/organizations` هویت رابطه و نسخه و metadata موردنیاز را کامل برگردانند. read داخلی deleted با query کنترل‌شدهٔ `lifecycleStatus=DELETED` قابل افزودن است؛ default همچنان current non-DELETED. DTO فعلی OrganizationLink فاقد assignment ID/تمام metadata است و باید توسعه یابد.
- Objective Save یک CENTRAL Revision مالک و برای هر Organization تغییریافته یک LOCAL Revision داشته باشد؛ LOCALها به CENTRAL مرتبط و همه در یک outer transaction باشند. Organizationها و ردیف‌ها با ترتیب پایدار پردازش شوند. فراخوانی `organizationObjectives.assign/remove` در `synchronizeOrganizations` فعلی با prepare/apply تجمیعی جایگزین شود تا برای هر row Revision مجزا یا default reset ناخواسته نداشته باشیم.
- از سمت Objective اجازهٔ ویرایش همین خانواده وجود دارد؛ آن را با عبارت عمومی «inverse فقط‌خواندنی» غیرفعال نکن. سمت‌های واقعاً inverse در بند ۶ مشخص‌اند.

frontend: `U/features/objective/domain/objective.model.ts`، `infra/objective.api.repo.ts`، `components/OrganizationObjectivesTab.tsx`، `components/ObjectiveSelectionDialog.tsx` و `pages/ObjectiveManagementPage.tsx`؛ scalar `selectedOrganizationIds` به baseline + typed relation drafts تبدیل شود. فیلتر فعلی FINAL/DRAFT_* و دکمهٔ remove/undo هر ردیف حذف شوند.

### ۱۱.۴. O1 و G1: دو رابطه‌ای که هنوز INACTIVE ندارند

این دو مورد فقط تغییر UI نیستند:

| جدول | constraintهای فعلی دوحالته |
| --- | --- |
| `organization_owner_assignment` | `ck_org_owner_status` و `ck_org_owner_deleted` در V1197 |
| `global_control_regulation` | `ck_global_control_reg_status` و `ck_global_control_reg_deleted` در V1187 |

در migration جدید forward، هر دو status constraint به ACTIVE/INACTIVE/DELETED توسعه یابند و deleted metadata شرط `(status = 'DELETED' and deleted_at/by not null) OR (status <> 'DELETED' and deleted_at/by null)` داشته باشد. مقدار/ID/profile/version/تاریخچهٔ رکوردهای قبلی را در migration عوض نکن. جدول یا Revision entity type جدید لازم نیست. در snapshot بررسی‌شده آخرین migration، V1201 است؛ شمارهٔ پیشنهادی `V1202__relationship_inactive_status.sql` است. فقط اگر آن شماره واقعاً اشغال شده، اولین نسخهٔ آزاد بعدی را انتخاب کن؛ فایل اعمال‌شده را اصلاح یا renumber نکن.

**Owners:**

- `A/organization/api/dto/OrganizationOwnerChange.java`، `OrganizationOwnerView.java`، `application/OrganizationOwnerAssignmentService.java`، `domain/OrganizationOwnerAssignment.java`، repository interface و `infrastructure/persistence/JdbcOrganizationOwnerAssignmentRepository.java` را یکجا تغییر بده.
- عملیات ACTIVATE/INACTIVATE و RESTORE صریح به change typed اضافه شوند؛ رکورد موجود برای تغییر/restore، ID/version دقیق داشته باشد؛ API قبلی CREATE_OR_RESTORE بدون ID می‌تواند در منطق server-owned occupied pair خود حفظ شود، ولی UI جدید برای deleted row شناخته‌شده از RESTORE نسخه‌دار استفاده کند. پاسخ non-DELETED باید INACTIVE را هم شامل شود و `status` واقعی داشته باشد.
- `eligible` صلاحیت کاربر است، نه status رابطه. role revocation/disabled user خودکار رابطه را delete/inactivate نکند و eligibility نامعتبر نیز سبزِ lifecycle جعلی نسازد. ایجاد/restore/activate فقط با کاربر eligible؛ inactivate/delete رابطهٔ موجود نیازمند eligible شدن مجدد کاربر نیست.
- مدیر واقعی root و admin همان پروفایل manage می‌کنند؛ MASTER_DATA_ADMIN و ORGANIZATION_MASTER_DATA_MANAGER صرفاً می‌توانند طبق قواعد قبلی eligible owner باشند، نه مدیر Assignment. مالکیت مجوز جدیدی اعطا نمی‌کند.
- read فعلی `owners.list` ACTIVE-only است؛ به current non-DELETED توسعه یابد. read داخلی deleted برای editor از `GET /api/master-data/organizations/{id}/owner-assignments/deleted` با profile و مجوز مشاهدهٔ Organization اضافه شود؛ گزینه‌های eligible users همچنان manager-only باشند. inactive assignment باید در جدول دیده شود، نه اینکه دوباره به عنوان owner تازه وارد شود.
- `directlyOwned/activeForUser` فقط ACTIVE و eligible را برای scope مؤثر مالکیت حساب کند؛ صرف نمایش INACTIVE باعث مالکیت مؤثر نشود. dependency query فعلی در `M/shared/application/MasterDataStructuralDependencyChecker.java` برای Owners ACTIVE-only است؛ با اضافه شدن INACTIVE باید هر رابطهٔ non-DELETED مانع حذف Organization باشد. هیچ cascade یا پنهان‌سازی inactive reference در dependency ایجاد نکن.

**Global Control Regulations:**

- فایل‌ها: `M/globalcontrol/application/GlobalControlService.java`، `GlobalControlRegulationService.java`، `domain/GlobalControlRegulationEntity.java`، `GlobalControlRegulationRepository.java` و `api/GlobalControlDtos.java`، `GlobalControlRegulationDtos.java`، `GlobalControlController.java` و mapper.
- در entity، activate/inactivate واقعی با audit، در DTO Link، status رابطه و هویت/نسخهٔ آن اضافه شود. endpoint status با relation status یکی نشود.
- به Global Control Create/Update، `regulationChanges` typed اضافه کن: regulationId، operation، relationId/version برای موجود؛ metadata اعتبار برای رابطه‌ای که ستونش را ندارد نساز. `regulationIds` Browser جدید حذف شود؛ در صورت نگهداشت caller قدیمی، دو قالب هم‌زمان رد شوند و adapter فقط همین prepare/apply را صدا بزند.
- `synchronizeRegulations` و فراخوانی per-row attach/remove با یک prepare/apply داخلی در همان CENTRAL Revision Global Control جایگزین شوند. تغییر صرف lifecycle رابطه هم version مالک و snapshot/Revision Content صحیح داشته باشد. روابط non-DELETED و deleted lookup از همان read موجود `/api/global-controls/{id}/regulations` با فیلتر داخلی کنترل‌شده در دسترس باشند؛ UI، deleted را نشان ندهد.
- `GlobalControlRegulationService` فعلی restore/delete دارد ولی INACTIVE ندارد؛ تمام مسیرهای attach/create-or-restore، list، dependency و mapping باید وضعیت جدید را درست درک کنند. active duplicate همچنان رد شود؛ inactive existing در جدول باشد و از Activate تغییر کند؛ deleted از picker restore شود.
- frontend: `U/features/global-control/domain/global-control.model.ts`، `infra/global-control.api.repo.ts`، state مربوط و `pages/GlobalControlManagementPage.tsx`. regulationPanel و انتخابگر فعلی به toolbar گروهی/جدول مشترک تبدیل شوند. `FINAL` نمایشی جای lifecycle واقعی استفاده نشود.

### ۱۱.۵. Save والد در مودال‌های با Update/Move/Lifecycle زنجیره‌ای

در این sourceها اکنون یک کلیک Save می‌تواند چند mutation مستقل بفرستد؛ این کار با بند ذخیرهٔ اتمیک تأییدشده سازگار نیست:

| host UI | backend و DTO فعال که باید aggregate Update شوند |
| --- | --- |
| `account-group/pages/CentralAccountGroupsPage.tsx` | `M/catalog/accountgroup/application/CentralAccountGroupCommandService.java`، `api/dto/CentralAccountGroupDtos.java`، entity `CentralAccountGroupEntity` |
| `risk/pages/CentralRiskPage.tsx`، هر دو category/template | `M/catalog/risk/application/CentralRiskCategoryCommandService.java` و `CentralRiskTemplateCommandService.java`، `api/dto/UpdateCentralRiskCategoryRequest.java` و `UpdateCentralRiskTemplateRequest.java` و entityهای همان feature |
| `regulation/pages/CentralRegulationsPage.tsx`، هر سه نوع | `M/catalog/regulation/application/CentralRegulationGroupCommandService.java`، `CentralRegulationCommandService.java`، `CentralRegulationRequirementCommandService.java` و `api/dto/CentralRegulationDtos.java` |
| `policy/pages/CentralPoliciesPage.tsx`، فقط GROUP | `M/catalog/policy/application/CentralPolicyGroupCommandService.java` و `api/dto/CentralPolicyDtos.java` |

DTO Update مربوط، اطلاعات عمومی، typed parent، status ACTIVE/INACTIVE و sortOrder موجود را در همان command پذیرفته و snapshot نهایی داشته باشد. فیلدهای parent صحیح به‌ترتیب `parentAccountGroupId`، `parentCategoryId`، `riskCategoryId`، `parentGroupId`، `regulationGroupId`، `regulationId` و Policy Group `parentGroupId` هستند. optional root = null صریح؛ parent اجباری null را رد کند. Browser bundled باید parent را همیشه صریح بفرستد؛ omitted فیلد از caller قدیمی نباید تصادفاً به حذف والد تعبیر شود—presence را در DTO/controller با الگوی explicit typed parent-change سازگار حفظ کن، یا command aggregate جدیدِ مشخص از endpoint قبلی تفکیک کن؛ نوشتن چندمرحله‌ای مجاز نیست.

مسیر پیاده‌سازی ترجیحی و بسته‌شده برای سازگاری: Update فعلی را با فیلد nullable `parentChange` از record اختصاصی همان نوع گسترش بده؛ `parentChange == null` یعنی والد موجود حفظ شود، و object حاضر با ID داخلی null فقط برای parent اختیاری یعنی clear. برای والدهای اجباری ID داخلی @NotNull است. frontend جدید در Update همیشه parentChange را می‌فرستد. status و sortOrder اضافه‌شده در صورت omission از مقدار persisted حفظ شوند؛ UI جدید مقادیر نهایی را صریح می‌فرستد. الگوی nullable direct parent در Organization/Process موجود را به این بهانه بازنویسی نکن.

این Updateها ساختاری‌اند حتی اگر parentChange معادل parent قبلی باشد؛ Guard پیش از hierarchy read گرفته شود. validation موجود Move، cycle، parent eligibility و lifecycle/dependency به همان transaction منتقل شوند؛ تغییر source به یک mutation نهایی و یک owner Revision Content تبدیل شود، نه update + move + lifecycle با flush/Revision مستقل. Documents همان finalize فعلی را در همین transaction دارد. APIهای Move مستقل برای مصرف‌کنندهٔ واقعی دیگر می‌توانند بمانند؛ Browser مودال جدید آنها را صدا نمی‌زند.

Policy خود POLICY، Control، Control Group، Organization و Process/Subprocess قبلاً aggregate مسیر دارند؛ ابتدا همان مسیر را حفظ و تکمیل کن، نه اینکه همه را با framework تازه عوض کنی. DTO/model/schema/mapper/API repo UI هر خانوادهٔ تغییرکرده هم‌زمان اصلاح شود.

## ۱۲. Guard، قفل، transaction و Revision

### ۱۲.۱. قواعد غیرقابل حذف

`ProfileTransactionPolicy` در `A/datasetprofile/application/ProfileTransactionPolicy.java`، پیش از business reads قفل ADMINISTRATION و مجوز زندهٔ پروفایل را می‌گیرد. aggregateهای گسترش‌یافته باید داخل protected outer Spring transaction باشند. پیدا کردن profile از payload، دور زدن `ProfileContext` یا حذف predicateهای profile ممنوع است. relationId/version به تنهایی مجوز cross-profile نیست.

ابتدا full Guard union، سپس هر hierarchy/eligibility/dependency read. ترتیب **لغوی name** کلیدها:

`ACCOUNT_GROUP → CONTROL → GLOBAL_CONTROL → OBJECTIVE → ORGANIZATION → POLICY → PROCESS → REGULATION → RISK`

به ترتیب declaration/ordinal enum تکیه نکن: در `MasterDataHierarchyKey.java`، ORGANIZATION پیش از OBJECTIVE تعریف شده، اما lexical order برعکس است. از Comparator نام و union کامل استفاده کن. Guard missing/timeout fail closed است؛ retry خودکار و ساخت Guard runtime ممنوع است.

### ۱۲.۲. union لازم هر خانواده

| خانواده/command | Guardهای لازم، علاوه بر protected ADMINISTRATION |
| --- | --- |
| Organization create/update/parent/owners | ORGANIZATION |
| L1 | ORGANIZATION، PROCESS |
| L2 | CONTROL، ORGANIZATION، PROCESS |
| L3 | ORGANIZATION، PROCESS، RISK |
| L4 | ORGANIZATION، PROCESS؛ Control Objective hierarchy تازه ندارد |
| L5 | ORGANIZATION، PROCESS، REGULATION |
| L6 | ORGANIZATION، POLICY |
| L7 | ORGANIZATION، POLICY، PROCESS |
| L8 | CONTROL، ORGANIZATION، POLICY، PROCESS |
| L9 | ORGANIZATION، POLICY، PROCESS، REGULATION |
| B1 / Objective Create/Update | OBJECTIVE، ORGANIZATION |
| S1–S4 / Subprocess Save | PROCESS و union فعلی command/lock coordinator؛ Guard مستقل SUBPROCESS نساز |
| Control Save | CONTROL؛ ACCOUNT_GROUP برای C1، RISK برای A1، REGULATION برای A4؛ initialSubprocess موجود PROCESS را هم اضافه می‌کند |
| Control Objective Save | ACCOUNT_GROUP برای C2، RISK برای A2 و union فعلی lifecycle؛ Guard با نام CONTROL_OBJECTIVE یا OBJECTIVE نساز |
| P1 | POLICY، PROCESS |
| P2 | ORGANIZATION، POLICY |
| P3 | CONTROL، POLICY، PROCESS |
| P4 | POLICY، PROCESS، REGULATION |
| G1 / Global Control aggregate | GLOBAL_CONTROL، REGULATION |
| Account Group parent aggregate | ACCOUNT_GROUP |
| Risk Category parent aggregate | RISK |
| Risk Template parent/status aggregate | RISK و union lifecycle فعلی CONTROL/RISK هنگام lifecycle مربوط |
| Regulation Group/Regulation parent aggregate | REGULATION |
| Requirement parent/status aggregate | REGULATION و union lifecycle فعلی CONTROL/REGULATION هنگام lifecycle مربوط |
| Policy Group parent aggregate | POLICY |

برای Organization با چند Local family، تمام کلیدهای collectionهای nonempty را **پیش از** ورود به `OrganizationService` hierarchy/parent validation بگیر؛ قفل PROCESS از الگوی فعلی L1 برای L2–L9 کافی نیست. Policy Update فعلی union گسترده‌تری دارد؛ آن را به بهانهٔ بهینه‌سازی کوچک نکن. برای سایر commands نیز union موجود بزرگ‌تر حفظ شود.

### ۱۲.۳. targeted row locks و prepare/apply

کل جدول یا تمام hierarchy rows را lock نکن. برای batch تمام endpointهای متأثر را پیش از relation-row locks آماده کن. ترتیب relative مرکزی پذیرفته‌شده همیشه **Control، Risk Template، Control Objective، Requirement و سپس ID در هر نوع** است. در aggregate Local، Organization و Subprocessهای درگیر پیش از این endpointها قفل می‌شوند و Context/Scope/Policy-target/Assignment rowها پس از endpointهای مربوط با ترتیب stable business key قفل می‌شوند. چنانچه یک service داخلی بعداً endpointی از مرحلهٔ قبلی می‌گیرد، آن را به prepare union منتقل کن؛ nested apply نباید قفل زودتر را بعد از قفل دیرتر تازه مطالبه کند.

قالب صحیح برای extensionها: `prepare` همهٔ shape/duplicate/profile/identity/version/eligibility/dates/dependency/final reference را بدون write اعتبارسنجی کند؛ `apply` فقط plan معتبر را در transaction MANDATORY اعمال و Revision Content typed برگرداند. `MasterDataRevisionCoordinator` با REQUIRED داخل outer transaction مشترک کار می‌کند؛ `REQUIRES_NEW` یا commit مستقل برای هر collection/row اضافه نکن. ID و ترتیب Revision و snapshots server-owned هستند. از `CentralSubprocessCoverageLockCoordinator` فقط برای الگوی lock اتحادی موجود استفاده کن؛ این به معنی فعال کردن Coverage UI نیست.

unique occupied pair در تمام statusها حفظ شود. DELETE نرم، audit deletion معتبر؛ ACTIVATE/RESTORE نیازمند endpointهای eligible طبق قرارداد خانواده؛ INACTIVATE/DELETE روی رکورد معتبر با version. هیچ وابستگی Document/Scope/Coverage/Policy یا owner نادیده گرفته نشود. در یک batch، دو operation روی یک زوج ممنوع است؛ generator UI فقط final intent را می‌فرستد.

قفل Guard، validation، mutation منبع و رابطه، snapshot/Revision، source version و canonical response داخل همان transaction و اتصال DB بمانند. در تغییرات صرف رابطه هم version aggregate مالک طبق قرارداد مربوط touch شود. در خطای هر collection، هیچ source/رابطه/Revision دیگری commit نشود.

## ۱۳. مجوزها، دامنهٔ پروفایل و امنیت picker

قانون پایه: read از reference فقط view لازم را می‌گیرد؛ تغییر رابطه manage مالک را لازم دارد. نمایش صرف جدول جدید به inverse، مجوز mutate نمی‌دهد. readonly بودن باید در API هم واقعی باشد، نه فقط hidden Button.

| مورد | مجوز موجود که باید حفظ شود |
| --- | --- |
| Organization General | ORGANIZATION manage؛ سازگاری قبلی REFERENCE در MasterDataAuthorization حفظ شود. |
| L1–L9 | REFERENCE manage و view همهٔ areaهای spec؛ Context PROCESS، Control PROCESS+CONTROL، Risk PROCESS+RISK، Control Objective PROCESS+CONTROL، Requirement PROCESS+GOVERNANCE، Org Policy GOVERNANCE، Context Policy PROCESS+GOVERNANCE، Control Policy PROCESS+CONTROL+GOVERNANCE، Requirement Policy PROCESS+GOVERNANCE. |
| S1–S4 | PROCESS manage و view مقصد CONTROL/RISK/GOVERNANCE مطابق permission helper همان feature. |
| A1/A2 | CONTROL manage + RISK view؛ inverse هر دو view. |
| A3 | CONTROL manage؛ inverse CONTROL view. |
| A4 | CONTROL manage + GOVERNANCE view؛ inverse هر دو view. |
| C1/C2 | CONTROL manage + REFERENCE view؛ inverseهای Account Group طبق permission helper قبلی. |
| B1 | REFERENCE manage؛ eligibility Objective/Strategy و Organization همان profile. |
| O1 | فقط root واقعی/ادمین مجاز همان profile برای manage؛ eligibility نقش‌های قبلی owner حفظ شود. |
| P1–P4 و G1 | همان checkهای typed controller/service فعلی؛ از ظاهر SearchDialog، permission تازه یا دسترسی به catalog دیگر استنتاج نکن. G1 فعلی با CONTROL مدیریت می‌شود. |

فایل‌های `security/*Permissions.ts` ده featureٔ S/A/C و `U/features/master-data/security/masterDataAccess.ts` مرجع UI هستند؛ backend مجوز زنده را داخل transaction دوباره بررسی کند. profile غیرفعال write ندارد؛ revocation حین باز بودن مودال باید Save را fail closed کند و draft را نگه دارد. UI نباید UUID ناشناخته را به عنوان نام fallback قابل قبول یک گزینهٔ ناقص ذخیره کند.

خطاهای conflict/version، PROFILE_BUSY، HIERARCHY_BUSY، duplicate، endpoint ineligible، source mismatch، تاریخ نامعتبر و dependency conflict پیام i18n روشن و نام خانوادهٔ خطادار داشته باشند. reload خودکار نباید draft را بی‌صدا پاک کند؛ retry خودکار write ممنوع است. اگر mutation موفق شد ولی GET refresh بعدی شکست خورد، آن را Save ناموفق معرفی نکن و کاربر را به ارسال دوبارهٔ create/restore سوق نده؛ از canonical mutation response استفاده کن و فقط خطای تازه‌سازی را گزارش بده.

## ۱۴. برنامهٔ اجرای دقیق و محدودهٔ فایل‌های مشترک

این ترتیب وابستگی‌ها را رعایت کن؛ برای هر family کار را تا API→state→UI→canonical response تمام کن:

1. قراردادها و migration سه‌حالتهٔ O1/G1؛ DTOهای aggregate جدید Organization، Objective و Global Control و canonical rows. بدون اجرای migration.
2. prepare/apply داخلی typed برای L2–L9، B1، O1، G1؛ Union Guard، permission، lock و Revision مشترک را کامل کن. L1 را به batching یک LOCAL Revision سازمان متصل کن.
3. atomic parent Update چهار host زنجیره‌ای بند ۱۱.۵؛ مدل/schema/repo را با backend هم‌زمان تغییر بده. منطق parent validity و lifecycle موجود reuse شود.
4. کامپوننت‌های مشترک نمایش: `CatalogRelationTable` (presentational و typed props)، `CatalogRelationToolbar`، `CatalogTableViewport` و hook مشترک ارتفاع. state مالک و payload/domain adapter feature-specific بماند. backend یا API generic Relation/Scope/Assignment نساز.
5. Organization: کنترل‌شده کردن تمام draftها در ObjectPage، حذف `localWorkspaceDirty` به عنوان مانعِ «اول در تب خودش Save کن»، و اتصال dirty/readiness هر table به Save اصلی. جایگزینی LocalSectionPane editor مستقل در mountهای مربوط؛ DocumentManager آن را خراب نکن. بخش‌های اسناد خود ردیف Local، اگر همچنان سطح مجاز موجود هستند، با همان رفتار مستندات نگه داشته شوند و به API رابطه تبدیل نشوند؛ draft رابطهٔ جدید تا داشتن ID سندِ مستقل ندارد.
6. چهار Scope، چهار Assignment، دو classification و چهار Policy collection را با toolbar جمعی، metadata editor بدون Save ردیف، picker چندانتخابی و filter/status مشترک تطبیق بده.
7. Owners، Organization Objectives، Objective Organizations و Global Control Regulations را کامل کن؛ restored ID و سه lifecycle canonical واقعی باشند.
8. تمام inverseها، projection محاسباتی، structural Requirements و LocalReverseListها را فقط در نمایش یکسان کن؛ Import مستقل را طبق بند ۱۰ منتقل کن.
9. parent header/value helpهای همهٔ نوع‌ها، activeTab preservation و 70٪ viewport همهٔ hostها و مودال Control توکار را تکمیل کن. Main tree DnD، cache نسخه و expansion/selection حفظ شوند.
10. dead prop/import/translation را فقط در مسیر واقعاً بدون مصرف حذف کن؛ فایل‌های unrelated/کاربر و Coverage source نگهداری‌شده را دست نزن. AGENTS و accepted correction مرتبط را با قرارداد نهایی هماهنگ کن؛ گزارش پوشش ۲۶ family و همهٔ inverseها تولید کن.

فایل‌های مشترک فعال که در ممیزی دیده شدند و باید آگاهانه reuse/تکمیل شوند:

- `U/shared/components/CatalogActionButton.tsx` و `catalog-actions.css` برای یکدستی عرض و design.
- `U/shared/components/CatalogParentHeader.tsx` و `modal-layout.css` برای parent/root/required.
- `U/shared/components/DialogFooter.tsx` و `ModalDialogHeader.tsx` برای slot بومی footer/header.
- `U/shared/components/HierarchyMultiSelectionDialog.tsx` برای انتخاب سلسله‌مراتبی.
- `U/shared/components/ReferenceRelationTable.tsx` برای inverseهای Assignment.
- `U/shared/components/PersianDatePicker.tsx` و `U/shared/hooks/useUnsavedChangesGuard.ts` برای metadata/dirty/readiness.
- `U/features/local-master-data/hooks/useOrganizationTableViewport.ts` برای مهاجرت منطق اندازه‌گیری، نه حفظ وابستگی کلاس Organization در helper مشترک.
- `U/shared/infra/http.client.ts`: امضای `post(url, body, options)` است؛ body را داخل `{ body: ... }` نپیچ.
- `M/revision/application/TransactionalMasterDataRevisionCoordinator.java` و `RevisionMutationGuard.java`؛ `M/shared/infrastructure/persistence/JpaMasterDataHierarchyGuard.java`؛ `A/datasetprofile/application/ProfileTransactionPolicy.java`؛ generic command framework جای آنها نساز.

Feature exportها از `index.ts` نگه داشته شوند. i18n سطح feature (fa/en) و root `U/i18n/locales/fa.json/en.json` به اندازهٔ موردنیاز هماهنگ شوند. metadata enum labels فارسی باقی بمانند؛ نام‌های مدیریتی Basic Data را با enum ثابت جایگزین نکن. migration V1201 نام‌های پیش‌فرض Organization Type را اصلاح می‌کند و خارج از تغییر حاضر دست‌نخورده بماند.

## ۱۵. معیار پذیرش ایستا؛ بدون ایجاد یا اجرای تست

این فهرست **چک‌لیست بازخوانی سورس** است؛ test file، unit/integration/E2E، fake server، browser script، اجرای اپ یا اتصال DB برای آن نساز:

- برای تک‌تک L1–L9، B1، O1، S1–S4، A1–A4، C1–C2، P1–P4، G1 در گزارش بگو مالک Save، فایل UI، DTO، canonical response و وضعیت پیاده‌سازی چیست. جدول فقط‌خواندنی بند ۶ نیز پوشش صریح داشته باشد. یک family را به عنوان نمونه تحویل نده و باقی را TODO نگذار.
- در UIهای editable هیچ write فوری relation، Edit/Save/Cancel مستقل، Restore یا row Undo mount نشود. تأیید/انصراف SearchDialog و Save/Cancel اصلی و ابزار Import مستقل استثناهای صریح‌اند.
- persisted ACTIVE/INACTIVE درست نمایش داده شوند؛ persisted DELETED غایب؛ pending DELETE آبی؛ restored pair همان ID؛ new-delete بدون درخواست؛ batch مخلوط فقط ردیف متفاوت را تغییر دهد؛ بازگشت به baseline draft را حذف کند.
- فیلترها انتخاب نشده/فعال/غیرفعال؛ pending row از دید کاربر گم نشود. inverseها mutation نداشته باشند. derived Account Groups جدول یا changes مستقیم جدید نداشته باشد.
- picker جستجو، چندانتخاب، hierarchy، duplicate exclusion، loading/error، صفحه‌بندی کامل و pending dirty/readiness داشته باشد. uncheck در picker حذف رابطه ایجاد نکند. والد ساختاری تک‌انتخاب بماند.
- metadata تخصصی و تاریخ نامعتبر از بین نرود. source Local و scope دقیق P3/P4 حفظ شود. Field stripping در schema/normalize/repo وجود نداشته باشد.
- Create بدون ID نیز draftهای مجاز را بپذیرد. Save relation-only فعال باشد؛ View read-only؛ profile/permission/role eligibility داخل backend حفظ شود.
- Save اصلی تنها mutation aggregate؛ parent + status + details + relation drafts + Documents در transaction مشترک؛ مرکزی/محلی در Revisionهای جدا ولی commit مشترک؛ رابطه‌های بدون تغییر Content تازه نسازند.
- همهٔ Guardها پیش از hierarchy read، lexical name order، targeted endpoint locks پیش از relation locks و commit/rollback مشترک در سورس قابل ردیابی باشند. restrictionهای required parent و root جدول ۷ در UI و backend هر دو برقرار باشند.
- تب جاری پس از Edit/Save و draftها با تعویض تب حفظ شوند. close/navigation/unload guard شامل pending picker، metadata invalid و اسناد باشد. خطا draft را حفظ کند؛ refresh failure پس از commit به معنای تکرار mutation نباشد.
- هر host واقعی و هر جدول active، سقف/بودجهٔ مشترک ۷۰٪ و دو محور scroll داشته باشد؛ چند جدول یک تب بودجه را چندبرابر مصرف نکنند. header/footer از scroll ناپدید نشوند.
- migration فقط forward و فقط دو constraint pair لازم را تغییر دهد؛ جدول، UUID، profile، uniqueness، audit history و stored Revision entity codes عوض نشوند. generated assets و migrationهای V1187/V1197/V1201 بازنویسی نشوند.

فرمان‌های مجاز پایان اجرا، از زیرپروژهٔ مربوط:

```powershell
# grcpc-app — فقط compile، بدون تست و بدون build UI
.\mvnw.cmd -o -Dskip.ui=true -Dmaven.test.skip=true compile

# grcpc-ui
npm run typecheck
npm run lint

# repository root
git diff --check
```

از JDK 21 موجود استفاده کن؛ اگر JAVA_HOME نامعتبر است تنها محیط همان فرمان را به JDK موجود ارجاع بده، تنظیم سراسری/نصب ابزار نکن. اگر dependency آفلاین یا JDK موجود نیست، محدودیت را گزارش کن؛ به package/test، build/run یا نصب/اتصال خارجی تغییر مسیر نده. typecheck/lint/compile اثبات runtime UI، SQL Oracle یا concurrency واقعی نیستند.

## ۱۶. قالب تحویل پیاده‌سازی

تحویل باید شامل خلاصهٔ رفتار نهایی فارسی، فایل‌های مهم UI/backend/migration، جدول پوشش familyها و read-onlyها، فرمان‌های اجراشده و نتیجهٔ واقعی، اثر migration، و برای هر aggregate جدید کلیدهای hierarchy، entry pointهای guarded، ترتیب lock و مرز transaction/Revision باشد. صریح بنویس تست/MCP/اپ/Flyway/DB/browser و concurrency واقعی اجرا نشده‌اند. در گزارش از ادعای آزمون موفق مواردی که فقط source-review شده‌اند خودداری کن.

محدودیت کار سخت یا بزرگ بودن، مجوز تحویل بخشی از تب‌ها یا پیاده‌سازی فقط ظاهری نیست. همهٔ ردیف‌های inventory و استثناهای مشخص‌شده باید وضعیت نهایی قابل بازبینی داشته باشند.
