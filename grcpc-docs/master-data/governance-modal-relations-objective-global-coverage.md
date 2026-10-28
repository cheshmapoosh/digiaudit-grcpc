# پوشش L1، B1 و G1 در یکسان‌سازی مودال‌ها

این گزارش، بازخوانی ایستای سورس در تحویل ۲۰۲۶-۱۰-۲۸ است. اجرای UI، Oracle، Flyway یا تراکنش هم‌زمان مبنای هیچ‌یک از نتایج زیر نیست. گزارش جامع تحویل، نتیجهٔ آخرین بررسی‌های کل مخزن را ثبت می‌کند.

## پوشش خانواده‌ها و قرارداد پاسخ

| خانواده | مالک Save و UI فعال | DTO و مسیر command | پاسخ canonical و نتیجه |
| --- | --- | --- | --- |
| L1 — Organization/Subprocess | Save اصلی Organization؛ `grcpc-ui/src/features/local-master-data/components/OrganizationSubprocessTable.tsx`؛ picker موجود `OrganizationSubprocessSearchDialog.tsx` | `LocalContextDraft` در UI به `LocalContextChange` تبدیل می‌شود؛ `subprocesses` در Create/Update سازمان؛ اجرا در `OrganizationLocalAggregateService` | `localRelationships.contexts` شامل `LocalContextRow`های دست‌خورده، با ID/version واقعی و tombstone حذف است. جدول delta را با baseline کامل و نسخهٔ جدیدتر ادغام می‌کند؛ GET صفحه‌بندی‌شدهٔ `allContexts` نیز بعد از تغییر نسخه دوباره خوانده می‌شود. |
| B1 — Organization/Business Objective، سطح Organization | Save اصلی Organization؛ `OrganizationObjectivesTab.tsx` و `OrganizationObjectiveRelations.tsx` به‌صورت controlled | `OrganizationObjectiveChange`؛ فیلد `organizationObjectiveChanges`، با `objectiveId`؛ `OrganizationObjectiveService.prepareForOrganization/apply` در aggregate سازمان | `localRelationships.objectives` از `canonicalForOrganization`؛ `OrganizationObjectiveDtos.Detail` شامل هویت، نسخه و تمام metadata محلی است. tombstone صرفاً reconciliation داخلی است و رندر نمی‌شود. |
| B1 — همان رکورد، سطح Objective | Save اصلی Objective؛ تب Organizations در `ObjectiveManagementPage.tsx` همان renderer و draft typed را استفاده می‌کند | `ObjectiveDtos.Create/Update.organizationChanges` با `organizationId`؛ `prepareForObjective/apply` | `ObjectiveDtos.AggregateResponse` شامل خود Objective، نسخهٔ مالک، اسناد نهایی و `OrganizationLink`های canonical، شامل ID/version، توضیح، owner متنی، تاریخ و lifecycle رابطه است. `canonicalForObjective` tombstone را نیز برای reconciliation داخلی برمی‌گرداند. |
| G1 — Global Control/Regulation | Save اصلی Global Control؛ `GlobalControlManagementPage.tsx` و `GlobalControlRegulationsTab.tsx` | `GlobalControlDtos.Create/Update.regulationChanges`؛ `GlobalControlRegulationDtos.Change`؛ `GlobalControlRegulationService.prepare/apply` | `GlobalControlDtos.AggregateResponse` شامل Global Control canonical و روابط جاری با `id/version/status/regulationStatus` است. وضعیت خود قانون با وضعیت رابطه یکسان فرض نمی‌شود. |

هر دو surface خانوادهٔ B1 همان جدول و زوج یکتای `organization_objective` را تغییر می‌دهند؛ inverse جدید، کپی رابطه یا جدول جدید ساخته نشده است. Strategy به Organization تخصیص داده نمی‌شود. G1 نیز همان جدول `global_control_regulation` را حفظ می‌کند و فیلد تاریخ جدیدی ندارد.

## رفتار جدول و draft

