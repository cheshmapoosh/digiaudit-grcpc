# پوشش ایستای والد، میزبان مودال و پاسخ canonical

این گزارش مربوط به تحویل یکسان‌سازی مودال‌های حاکمیت در ۲۰۲۶-۱۰-۲۸ است. شواهد زیر بازخوانی سورس‌اند؛ آزمون UI، اجرای برنامه، Flyway، Oracle، MinIO و آزمون هم‌زمانی واقعی انجام نشده‌اند. گزارش‌های خانواده‌های رابطه در فایل‌های مجاور، پوشش L/B/O/S/A/C/P/G را تکمیل می‌کنند.

## Update اتمیک والد

همهٔ PATCHهای زیر یک command می‌فرستند. `parentChange == null` والد قبلی را حفظ می‌کند؛ object حاضر با ID داخلی null فقط در خانوادهٔ ریشه‌پذیر والد را پاک می‌کند. `status` و `sortOrder` حذف‌شده از درخواست، مقدار persisted را حفظ می‌کنند. Browser جدید هر سه مقدار نهایی را صریح می‌فرستد. ACTIVE/INACTIVE مجاز و DELETED در Update نامجاز است.

| نوع | DTO / parentChange | PATCH زیر `/api/master-data/central` | Guardها به ترتیب لغوی | canonical entity |
| --- | --- | --- | --- | --- |
| Account Group | `CentralAccountGroupDtos.Update / ParentChange.parentAccountGroupId` | `/account-groups/{id}` | ACCOUNT_GROUP | `AggregateResponse.entity: Detail` |
| Risk Category | `UpdateCentralRiskCategoryRequest / ParentChange.parentCategoryId` | `/risk-categories/{id}` | RISK | `CentralRiskCategoryAggregateResponse.entity` |
| Risk Template | `UpdateCentralRiskTemplateRequest / ParentChange.riskCategoryId`، اجباری | `/risk-templates/{id}` | CONTROL → RISK | `CentralRiskTemplateAggregateResponse.entity` |
| Regulation Group | `CentralRegulationDtos.UpdateGroup / GroupParentChange.parentGroupId` | `/regulation-groups/{id}` | REGULATION | `GroupAggregateResponse.entity` |
| Regulation | `CentralRegulationDtos.UpdateRegulation / RegulationParentChange.regulationGroupId`، اجباری | `/regulations/{id}` | REGULATION | `RegulationAggregateResponse.entity` |
| Requirement | `CentralRegulationDtos.UpdateRequirement / RequirementParentChange.regulationId`، اجباری | `/regulation-requirements/{id}` | CONTROL → REGULATION | `RequirementAggregateResponse.entity` |
| Policy Group | `CentralPolicyDtos.UpdateGroup / GroupParentChange.parentGroupId` | `/policy-groups/{id}` | POLICY | `GroupAggregateResponse.entity` |

فایل‌های مالک، `CentralAccountGroupCommandService`، دو `CentralRisk*CommandService`، سه `CentralRegulation*CommandService` و `CentralPolicyGroupCommandService` در packageهای فعال `masterdata/catalog` هستند. هر Update از `executeStructural` استفاده می‌کند؛ حفاظت زندهٔ پروفایل و ADMINISTRATION از `ProfileTransactionPolicy` روی transaction coordinator اعمال می‌شود. Guard پیش از callback و هر hierarchy read گرفته می‌شود. پس از source row lock، parent/cycle/eligibility و نسخه بررسی، وضعیت نهایی روی entity اعمال، یک بار source flush، Documents با قرارداد قبلی finalize و یک CENTRAL Revision با یک owner UPDATE Content ثبت می‌شود. هیچ زنجیرهٔ Browser شامل Update + Move + Lifecycle باقی نمانده است. مسیرهای مستقل Move/Lifecycle برای مصرف‌کنندگان دیگر حفظ شده‌اند.

NO_CHANGE، علاوه بر اطلاعات عمومی و Documents، parent، sortOrder و status نهایی را مقایسه می‌کند. تغییرات منبع، اسناد، snapshot و Revision در همان transaction قرار دارند. کلید hierarchy جدید، migration والد یا جدول تازه ایجاد نشده است. قفل endpointهای سلسله‌مراتبی از Guardهای موجود استفاده می‌کند؛ Control Objective مستقل باقی مانده است.

Control Save نیز null بودن Control Group را در backend رد می‌کند. Controlهای قدیمی بدون گروه همچنان خواندنی‌اند و برای Save به گروه معتبر نیاز دارند.

## والد و حفظ پیش‌نویس

- Organization، Process، Control Group، Risk Category، Regulation Group، Policy Group، Account Group و Global Control Group می‌توانند ریشه باشند. clear فقط برای والد موجود در Create/Edit، با UI5 Negative و حالت busy غیرفعال دیده می‌شود.
- Subprocess، Control، Risk Template، Regulation، Requirement، Policy، Business Objective و Global Control والد اجباری دارند. Strategy همیشه ریشه و Control Objective کاتالوگ مستقل است.
- انتخاب والد با `CatalogActionButton` و UI5 Emphasized انجام می‌شود. picker ساختاری تک‌انتخاب باقی مانده است؛ self/descendant و eligibility موجود حفظ شده‌اند.
- باز بودن picker والد به dirty و Save readiness فرم‌های مالک افزوده شده است. تغییر تب draft را پاک نمی‌کند؛ Edit/Save همان entity، تب معتبر قبلی را نگه می‌دارند.

