# قرارداد پذیرفته‌شدهٔ پروفایل دیتاست، کاربران و مالک سازمان

این قرارداد، اجرای بندهای ۱، ۱۲ و ۱۴ درخواست تأییدشدهٔ مالک پروژه در ۲۰۲۶-۱۰-۲۷ است. پروفایل، دیتاست مستقل سامانه است. این قرارداد در موضوع پروفایل و مالک سازمان بر محدودیت‌های قدیمی تعداد جدول و Greenfield تقدم دارد. قرارداد [Central reference Assignments](2026-10-27-central-reference-assignments.md) و معنای Scope، Assignment و Coverage تغییر نکرده‌اند؛ بند ۱۵ خارج از این تحویل است.

## هویت و اختیار

- حساب‌ها همان `app_user` و نشست ورود موجود هستند. فقط `root_user` واقعی اختیار سراسری دارد؛ کد یا authority قدیمی `ROOT_ADMIN` در حساب دیگر، اختیار root ایجاد نمی‌کند.
- تعریف نقش‌ها و مجوزهایشان مشترک و root-only باقی می‌ماند. انتساب عادی نقش، `user_role_assignment.profile_id` دارد؛ بارگذاری authority فقط از پروفایل درخواست انجام می‌شود. فیلد قدیمی GLOBAL/null به معنی دامنهٔ داخل همان پروفایل است، نه دسترسی بین دیتاست‌ها. انتساب‌های دارای دامنهٔ سازمانی موجود حذف یا به مالکیت سازمان تبدیل نمی‌شوند.
- نقش مدیریتی محفوظ `PROFILE_ADMIN` با عنوان «ادمین پروفایل» با `app_user.profile_admin` و ردیف‌های `profile_admin_access` اعطا می‌شود. تغییر این وضعیت و پروفایل‌های مجاز فقط برای root است. این حساب عضویت کاربر عادی در دیتاست ندارد. غیرفعال‌شدن تعریف این نقش نیز اختیار ادمین را متوقف می‌کند.
- کاربر عادی دقیقاً یک `app_user.profile_id` دارد. CHECK دیتابیس، FK، قفل حساب و هماهنگی تراکنشی مانع عضویت همزمان در چند پروفایل‌اند. فقط root می‌تواند پروفایل حساب عادی را تغییر دهد؛ وجود وابستگی مالکیت سازمان/کنترل، تغییر عضویت یا تبدیل آن حساب به ادمین مشترک را تا تعیین تکلیف مالکیت مسدود می‌کند. در تغییر پروفایل، فرم نقش‌ها را برای انتخاب صریح پروفایل مقصد خالی می‌کند؛ انتساب‌های قدیمی به پروفایل مقصد کپی نمی‌شوند و تاریخچهٔ پروفایل قبلی حفظ می‌شود.
- ادمین فقط کاربران عادی پروفایل جاری مجاز خود را می‌بیند و مدیریت می‌کند. تغییر هویت، وضعیت یا رمز حساب مدیریتی مشترک توسط ادمین پروفایل مجاز نیست. امور شخصی حساب از مسیرهای احراز هویت قبلی مستقل از انتخاب دیتاست باقی می‌ماند.
- نقش‌ها، بازهٔ اعتبارشان، اطلاعات کاربر و عضویت در یک Save و یک تراکنش ذخیره می‌شوند. حذف انتخاب نقش فقط انتساب‌های عادی همان پروفایل را غیرفعال می‌کند؛ انتساب‌های پروفایل‌های دیگر و انتساب‌های سازمانی دست‌نخورده‌اند. حذف نقش از فرم جزئیات، دادهٔ انتساب را پاک نمی‌کند.

## مرز داده

رجیستری صریح `V1190` تمام جدول‌های فعال نگاشت‌شدهٔ کسب‌وکاری و پشتیبان، اسناد و فایل موقت، Revision، ACL و تاریخچهٔ نگه‌داشته‌شدهٔ `central_policy_version` را پوشش می‌دهد. حساب‌ها، تعریف مشترک نقش‌ها، ممیزی فنی، sequence و Guardهای سلسله‌مراتب سراسری هستند و با مالکیت دادهٔ کسب‌وکاری اشتباه گرفته نمی‌شوند.