- هر سه خانواده از `CatalogRelationTable`، `CatalogRelationToolbar` و viewport مشترک استفاده می‌کنند؛ L1 از `CatalogRelationStatus` نیز استفاده می‌کند. انتخاب ردیف با `TableSelectionMulti` و کلید پایدار زوج است.
- ابزار نوشتن فقط انتخاب، فعال‌سازی، غیرفعال‌سازی و حذف گروهی است. View کنترل نوشتن یا checkbox عملیاتی ندارد. Save/Edit/Cancel مستقل رابطه، Restore نمایشی، Undo ردیفی و write فوری در کامپوننت‌های فعال وجود ندارد.
- فیلتر فقط ALL با متن «انتخاب نشده»، ACTIVE و INACTIVE است. draft در هر فیلتر وضعیت دیده می‌شود. جستجو و فیلتر انتخاب‌های قبلی را پاک نمی‌کنند؛ select-all مشترک فقط کلیدهای قابل مشاهده را تغییر می‌دهد.
- ACTIVE روی ACTIVE و INACTIVE روی INACTIVE، draft تازه تولید نمی‌کند. در batch مخلوط، فقط ردیف واجد شرایط با وضعیت متفاوت تغییر می‌کند. بازگشت lifecycle به baseline، در نبود تغییر metadata، draft را حذف می‌کند. backend نیز plan بی‌تغییر را از Revision Content رابطه کنار می‌گذارد.
- حذف انتخاب جدید یا restore ذخیره‌نشده، خود draft را حذف می‌کند و create/restore سپس delete ارسال نمی‌شود. new/restore تا اولین Save فعال است و lifecycle غیرفعال‌سازی جعلی ندارد. حذف persisted، draft آبی حذف می‌سازد؛ پس از پاسخ canonical، tombstone رندر نمی‌شود.
- L1 در بازیابی `contextId/version` قبلی را نگه می‌دارد. B1/G1 در بازیابی persisted، ID/version همان رابطه را می‌فرستند؛ برای CREATE_OR_RESTORE زوج حذف‌شده نیز ID/version بررسی می‌شود. انتخاب دوبارهٔ pending DELETE، حذف را لغو می‌کند؛ B1 draft معتبر metadata قبل از حذف را نیز نگه می‌دارد.
- name محلی، description، owner متنی و validFrom/validTo در B1 داخل ردیف و بدون Save جدا ویرایش می‌شوند. تاریخ نامعتبرِ قابل مشاهده، dirty و عدم آمادگی Save اصلی را گزارش می‌کند. تغییر صرف metadata «پیش‌نویس ویرایش» است.
- pickerها جستجو و انتخاب چندتایی افزایشی دارند؛ لغو انتخاب یک نتیجه باعث DELETE رابطه نمی‌شود. Strategy، اجداد Organization و گروه‌های Regulation غیرقابل انتخاب‌اند. فقط برگ ACTIVE واجد شرایط انتخاب می‌شود. بازبودن picker، حتی با انتخاب صفر، dirty و عدم آمادگی Save اصلی را گزارش می‌کند.
- `localSelectionHierarchy.ts` برای L2–L9 فقط دادهٔ نمایشی hierarchy را از APIهای typed موجود می‌خواند: Control Group/Control، Risk Category/Template، Regulation Group/Regulation/Requirement و Policy Group/Policy؛ Control Objective مستقل و تخت است. اجداد non-DELETED باقی می‌مانند و فقط برگ ACTIVE اولیه selectable است؛ جدول مالک، eligibility دقیق Local را با آن تقاطع می‌دهد. این helper هیچ mutation یا API عمومی Relation ندارد.

## اعتبارسنجی API و امنیت

`OrganizationObjectiveChange` عملیات CREATE_OR_RESTORE، UPDATE، ACTIVATE، INACTIVATE، DELETE و RESTORE را مدل می‌کند. `GlobalControlRegulationDtos.Change` عملیات lifecycle و CREATE_OR_RESTORE را دارد و metadata کسب‌وکاری ساختگی ندارد. collection تهی یا null، no-op است؛ element تهی، operation تهی، زوج تکراری و identity ناسازگار رد می‌شوند.

سمت Organization در B1 فقط `objectiveId` و سمت Objective فقط `organizationId` می‌پذیرد. operation روی persisted باید ID همان زوج و version معتبر داشته باشد. metadata روی lifecycle که آن را ویرایش نمی‌کند، به‌جای نادیده‌گرفتن بی‌صدا رد می‌شود. UPDATE، وضعیت DELETED نمی‌پذیرد. نام محلی خالی و owner بیش از ۲۵۵ نویسه و بازهٔ تاریخ معکوس رد می‌شوند. RESTORE بدون metadata از مقادیر قبلی استفاده می‌کند؛ مسیر CREATE_OR_RESTORE برای restore با ویرایش صریح metadata نیز هویت/نسخه را حفظ می‌کند.

