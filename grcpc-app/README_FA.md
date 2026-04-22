# اسکلت اولیه setup / usermanagement / audit برای grcpc-api

این بسته شامل:
- ساختار packageهای اصلی
- migrationهای Flyway
- setup اولیه و ساخت root
- مدیریت پایه user / role / delegation
- security پایه با HTTP Basic
- پشتیبانی چندزبانه برای role / permission / business_permission با جدول‌های i18n

## نکات
- base package نمونه: `ir.grcpc.api`
- root user با setup endpoint ساخته می‌شود، نه migration
- برای کاهش coupling بین ماژول‌ها، فیلدهای org فعلا به صورت `UUID` نگه داشته شده‌اند و FK فیزیکی به organization ندارند
- این نسخه در عملیات مدیریتی، در فاز اول root-only است تا اسکلت پایدار و قابل اعمال داشته باشی
- در جداول اصلی فقط داده‌های فنی و زبان‌خنثی مثل `code` و `module_name` نگه‌داری می‌شود
- متن‌های نمایشی چندزبانه در جدول‌های `*_i18n` ذخیره می‌شوند

## endpointها
- `GET /api/setup/status`
- `POST /api/setup/initialize`
- `POST /api/usermanagement/roles`
- `PUT /api/usermanagement/roles/{roleId}/permissions`
- `PUT /api/usermanagement/roles/{roleId}/business-permissions`
- `POST /api/usermanagement/users`
- `POST /api/usermanagement/users/{userId}/roles`
- `POST /api/usermanagement/delegation-policies`

## نمونه payload برای ساخت role چندزبانه
```json
{
  "code": "ACCOUNTING_MANAGER",
  "translations": [
    {
      "locale": "fa",
      "title": "مدیر حسابداری",
      "description": "مسئول مدیریت امور حسابداری"
    },
    {
      "locale": "en",
      "title": "Accounting Manager",
      "description": "Responsible for accounting management"
    }
  ],
  "enabled": true
}
```

## migrationهای مرتبط با چندزبانه
- `role_i18n`
- `permission_i18n`
- `business_permission_i18n`

## نکته برای ماژول organization
اگر ماژول `organization` هم باید چندزبانه باشد، همین الگو را برای `organization_unit_i18n` هم اعمال کن تا نام واحدهای سازمانی وابسته به زبان در جدول اصلی نماند.