هر جدول رجیستری `profile_id RAW(16) NOT NULL` و FK پروفایل دارد. کلیدهای یکتای کسب‌وکاری با پروفایل محدود می‌شوند؛ رزرو کد و زوج رابطه برای ردیف حذف‌شده حفظ می‌شود. FKهای typed بین این جدول‌ها شامل پروفایل بازسازی می‌شوند و index پوشش‌دهندهٔ FK مرکب نیز، اگر از قبل وجود نداشته باشد، ساخته می‌شود. هویت UUID و PK موجود حفظ می‌شود. کلید شرطی انتشار Policy Version با CASE برای هر دو مؤلفه بازسازی می‌شود تا رفتار all-NULL در Oracle برای نسخهٔ منتشرنشده تغییر نکند.

Hibernate filter خودکار `datasetProfile` روی تمام موجودیت‌های فعال کسب‌وکاری، با `applyToLoadByKey=true`، فهرست، count، JPQL، UUID lookup و قفل رکورد را محدود می‌کند. callbackهای persist/update/remove نیز برابری پروفایل را کنترل می‌کنند. Queryهای JDBC مقصد سند، وابستگی ساختاری، گزینه‌های Local و فهرست‌های معکوس، پارامتر صریح پروفایل دارند. native query باقی‌مانده صرفاً sequence فنی Revision است. ACL چندنوعی با vocabulary بستهٔ مقصد و پارامترهای bound اعتبارسنجی می‌شود؛ resolver typed سند نیز مقصد را در پروفایل جاری پیدا و قفل می‌کند.

`X-Profile-Id` فقط ورودی درخواست است. سرور، هویت حساب، عضویت/اختیار، وجود و وضعیت پروفایل را بررسی می‌کند. این مرز علاوه بر `/api/master-data/**`، مسیرهای Objective، Organization Objective، Global Control، Control Group، داشبورد اطلاعات پایه و ACL را در بر می‌گیرد. درخواست کسب‌وکاری بدون پروفایل معتبر رد می‌شود؛ هیچ fallback به نام یا شناسهٔ پروفایل اولیه وجود ندارد.

پروفایل INACTIVE قابل خواندن، جست‌وجو و دانلود است؛ mutation، lifecycle داده، سند، ارتباط و upload موقت در آن رد می‌شود. POST تهیهٔ دانلود سند خواندنی است. DELETED در انتخاب‌گر و دسترسی عادی دیده نمی‌شود. تغییر وضعیت پروفایل به ردیف‌های زیرمجموعه cascade نمی‌کند؛ restore همان UUID، داده و دسترسی‌های ثبت‌شده را نگه می‌دارد.

## تراکنش و همزمانی

`ProfileTransactionPolicy` پس از شروع transaction advice و پیش از بدنهٔ سرویس تراکنشی mutation اجرا می‌شود. ردیف Flyway-owned برابر `dataset_profile_guard.ADMINISTRATION`، عملیات وضعیت پروفایل، عضویت، نقش و مالکیت را با نوشتن داده هماهنگ می‌کند. سپس پروفایل جاری قفل و عضویت و ACTIVE بودنش دوباره بررسی می‌شود. عبارت مجوز کسب‌وکاری controller نیز زیر این قفل با سرویس مجوز زنده دوباره ارزیابی می‌شود. بنابراین فاصلهٔ کنترل دسترسی HTTP تا شروع mutation، راه عبور از لغو دسترسی/نقش نیست. قفل تا commit یا rollback باقی می‌ماند؛ timeout هماهنگی پروفایل `PROFILE_BUSY` است و ردیف مفقود در runtime ساخته نمی‌شود.

این انتخاب، تمام mutationهای تحت این مرز را در ردیف هماهنگی پروفایل سری می‌کند؛ موازی‌سازی نوشتن در دیتاست‌های مختلف در این تحویل هدف نیست. قفل حساب و FK/CHECK نیز به جای cache یا قفل حافظه‌ای، عضویت و تعیین مالک را محافظت می‌کنند.

Guardهای موجود بازطراحی نشده‌اند: `ACCOUNT_GROUP`، `CONTROL`، `GLOBAL_CONTROL`، `OBJECTIVE`، `ORGANIZATION`، `POLICY`، `PROCESS`، `REGULATION` و `RISK`. Process و Subprocess همچنان `PROCESS` مشترک دارند. ترتیب lexical چند Guard و ترتیب endpointهای Assignment حفظ شده است. ترتیب کلی، هماهنگی پروفایل، قفل پروفایل، Guardهای سلسله‌مراتب موجود و سپس قفل‌های endpoint موجود است. Guard، اعتبارسنجی، mutation، Documents و Business Revision در همان تراکنش و اتصال دیتابیس باقی می‌مانند.

