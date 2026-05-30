delete from role_business_permission
where business_permission_id in (
    select id from business_permission where code = 'ACL_MANAGE'
);

delete from business_permission_i18n
where business_permission_id in (
    select id from business_permission where code = 'ACL_MANAGE'
);

delete from business_permission
where code = 'ACL_MANAGE';
