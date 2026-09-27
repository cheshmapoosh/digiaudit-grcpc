# گزارش بازبینی Prompt 8

تاریخ: ۲۰۲۶-۰۹-۲۵

**نتیجه: هدف‌های اصلی در متن اولیه پوشش داده شده‌اند، اما متن برای اجرای بدون تصمیم‌گیری تجاری آماده نبود. اجرای لفظ‌به‌لفظ آن می‌توانست پیاده‌سازی ناقص Documents، شکست راه‌اندازی JPA، تفاوت ناخواسته در lifecycle، یا از دست رفتن draftهای UI ایجاد کند.** این‌ها ریسک ناشی از جاافتادگی قرارداد هستند؛ ادعا نمی‌شود که اکنون چنین شکست‌هایی در اجرای برنامه مشاهده شده‌اند.

نسخهٔ جایگزین در [prompt-8-reviewed.md](prompt-8-reviewed.md) قرار دارد. این نسخه مستقل است و باید به‌جای متن اولیه به مجری داده شود؛ ترکیب دو متن، تعارض‌های قدیمی را دوباره وارد کار می‌کند.

### اصلاح تکمیلی نسخهٔ بازبینی‌شده

در بازخوانی بعدی دو ناسازگاری اجرایی در خود نسخهٔ جایگزین پیدا و رفع شد: پاسخ lifecycle در یک بند دقیقاً `{version}` و در بند دیگر برای DELETE شامل `row` تعریف شده بود؛ اکنون هر چهار lifecycle فقط `{version}` برمی‌گردانند و ردیف DELETED از detail قابل خواندن است. همچنین کد فعلی Backend هیچ `BusinessException` با HTTP 400 ندارد و `ApiExceptionHandler` عمومی خطاهای parse را به 500 می‌فرستد. پرامپت اکنون exception اختصاصی برای خطای معنایی Local و handler محدود به کنترلرهای Local برای خطای parse را الزام می‌کند تا رفتار Central تغییر نکند. این‌ها اصلاح قرارداد پرامپت هستند، نه تأیید اجرای runtime.

## مبنای بررسی و محدودیت مدل