## مالک سازمان

`organization.owner_user_id` به حساب موجود ارجاع دارد. FK مرکب `(profile_id, owner_user_id)` به `app_user(profile_id, id)` تعلق مالک به همان دیتاست را تضمین می‌کند. حساب root و ادمین مشترک عضویت عادی ندارند و گزینهٔ مالک نیستند. انتخاب جدید باید حساب فعال و باز همان پروفایل باشد؛ گزینه‌ها و label نیز به همان پروفایل محدودند.

فقط root و ادمین همان پروفایل می‌توانند مالک را عوض کنند. Create/Update سازمان، شامل تغییر صرفاً مالک، از مسیر aggregate موجود با `ORGANIZATION` Guard انجام می‌شود. owner در همان درخواست عمومی/والد/Documents، dirty state، navigation guard و snapshot/Revision ذخیره می‌شود. پاسخ aggregate، Organization canonical شامل مالک و label را در همان تراکنش می‌سازد و store آن را مستقیماً دریافت می‌کند؛ Save جداگانه یا GET اجباری پس از ذخیره برای تعیین نتیجه وجود ندارد. شکست بخش‌های aggregate همگی rollback می‌شوند. سازمان موجود مالک ساختگی دریافت نمی‌کند.

`ownedOrganizationIds` محدودهٔ مالکیت را هر بار از سازمان‌های حذف‌نشدهٔ پروفایل و سلسله‌مراتب جاری محاسبه می‌کند؛ سازمان‌های مستقیماً تحت مالکیت و زیرسازمان‌هایشان را شامل می‌شود. جابه‌جایی درخت نتیجه را تغییر می‌دهد. مالکیت authority یا نقش ایجاد نمی‌کند، دسترسی Master Data همچنان نقش‌محور است و اختیار root/ادمین از این محدوده مستقل است. ماژول حسابرسی یا workflow برای مصرف این محدوده اضافه نشده است.

## UI و نشست

- انتخاب‌گر هدر نام، رنگ و وضعیت را نمایش می‌دهد. انتخاب در `sessionStorage` هر تب مستقل است. SecurityContext بازسازی‌شده نیز مخصوص همان درخواست است و شیء مشترک نشست را تغییر نمی‌دهد.
- تغییر انتخاب ابتدا navigation معمول React Router را طی می‌کند؛ محافظ موجود فرم‌ها و draft سند فرصت رد یا تأیید خروج دارد. پس از عبور از آن، بارگذاری تازهٔ سند مرورگر تمام storeها و انتخاب‌های قبلی را پاک می‌کند. پروفایل درخواست در ابتدای HTTP/XHR ثبت و پاسخ ناسازگار دور انداخته می‌شود؛ draft دیتاست A در B ذخیره نمی‌شود.
- ورود/خروج انتخاب قبلی و state انتخاب‌گر را پاک می‌کنند. refresh تمرکز تب، پروفایل‌های مجاز و authorityهای جاری را دوباره می‌خواند. کنترل واقعی دسترسی در سرور مستقل از visibility دکمه‌هاست.
- مدیریت دیتاست: «تنظیمات ← مدیریت پروفایل‌ها»، `/settings/profiles`؛ تعریف نقش‌ها: «تنظیمات ← نقش‌ها»، `/settings/roles`؛ هر دو root-only هستند. ظاهر/زبان و منوی حساب شخصی جدا باقی مانده‌اند.
- مشاهده/تغییر نقش و بازهٔ اعتبارشان در فرم ایجاد/ویرایش کاربر است. بخش مستقل نقش‌های تخصیص‌یافته و dialog قدیمی تخصیص سراسری حذف شده‌اند.
- فقط کاشی `accounts` از حاکمیت حذف شده است؛ مسیر مستقل مدیریت کاربران و کاشی «گروه حساب‌ها» حفظ شده‌اند.

## مهاجرت و تحویل عملیاتی

فقط migration جدید `V1190__dataset_profiles_and_organization_ownership.sql` افزوده می‌شود. migrationهای قبلی، از جمله `V1189` بند ۱۵، ویرایش نشده‌اند. پروفایل اولیه با نام دقیق «پیش فرض» و هویت ثابت migration ایجاد می‌شود. دادهٔ کسب‌وکاری و تمام وابستگی‌های رجیستری، کاربران عادی موجود و انتساب‌های قبلی به همین پروفایل منتسب می‌شوند. هیچ کاربر از روی نام یا عنوان یا نقش قدیمی، Profile Admin نمی‌شود. هیچ نقش/مجوز اضافی به کاربران موجود داده نمی‌شود.

