-- Cycle 7.2 typed Central Subprocess Risk Scope authorities.
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000501', 'CENTRAL_RISK_SCOPE_VIEW', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000502', 'CENTRAL_RISK_SCOPE_CREATE', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000503', 'CENTRAL_RISK_SCOPE_UPDATE', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000504', 'CENTRAL_RISK_SCOPE_LIFECYCLE', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000505', 'CENTRAL_RISK_SCOPE_DELETE', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000506', 'CENTRAL_RISK_SCOPE_RESTORE', 'MASTER_DATA', current_timestamp, null, null, null, 0);

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '24000000-0000-0000-0000-000000000501', r.id, bp.id, current_timestamp, null from role r join business_permission bp on bp.code = 'CENTRAL_RISK_SCOPE_VIEW' where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '24000000-0000-0000-0000-000000000502', r.id, bp.id, current_timestamp, null from role r join business_permission bp on bp.code = 'CENTRAL_RISK_SCOPE_CREATE' where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '24000000-0000-0000-0000-000000000503', r.id, bp.id, current_timestamp, null from role r join business_permission bp on bp.code = 'CENTRAL_RISK_SCOPE_UPDATE' where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '24000000-0000-0000-0000-000000000504', r.id, bp.id, current_timestamp, null from role r join business_permission bp on bp.code = 'CENTRAL_RISK_SCOPE_LIFECYCLE' where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '24000000-0000-0000-0000-000000000505', r.id, bp.id, current_timestamp, null from role r join business_permission bp on bp.code = 'CENTRAL_RISK_SCOPE_DELETE' where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '24000000-0000-0000-0000-000000000506', r.id, bp.id, current_timestamp, null from role r join business_permission bp on bp.code = 'CENTRAL_RISK_SCOPE_RESTORE' where r.code = 'ROOT_ADMIN';

insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000901', '22000000-0000-0000-0000-000000000501', 'en', 'View Central Risk Scope', 'View Risk Templates assigned to Central Subprocesses');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000902', '22000000-0000-0000-0000-000000000501', 'fa', 'مشاهده دامنه ریسک مرکزی', 'مجوز مشاهده الگوهای ریسک تخصیص‌یافته به زیرفرآیندهای مرکزی');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000903', '22000000-0000-0000-0000-000000000502', 'en', 'Create Central Risk Scope', 'Assign one Central Risk Template to a Central Subprocess');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000904', '22000000-0000-0000-0000-000000000502', 'fa', 'ایجاد دامنه ریسک مرکزی', 'مجوز تخصیص یک الگوی ریسک مرکزی به زیرفرآیند مرکزی');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000905', '22000000-0000-0000-0000-000000000503', 'en', 'Update Central Risk Scope', 'Update the validity of a Central Risk Scope');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000906', '22000000-0000-0000-0000-000000000503', 'fa', 'ویرایش دامنه ریسک مرکزی', 'مجوز ویرایش بازه اعتبار دامنه ریسک مرکزی');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000907', '22000000-0000-0000-0000-000000000504', 'en', 'Manage Central Risk Scope Lifecycle', 'Activate or inactivate Central Risk Scopes');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000908', '22000000-0000-0000-0000-000000000504', 'fa', 'مدیریت چرخه حیات دامنه ریسک مرکزی', 'مجوز فعال یا غیرفعال‌سازی دامنه ریسک مرکزی');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000909', '22000000-0000-0000-0000-000000000505', 'en', 'Delete Central Risk Scope', 'Soft-delete Central Risk Scopes without live dependencies');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000910', '22000000-0000-0000-0000-000000000505', 'fa', 'حذف دامنه ریسک مرکزی', 'مجوز حذف نرم دامنه ریسک مرکزی بدون وابستگی فعال');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000911', '22000000-0000-0000-0000-000000000506', 'en', 'Restore Central Risk Scope', 'Restore a deleted Central Risk Scope using the same identity');
insert into business_permission_i18n (id, business_permission_id, locale, title, description) values ('23000000-0000-0000-0000-000000000912', '22000000-0000-0000-0000-000000000506', 'fa', 'بازیابی دامنه ریسک مرکزی', 'مجوز بازیابی دامنه ریسک مرکزی حذف‌شده با همان شناسه');