- شاخهٔ واقعی: `feature/master-data-v2-greenfield`.
- HEAD واقعی و HEAD پرامپت یکسان: `a83965fb6cefe41e069057f175e2f329a4a1b009`.
- working tree پیش از تهیهٔ خروجی‌های این بازبینی پاک بود.
- بررسی شامل فایل الصاق‌شده، migrationهای V1164/V1183، قراردادهای Master Data، دستورهای AGENTS، پیاده‌سازی Revision/Guard، dependency checker، مجوزها، Documents و صفحه‌های مربوط UI بود.
- هیچ کد برنامه، migration، تنظیم امنیت، جدول یا داده‌ای تغییر نکرد. فقط دو سند بازبینی ایجاد شدند.
- مدل درخواستی شما **GPT-6 Astra / Extra High** است. `gpt-6-astra` از `xhigh` پشتیبانی می‌کند؛ [مستند رسمی مدل](https://developers.openai.com/api/docs/models/gpt-6-astra). ابزار این جلسه امکان تغییر مدل همین پاسخ یا تأیید مستقل تنظیم فعلی آن را فراهم نکرد. بنابراین این خروجی گواهی بازبینی انجام‌شده با مدل درخواستی نیست. نام مدل داخل پرامپت، مدل در حال اجرا را تغییر نمی‌دهد.
- خروجی نهایی این نوبت بازبینی پرامپت است، نه پیاده‌سازی آن. فقط کامپایل Backend موقتِ بازگردانده‌شده انجام شد؛ تست، startup، درخواست تغییردهندهٔ API یا بررسی تراکنش هم‌زمان انجام نشد.

منظور عملی از «Codex مجبور به تحلیل و استنتاج نباشد» باید **عدم واگذاری تصمیم تجاری، رفتار API، قواعد اعتبار/مجوز و مالکیت تراکنش به مجری** باشد. فهم کد، طراحی جزئیات فنی و رفع خطای کامپایل را نمی‌توان از کار پیاده‌سازی حذف یا تضمین کرد.

## یافته‌های اصلی با شواهد

| اولویت | مسئله در متن اولیه | شاهد وضعیت فعلی | اصلاح در نسخهٔ جایگزین |
| --- | --- | --- | --- |
| بالا | فقط ایجاد entityها خواسته شده؛ الزام ثبت runtime صریح نیست | `GrcpcPersistenceConfiguration.java:72` از `PersistenceManagedTypes.of` با فهرست بسته استفاده می‌کند | بخش ۳ ثبت دقیق ۱۳ entity و converterهای جدید را الزام می‌کند؛ تغییر scanning/DDL ممنوع می‌ماند |
| بالا | فعال‌سازی Documents به دو کلاس محدود شده است | `DocumentAuthorizationService.java:24` برای همهٔ Local targetها به مسیر رد دسترسی می‌رسد؛ resolver همچنین `assertMutable` جدا دارد | بخش ۱۱ شش نقطهٔ اتصال، مجوز ترکیبی، قفل target و دسترسی source-version/download را مشخص می‌کند |
| بالا | عبارت «همان transitionهای Central» با restore صریح Local تعارض عملی دارد | `CentralSubprocessControlScopeAggregateService.java:219` برای Create روی رکورد INACTIVE/DELETED، activate/restore می‌کند | بخش ۵ جدول مستقل Local، خطای duplicate/deleted-key، RESTORE به ACTIVE و لزوم version را تعریف می‌کند؛ Central تغییر نمی‌کند |
| بالا | «Guard اضافی موردنیاز» انتخاب کلیدها را به مجری واگذار می‌کند | enum واقعی `MasterDataHierarchyKey` شامل CONTROL است؛ بعضی registryهای قدیمی آن را ندارند | بخش ۷ جدول کامل Guard برای هر ۱۳ خانواده و assignment دارد؛ هیچ Guard جدیدی اضافه نمی‌شود |
| بالا | قفل Guard به‌تنهایی برای بعضی تعریف‌های مرجع کافی نیست | lifecycle در `CentralControlObjectiveCommandService.java:272` از coordinator عادی و قفل خود Objective استفاده می‌کند | بخش ۷ قفل دقیق تعریف Objective و سایر مرجع‌ها را پیش از اعتبارسنجی الزامی می‌کند؛ نقش permission با Guard مخلوط نمی‌شود |
| بالا | resolve کردن Organization پیش از ساخت RevisionRequest می‌تواند به خواندن پیش از Guard منتهی شود | `RevisionRequest.java:30` از ابتدا Organization می‌خواهد؛ coordinator چند Guard را در `TransactionalMasterDataRevisionCoordinator.java:73` می‌گیرد | ترتیب صریح outer REQUIRED transaction → Guard → ownership → coordinator در همان تراکنش تعیین شده است |
| بالا | تمام مسیرهای انتخاب‌گر و نمای معکوس و DTOهای آن‌ها تعیین نشده‌اند | متن اولیه فقط عنوان این قابلیت‌ها را می‌دهد؛ Local runtime در سورس مبنا موجود نیست | بخش‌های ۴ و ۸ مسیرها، پارامترها، payload، paging و پاسخ typed را تعیین می‌کنند |
| متوسط | Control create زیر Context می‌تواند به اشتباه همان DTO اتمیک را بگیرد | متن اولیه «همان field contract» را می‌گوید، درحالی‌که Context مالک Organization/Subprocess است | nested create فقط control/source/fields دارد؛ org/subprocess فقط در atomic assignment بدنه هستند |
| متوسط | وضعیت مجاز مرجع برای UPDATE، nullable dates، restore با تاریخ ناسازگار و مقدار null روشن نیست | قرارداد موجود containment برای inherited و Policy دارد؛ همهٔ جزئیات Local commands هنوز اجرا نشده‌اند | بخش ۵ ماتریس active/non-deleted، قواعد null، تاریخ‌های inclusive و خطای restore ناسازگار را ثابت می‌کند |
| متوسط | امکان تعمیم اشتباه containment به Coverage وجود دارد | `implementation-contract.md:301` اعتبار Coverage را مستقل از بازهٔ Scopeهای دو سر می‌داند | containment فقط نسبت به Central reference برای inherited باقی می‌ماند؛ Coverage-within-Local-Scope اضافه نمی‌شود |
| متوسط | مفهوم «کاربر eligible» و سه execution code باز است | `AppUserEntity` دارای enabled/locked است؛ سه enum Central فعلی vocabulary را فراهم می‌کنند | eligibility دقیق، selector حداقلی، enumها، null و عدم کپی خودکار recommendationها تعیین شده‌اند |
| متوسط | الزام عمومی مجوز می‌تواند به ممنوعیت کل تب یا افشای زیرقسمت‌ها منجر شود | مجوزهای فعلی GLOBAL هستند؛ Organization در REFERENCE قرار دارد | بخش ۶ ماتریس per-family دارد؛ Risk بدون CONTROL همچنان Scopeهای خودش را می‌بیند و Organization Policy بدون PROCESS کار می‌کند |
| متوسط | deep link و بازگشت از Central فقط به‌صورت هدف ذکر شده است | `OrganizationTabKey` فعلاً فقط general/documents است؛ shell در خط ۲۹۵ تب را reset می‌کند | بخش ۱۰ کلیدهای تب/query، ownership validation و حفظ انتخاب/refresh/back را تعریف می‌کند |
| متوسط | dirty state جدید می‌تواند با Saveهای مستقل از بین برود | `OrganizationsFclShellPage.tsx:231` فقط General Information و ORG Documents را ترکیب می‌کند | Local row/date/document dirty وارد guard مشترک می‌شود؛ هر Save فقط draft خودش را پاک می‌کند |
| متوسط | «حفظ dependency check» یک اثر مهم پنهان دارد | `MasterDataStructuralDependencyChecker.java:16` و `:31` Context را بدون فیلتر status می‌شمارند | طبق پاسخ صریح شما، حتی رفتار مسدودکنندگی بعضی Localهای DELETED نیز حفظ شد؛ فقط Local delete blockers اضافه می‌شوند |
| متوسط | دستور npm build ممکن است محل خروجی عادی را بازنویسی کند؛ tests skipped نیز می‌تواند فقط execution را متوقف کند | `package.json`، script ساخت UI و الگوی Maven موجود | خروجی UI به `.codex-build/prompt-8-ui` هدایت شد؛ Maven از `-Dmaven.test.skip=true` استفاده می‌کند |
| بالا در ارزیابی پذیرش | موفقیت package/lint/build ممکن است به‌اشتباه اثبات rollback/مجوز/هم‌زمانی تلقی شود | دستور صریح عدم اجرای تست، بررسی واقعی این رفتارها را محدود می‌کند | بخش‌های ۱۳ و ۱۴ «پیاده‌سازی شده» را از «در runtime تأیید شده» جدا می‌کنند |

مسیر ریشهٔ کلاس‌های Backend بالا، مگر runtime، `grcpc-app/src/main/java/com/digiaudit/grcpc/modules` است. فهرست کامل فایل‌های اتصال در بخش ۱۲ پرامپت جایگزین درج شده است.

## پوشش خواسته‌های متن اولیه

| خواسته | وضعیت در قرارداد جایگزین |
| --- | --- |
| Central Subprocess → Organization، ایجاد Context مستقل | حفظ شده؛ POST دقیق و رفتار تکرار/restore مشخص است |
| Central Control → Organization با Subprocess صریح | حفظ شده؛ Context و Control در یک transaction و یک LOCAL Revision |
| تکمیل هر ۱۳ جدول Local بدون generic framework | حفظ شده؛ ثبت JPA و registry نام‌ها/کلیدها تکمیل شده |
| source تاریخی، FK شرطی، Coverage هم‌Context | حفظ شده؛ تطابق inherited مستقل از source دو endpoint صریح شده |
| Policy مستقیم به central_policy و چهار target | حفظ شده؛ Organization/Context/Control/Requirement جدا هستند |
| شش تب Organization و مالک editor هر Coverage | حفظ شده؛ لینک read-only، URL و permission هر subsection تعیین شده |
| Local Save مستقل از Central aggregate و version سازمان | حفظ شده؛ draft reset و Document mode نیز روشن شده |
| selector owner و execution fields | حفظ شده؛ vocabulary و eligibility تعیین شده |
| reverse views برای Risk/Objective/Requirement/Policy | حفظ شده؛ هفت route typed و مقصد دقیق navigation تعیین شده |
| Documents برای ۱۳ target | حفظ شده؛ تمام مسیرهای permission/download/link/target lock اضافه شده |
| عدم تغییر DB، migration، ACL و عملیاتی‌ها | حفظ شده |
| عدم ایجاد/تغییر/اجرای تست | حفظ شده؛ محدودیت میزان اطمینان صریح است |
| حفظ رفتار حذف Central | مطابق پاسخ شما تثبیت شده؛ تاریخی‌های DELETED همچنان ممکن است مانع باشند |

## تصمیم‌های تکمیلی پیشنهادی این بازنویسی

موارد زیر «ویژگی اجراشدهٔ فعلی» یا «تصمیم قبلاً تأییدشدهٔ شما» معرفی نمی‌شوند. این‌ها پیشنهادهای صریح بازنویسی هستند تا مجری هنگام اجرا انتخاب تجاری نکند؛ اجرای همین نسخه به معنی انتخاب این قرارداد پیشنهادی خواهد بود:

1. PATCH کل مجموعهٔ editable را جایگزین می‌کند؛ مقدار nullable حذف‌شده از payload نیز null می‌شود. identity/source تغییرپذیر نیستند.
2. CREATE/ACTIVATE/RESTORE به dependencyهای ACTIVE نیاز دارند؛ PATCH با dependencyهای INACTIVE اما غیرحذف‌شده مجاز است؛ cleanup به active بودن مرجع وابسته نیست.
3. Context و LOCAL_ADDED Scope فقط ترتیب تاریخ خود را کنترل می‌کنند؛ containment اضافیِ اعلام‌نشده ایجاد نمی‌شود. inherited و Policy containmentهای مشخص دارند.
4. RESTORE فقط version می‌گیرد، به ACTIVE می‌رود و تاریخ/تنظیمات قبلی را حفظ می‌کند. اگر تاریخ قدیمی دیگر معتبر نیست، restore رد می‌شود و تاریخ بی‌صدا تغییر نمی‌کند.
5. owner باید enabled و unlocked باشد؛ هیچ شرط نقش/سازمان تازه‌ای اضافه نمی‌شود. null در تنظیمات Local به معنی فقدان مقدار است، نه fallback خودکار به Central.
6. صفحه‌بندی ۲۵ ردیف پیش‌فرض، حداکثر ۱۰۰، queryهای مشخص، DTOهای دقیق و codeهای خطای Local تثبیت شده‌اند.
7. Documents روی Local INACTIVE مجاز و روی Local DELETED تا restore ناموجود است؛ مجوزهای آن دقیقاً از خانوادهٔ Local می‌آید.
8. محل کد UI جدید `features/local-master-data` و قرارداد query URL برای tab/context/section/row مشخص شده است.

این‌ها دامنهٔ ۱۳ جدول، شش تب و عملیات اصلی شما را حذف نمی‌کنند. اگر یکی از این انتخاب‌ها مطلوب نیست، باید **پیش از اجرا همین سند** تغییر کند؛ مجری نباید در حین پیاده‌سازی آن را تفسیر مجدد کند.

## مرزهای هم‌زمانی و اطمینان

در بازنویسی، مرزهای مرتبط ORGANIZATION و PROCESS هستند و CONTROL/RISK/REGULATION/POLICY به‌صورت مشخص برحسب خانواده اضافه می‌شوند. Objective بدون Guard مستقل، قفل رکورد تعریف خودش را می‌گیرد. کلید ACCOUNT_GROUP چون classification تغییر نمی‌کند لازم نیست. Create/PATCH/activate/inactivate/delete/restore و assignmentها در یک transaction با LOCAL Revision قرار می‌گیرند؛ Documents transaction مستقل خود را نگه می‌دارند.

این نتیجه بر پایهٔ بررسی ایستای سورس است. **هیچ تضمین «خراب نشدن برنامه» از بازبینی متن یا کامپایل حاصل نمی‌شود.** با محدودیت فعلیِ عدم تست، اجرای Oracle/Hibernate، رفتار واقعی مرورگر/MinIO، rollback و تراکنش هم‌زمانِ حذف/ایجاد تأیید نشده‌اند. پرامپت جدید مجری را موظف می‌کند این موارد را در گزارش نهایی «اجرانشده» اعلام کند.

## خروجی و بررسی انجام‌شده

- فایل جدید: `grcpc-docs/master-data/prompt-8-reviewed.md` — پرامپت کامل جایگزین.
- فایل جدید: `grcpc-docs/master-data/prompt-8-review-fa.md` — همین گزارش، شواهد و تصمیم‌ها.
- بررسی‌های این بازبینی: `git rev-parse HEAD`، `git branch --show-current`، `git status --short`، جست‌وجوی `rg` و خواندن فایل‌های مرجع/کد، تطبیق registry با ۱۳ CREATE TABLE و کدهای Revision/Document، بررسی whitespace و diff اسناد.
- در بازخوانی تکمیلی، یک پیاده‌سازی آزمایشیِ ناقص Backend فقط تا مرحلهٔ کامپایل پیش رفت و سپس تمام فایل‌ها و تغییرات runtime آن از working tree برداشته شد؛ خروجی نهایی همچنان فقط دو سند بازبینی است. `docker ... ./mvnw -Dskip.ui=true -Dmaven.test.skip=true compile` برای آن کد موقت موفق شد، اما شاهدی برای صحت پرامپت نهایی، startup، Oracle یا UI نیست. تستی ساخته، کامپایل یا اجرا نشد. فرمان‌های مجازِ مرحلهٔ پیاده‌سازی در بخش ۱۴ نسخهٔ جایگزین آمده‌اند.
- هیچ migration/configuration/runtime change، commit، push یا PR انجام نشد.