نام اولیه کلید سیستم نیست. نام آن قابل تغییر است؛ پروفایل جدید دیتاست خالی دارد. نصب تازه در همان زنجیره، انتساب نقش bootstrap حساب root را به تنها دیتاست ایجادشدهٔ migration پیوند می‌دهد؛ این مرحله انتخاب کسب‌وکاری root یا fallback هنگام کار با داده نیست.

فایل موجود، checksum، storage key، document version، snapshot تاریخی و Revision immutable بازنویسی یا جابه‌جا نمی‌شوند. مهاجرت، DDL و backfill روی رجیستری گسترده دارد و برای فعال‌سازی عملیاتی نیازمند هماهنگی نسخهٔ backend/UI و اجرای کنترل‌شدهٔ Flyway روی Oracle است. اجرای آن در این تحویل مجاز نبوده است.

## حدود بررسی این تحویل

فرمان‌های مجاز compile آفلاین backend، typecheck و lint UI اجرا شدند:

| فرمان | نتیجهٔ واقعی |
| --- | --- |
| `./mvnw.cmd -o -Dskip.ui=true -Dmaven.test.skip=true compile` | wrapper پیش از compile به علت `JAVA_HOME` نامعتبر متوقف شد؛ backend کامپایل‌شده اعلام نمی‌شود. |
| `npm run typecheck` | موفق، کد خروج ۰. |
| `npm run lint` | موفق، کد خروج ۰، بدون خطا و هشدار در اجرای نهایی. |

هیچ تستی ساخته، ویرایش یا اجرا نشده است. برنامه، Flyway، دیتابیس، MinIO، Docker، مرورگر، MCP و سرویس خارجی استفاده نشده‌اند. بازبینی مهاجرت، مسیرهای قفل و مرزهای امنیت ایستا است؛ صحت اجرایی migration/Hibernate، اتصال ذخیره‌سازی و همزمانی واقعی Oracle بررسی نشده‌اند. typecheck/lint شاهد صحت اجرایی یا همزمانی نیستند.

## فایل‌های اصلی تحویل

- [پروفایل درخواست و جداسازی نشست تب‌ها](../../../grcpc-app/src/main/java/com/digiaudit/grcpc/common/security/ProfileRequestFilter.java)، [تعریف filter](../../../grcpc-app/src/main/java/com/digiaudit/grcpc/common/persistence/ProfileFilterDefinition.java) و [مرز تراکنش و قفل پروفایل](../../../grcpc-app/src/main/java/com/digiaudit/grcpc/modules/datasetprofile/application/ProfileTransactionPolicy.java).
- [مدیریت پروفایل](../../../grcpc-app/src/main/java/com/digiaudit/grcpc/modules/datasetprofile/application/DatasetProfileService.java)، [مدیریت کاربران](../../../grcpc-app/src/main/java/com/digiaudit/grcpc/modules/usermanagement/application/UserManagementService.java) و [عضویت و نقش پروفایلی](../../../grcpc-app/src/main/java/com/digiaudit/grcpc/modules/usermanagement/application/ProfileUserService.java).
- [aggregate سازمان و محاسبهٔ محدودهٔ مالکیت](../../../grcpc-app/src/main/java/com/digiaudit/grcpc/modules/organization/application/OrganizationService.java) و [پاسخ canonical آن](../../../grcpc-app/src/main/java/com/digiaudit/grcpc/modules/organization/api/dto/OrganizationAggregateMutationResponse.java).
- [مهاجرت V1190](../../../grcpc-app/src/main/resources/db/migration/oracle/V1190__dataset_profiles_and_organization_ownership.sql)، به‌علاوهٔ نگاشت پروفایل در تمام موجودیت‌های فعال و محدودسازی JDBCهای مربوط.
- [هدر و ناوبری](../../../grcpc-ui/src/layout/MainLayout.tsx)، [مدیریت پروفایل‌ها](../../../grcpc-ui/src/features/dataset-profile/pages/ProfilesPage.tsx)، [فرم کاربر](../../../grcpc-ui/src/features/usermanagement/components/UserFormDialog.tsx)، [فرم سازمان](../../../grcpc-ui/src/features/organization/pages/OrganizationObjectPage.tsx)، [انتقال owner در service](../../../grcpc-ui/src/features/organization/service/organization.service.ts) و [حاکمیت](../../../grcpc-ui/src/features/master-data/pages/MasterDataFeaturePage.tsx).