Create/Restore/Activate در B1، نوع OBJECTIVE، ACTIVE بودن هدف و Strategy ریشهٔ non-DELETED را کنترل می‌کند. Strategy می‌تواند از لحاظ ساختاری INACTIVE باشد. G1، Global Control و Regulation فعال می‌خواهد. INACTIVATE/DELETE هویت و نسخهٔ رابطهٔ non-DELETED را کنترل می‌کنند. خواندن relationId به‌تنهایی مجوز عبور از مرز profile نمی‌دهد: filter خودکار `datasetProfile` با `applyToLoadByKey=true` و `ProfileEntityListener` موجود حفظ شده‌اند.

کنترل زندهٔ REFERENCE-manage برای B1 و CONTROL-manage برای G1 در prepare/apply و داخل تراکنش محافظت‌شده بررسی می‌شود. مجموعهٔ خالی B1 در Save سازمان، مجوز اضافی REFERENCE-manage تحمیل نمی‌کند. readهای جاری همان view permission قبلی را دارند و query داخلی `lifecycleStatus=DELETED` صرفاً lookup بازیابی است. پیوند مقصد در UI فقط با view permission مقصد نمایش داده می‌شود و ناوبری از router و guard تغییرات ذخیره‌نشده عبور می‌کند.

Browser جدید `organizationIds` یا `regulationIds` نمی‌فرستد. اگر caller قدیمی این فهرست‌ها را بفرستد، سرور آن را فقط به همان changeهای typed و prepare/apply تبدیل می‌کند؛ حضور هم‌زمان فهرست قدیمی و changes رد می‌شود. دیگر حلقهٔ assign/remove یا attach/remove با Revision جداگانه برای هر ردیف در aggregate وجود ندارد.

## Guard، قفل‌ها و تراکنش/Revision

| entry point | Guard پس از protected ADMINISTRATION | ترتیب endpoint/relation | مرز Revision و commit |
| --- | --- | --- | --- |
| Organization Create/Update، شامل L1 و B1 | union کامل root aggregate؛ برای L1، ORGANIZATION/PROCESS؛ برای B1، OBJECTIVE/ORGANIZATION، همگی با ترتیب لغوی name | سازمان/Subprocess و endpointهای Local طبق union؛ `lockOrganizationEndpoints` فقط Objectiveهای مرتب را پیش از relation lock می‌گیرد؛ prepare بعدی فقط همان قفل‌های موجود را دوباره می‌گیرد و سپس زوج‌ها را قفل می‌کند | CENTRAL مالک و Owners؛ یک LOCAL مشترک L1–L9/B1 با causedBy به CENTRAL؛ همهٔ منبع‌ها و اسناد در outer transaction سازمان |
| Objective Create/Update | OBJECTIVE سپس ORGANIZATION، پیش از hierarchy/parent/dependency read | Organizationهای درگیر مرتب، Objective موجود، سپس assignment pairهای مرتب؛ Create مالک هنوز row ندارد | `@Transactional` در `ObjectiveService`؛ یک CENTRAL مالک و برای هر سازمان دارای plan واقعی یک LOCAL با causedBy؛ همهٔ Revisionها، source و Documents یک commit/rollback |
| Global Control Create/Update، شامل G1 | GLOBAL_CONTROL سپس REGULATION، پیش از parent/endpoint read | مالک موجود با targeted lock، سپس Regulationهای مرتب، سپس pairهای رابطه | `@Transactional` در `GlobalControlService`؛ یک CENTRAL با owner-first Content و سپس G1 Content؛ source، version، Documents و canonical response در همان transaction |
| Global Control Group Create/Update | GLOBAL_CONTROL | اعتبارسنجی والد/چرخه در همان command قبلی | یک mutation و یک CENTRAL؛ پاسخ `ControlGroupDtos.MutationResponse` خود entity canonical را نیز می‌دهد |

