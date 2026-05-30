insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version)
select '22000000-0000-0000-0000-000000000118', 'REGULATION_VIEW', 'MASTER_DATA', current_timestamp, null, null, null, 0
where not exists (select 1 from business_permission where code = 'REGULATION_VIEW');

insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version)
select '22000000-0000-0000-0000-000000000119', 'REGULATION_EDIT', 'MASTER_DATA', current_timestamp, null, null, null, 0
where not exists (select 1 from business_permission where code = 'REGULATION_EDIT');

insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version)
select '22000000-0000-0000-0000-000000000120', 'ORGANIZATION_CREATE', 'ORGANIZATION', current_timestamp, null, null, null, 0
where not exists (select 1 from business_permission where code = 'ORGANIZATION_CREATE');

insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version)
select '22000000-0000-0000-0000-000000000121', 'ORGANIZATION_DELETE', 'ORGANIZATION', current_timestamp, null, null, null, 0
where not exists (select 1 from business_permission where code = 'ORGANIZATION_DELETE');

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000118', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'REGULATION_VIEW'
where r.code = 'ROOT_ADMIN'
  and not exists (select 1 from role_business_permission rbp where rbp.role_id = r.id and rbp.business_permission_id = bp.id);

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000119', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'REGULATION_EDIT'
where r.code = 'ROOT_ADMIN'
  and not exists (select 1 from role_business_permission rbp where rbp.role_id = r.id and rbp.business_permission_id = bp.id);

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000120', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'ORGANIZATION_CREATE'
where r.code = 'ROOT_ADMIN'
  and not exists (select 1 from role_business_permission rbp where rbp.role_id = r.id and rbp.business_permission_id = bp.id);

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000121', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'ORGANIZATION_DELETE'
where r.code = 'ROOT_ADMIN'
  and not exists (select 1 from role_business_permission rbp where rbp.role_id = r.id and rbp.business_permission_id = bp.id);
