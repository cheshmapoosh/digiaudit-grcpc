insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version)
values ('22000000-0000-0000-0000-000000000117', 'ACL_MANAGE', 'SECURITY', current_timestamp, null, null, null, 0);

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000117', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'ACL_MANAGE'
where r.code = 'ROOT_ADMIN';
