-- Organization-specific management does not grant other Reference catalogs.
insert into business_permission (id, code, module_name, created_at, version)
values ('11980000-0000-4000-8000-000000000001', 'MD_ORGANIZATION_VIEW', 'MASTER_DATA', current_timestamp, 0);
insert into business_permission (id, code, module_name, created_at, version)
values ('11980000-0000-4000-8000-000000000002', 'MD_ORGANIZATION_MANAGE', 'MASTER_DATA', current_timestamp, 0);
insert into business_permission_i18n (id, business_permission_id, locale, title, description)
values ('11980000-0000-4000-8000-000000000003', '11980000-0000-4000-8000-000000000001', 'fa', 'مشاهده اطلاعات سازمان', 'مشاهده کاتالوگ سازمان و مستندات آن در پروفایل مجاز');
insert into business_permission_i18n (id, business_permission_id, locale, title, description)
values ('11980000-0000-4000-8000-000000000004', '11980000-0000-4000-8000-000000000001', 'en', 'View organization data', 'View Organizations and their Documents in the authorized profile');
insert into business_permission_i18n (id, business_permission_id, locale, title, description)
values ('11980000-0000-4000-8000-000000000005', '11980000-0000-4000-8000-000000000002', 'fa', 'مدیریت اطلاعات سازمان', 'مدیریت کاتالوگ سازمان و مستندات آن در پروفایل مجاز؛ مدیریت مالکان ویژه root و ادمین پروفایل است');
insert into business_permission_i18n (id, business_permission_id, locale, title, description)
values ('11980000-0000-4000-8000-000000000006', '11980000-0000-4000-8000-000000000002', 'en', 'Manage organization data', 'Manage Organizations and their Documents; owner assignment management remains root/profile admin only');
insert into role (id, code, system_defined, enabled, created_at, version)
values ('11980000-0000-4000-8000-000000000007', 'ORGANIZATION_MASTER_DATA_MANAGER', 1, 1, current_timestamp, 0);
insert into role_i18n (id, role_id, locale, title, description)
values ('11980000-0000-4000-8000-000000000008', '11980000-0000-4000-8000-000000000007', 'fa', 'مدیر اطلاعات سازمان', 'مدیریت اطلاعات سازمان در پروفایل مجاز و امکان انتخاب به عنوان مالک سازمان');
insert into role_i18n (id, role_id, locale, title, description)
values ('11980000-0000-4000-8000-000000000009', '11980000-0000-4000-8000-000000000007', 'en', 'Organization Data Manager', 'Manage Organization data in the authorized profile; eligible for Organization ownership');
insert into role_business_permission (id, role_id, business_permission_id, created_at)
values ('11980000-0000-4000-8000-000000000010', '11980000-0000-4000-8000-000000000007', '11980000-0000-4000-8000-000000000001', current_timestamp);
insert into role_business_permission (id, role_id, business_permission_id, created_at)
values ('11980000-0000-4000-8000-000000000011', '11980000-0000-4000-8000-000000000007', '11980000-0000-4000-8000-000000000002', current_timestamp);
