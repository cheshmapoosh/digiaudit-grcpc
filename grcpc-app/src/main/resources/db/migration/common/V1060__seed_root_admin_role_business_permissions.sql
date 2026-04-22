insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000001', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'USERMANAGEMENT_VIEW'
where r.code = 'ROOT_ADMIN';

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000002', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'USERMANAGEMENT_EDIT'
where r.code = 'ROOT_ADMIN';

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000003', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'ORGANIZATION_VIEW'
where r.code = 'ROOT_ADMIN';

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000004', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'ORGANIZATION_EDIT'
where r.code = 'ROOT_ADMIN';