## میزبان‌های فعال

همهٔ میزبان‌های زیر `catalogObjectDialog` و marker محتوای `data-catalog-dialog-content` دارند. CSS مشترک `modal-layout.css` برای Dialog سقف `70vh` با `70dvh` تعیین می‌کند؛ height ثابت ندارد. header/footer در slot بومی UI5 باقی مانده‌اند. `CatalogTableViewport` و hook مشترک، بودجهٔ جدول‌های visible را از همین marker می‌خوانند.

| میزبان در `grcpc-ui/src/features` | پوشش |
| --- | --- |
| `organization/pages/OrganizationsFclShellPage.tsx` | Organization و همهٔ tabهای کنترل‌شدهٔ آن |
| `process/pages/ProcessesFclShellPage.tsx` | Process/Subprocess |
| `control/pages/CentralControlsFclShellPage.tsx` | Control Group/Control |
| `control/components/CentralControlDialog.tsx` | Control توکار صفحهٔ Process؛ `initialSubprocess` حفظ شده |
| `control-objective/pages/CentralControlObjectivesFclShellPage.tsx` | Control Objective |
| `risk/pages/CentralRiskPage.tsx` | Category/Template و دو inverse Control Center |
| `regulation/pages/CentralRegulationsPage.tsx` | Group/Regulation/Requirement |
| `policy/pages/CentralPoliciesPage.tsx` | Group/Policy و collectionهای typed |
| `account-group/pages/CentralAccountGroupsPage.tsx` | Account Group و inverseها |
| `objective/pages/ObjectiveManagementPage.tsx` | Strategy/Objective؛ گزارش B1 |
| `global-control/pages/GlobalControlManagementPage.tsx` | Global Control Group/Global Control؛ گزارش G1 |

## canonical، inverse و Import

Create/Update هفت خانوادهٔ والد، entity کامل canonical را برمی‌گردانند. Policy، Control و Control Objective نیز entity typed و collectionهای canonical خود را برمی‌گردانند. میزبان‌ها نتیجهٔ mutation را پیش از refresh اختیاری اعمال می‌کنند؛ شکست refresh به معنی شکست Save یا مجوز ارسال دوبارهٔ Create/Restore نیست. Process، Control و Control Objective، canonical Scope/Assignment/classification را به propهای `canonicalRows` یا `adoptedCanonical` می‌دهند. cache با نسخهٔ برابر نگه داشته می‌شود و merge هر رابطه، بالاترین version را ترجیح می‌دهد.

`RegulationRequirementsTab` فرزندان ساختاری Requirement را با جدول UI5، کد/نام/status/validity، جستجو و فیلتر ACTIVE/INACTIVE نمایش می‌دهد؛ checkbox عملیاتی و عملیات رابطه ندارد. طبق اصلاح صریح مالک در بند ۱۰ پرامپت جاری، Import Excel در toolbar همین تب «الزام‌ها»ی مودال قانون باقی مانده است و جابه‌جایی قبلی به منوی ایجاد صفحه برگردانده شد. مقصد، قانون ذخیره‌شدهٔ همان مودال است؛ مجوز GOVERNANCE manage، وضعیت حذف‌نشده و جلوگیری از Import در Edit یا با draft ذخیره‌نشده حفظ شده‌اند. dialog، preview، template و command/Revision اصلی Import مستقل حفظ شده‌اند؛ پس از موفقیت، فهرست همان قانون تازه‌سازی و تب «الزام‌ها» حفظ می‌شود. preview در viewport مشترک دو محور scroll دارد.

Local Workspace فقط جدول‌های visited یا دارای draft را mount می‌کند و آنها را هنگام تعویض تب/Context نگه می‌دارد. Context و Scope pending در selectorهای typed قابل ارجاع‌اند؛ حذف Scope تازه، Policy draft وابسته را پنهان نمی‌کند و آن را unavailable و قابل حذف نگه می‌دارد. Save تا رفع reference معلق مسدود است. به Context/Scope با وضعیت نهایی DELETED انتخاب تازه اضافه نمی‌شود. دادهٔ paginated کامل خوانده می‌شود. context/target/rowهای query فقط با دادهٔ متعلق به همان Organization تطبیق می‌یابند؛ normalization انتخاب ناسازگار هنگام picker، تاریخ نامعتبر یا سند dirty به تعویق می‌افتد. نام مقصد Link مجاز با navigation guard مالک است؛ UUID به عنوان label گزینهٔ ناقص نمایش داده نمی‌شود.

DocumentManager، temporary upload، نوع مستند و finalize روی Save مالک تغییر قرارداد نداده‌اند. اسناد مستقل ردیف Local موجود در همان سطح مجاز باقی مانده‌اند و برای draft فاقد ID، سند مستقل ساخته نمی‌شود. Coverage UI mount نشده و API/schema/dependency نگهداری‌شدهٔ آن تغییر ماهیت نداده است.

## بررسی مجاز

فرمان‌های مجاز فقط offline backend compile با JDK 21 و `-Dskip.ui=true -Dmaven.test.skip=true`، UI typecheck/lint و `git diff --check` بوده‌اند. نتیجهٔ نهایی فرمان‌ها در گزارش اصلی تحویل ثبت می‌شود. هیچ تستی ایجاد، ویرایش یا اجرا نشده است؛ بررسی هم‌زمانی این تحویل صرفاً ردیابی سورس Guard/transaction/lock ordering است.