prepare/applyهای B1/G1 دارای propagation MANDATORY هستند. prepare، plan معتبر و snapshot اولیه می‌سازد و رابطه‌ای نمی‌نویسد؛ apply فقط plan را اعمال و `RevisionContentResult` typed می‌دهد. از REQUIRES_NEW، retry خودکار، قفل حافظه‌ای، Guard جدید یا lock جدول استفاده نشده است. Objective Update برای eligibility، kind/parent/name نهایی را روی projection غیرmanaged اعتبارسنجی می‌کند تا queryهای prepare باعث flush زودهنگام تغییر مالک نشوند. Update کاملاً بی‌تغییر B1/G1، با NO_CHANGE رد می‌شود.

در Objective، plan رابطه داخل callback محافظت‌شدهٔ CENTRAL آماده می‌شود؛ اجرای LOCAL بعد از برگشت `executeStructural` و ذخیرهٔ header مرکزی انجام می‌شود. این ترتیب، FK فوری `fk_masterdata_revision_caused` را رعایت می‌کند. هر دو مرحله همچنان داخل همان outer transaction هستند و قفل‌ها آزاد نمی‌شوند؛ شکست LOCAL، CENTRAL/منبع/اسناد را نیز rollback می‌کند. ثبت LOCAL در callback پیش از وجود header مرکزی انجام نمی‌شود.

## Strategy، والد، host و اسناد

Strategy همچنان ریشه با والد null است؛ Objective دقیقاً یک Strategy ریشه دارد. فرم Strategy فقط General/Documents دارد و Organization picker/options/relations برای آن mount یا load نمی‌شود. picker رابطه چندانتخابی است؛ picker والد Strategy تک‌انتخابی و required باقی می‌ماند. Global Control گروه اجباری دارد؛ فقط Global Control Group می‌تواند والد را با اقدام UI5 Negative به null تبدیل کند. اقدام انتخاب والد Emphasized است.

hostهای Objective و Global Control سقف `70dvh` با fallback `70vh` و marker مشترک `data-catalog-dialog-content` دارند. جدول‌ها از بودجهٔ اندازه‌گیری‌شدهٔ مشترک و scroll دو محور استفاده می‌کنند. activeTab در Edit/Save همان entity حفظ می‌شود و تغییر تب draft را unmount نمی‌کند. footer/header بومی Dialog و منطق `DocumentManager` حفظ شده‌اند. main-tree DnD و provider ترتیب‌گذاری به picker یا رابطه وارد نشده‌اند.

stateهای Objective و Global Control/Group، نتیجهٔ canonical mutation را در cache اعمال می‌کنند؛ refresh GET جزئی از موفقیت Save نیست. خطای mutation، draft را پاک نمی‌کند. خطای دریافت جدول، پیام و retry صرفاً خواندنی دارد. بستن/ناوبری/unload از dirty/readiness موجود استفاده می‌کند.

## migration و بررسی ایستا

`V1202__relationship_inactive_status.sql` فقط دو constraint pair موجود را گسترش می‌دهد: `ck_org_owner_status/ck_org_owner_deleted` و `ck_global_control_reg_status/ck_global_control_reg_deleted`. status مجاز ACTIVE/INACTIVE/DELETED است و deleted metadata برای هر وضعیت non-DELETED باید null باشد. هیچ row، UUID، profile، version، unique pair، audit history یا stored Revision code تغییر نمی‌کند. V1187، V1197 و V1201 بازنویسی نشده‌اند؛ migration اجرا نشده است.

در جریان این زیرکار `npm run typecheck` یک نوبت موفق بود. نوبت بعد از ادغام L1 فقط mismatch مربوط به null در prop سطح Organization را نشان داد که برای اصلاح به مالک همان فایل گزارش شد؛ نتیجهٔ نهایی کل مخزن در گزارش جامع درج می‌شود. یک اجرای کامل `npm run lint` با exit 0، بدون error و پنج warning در فایل‌های خارج از این زیرکار تمام شد. `git diff --check` برای مسیرهای این زیرکار با exit 0 انجام شد. پس از تکمیل آخرین ادغام، compile/typecheck/lint نهایی در مسیر هماهنگ‌شدهٔ کل تحویل انجام می‌شود؛ این متن مدعی تأیید runtime نیست.

تستی ایجاد، ویرایش یا اجرا نشده است. MCP، مرورگر، computer-use، اپلیکیشن، Flyway، Oracle/DB، MinIO، سرویس خارجی و تست هم‌زمانی واقعی اجرا نشده‌اند.
