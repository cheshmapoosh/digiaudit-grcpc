insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000101', 'PROCESS_VIEW', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000102', 'PROCESS_EDIT', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000103', 'CONTROL_VIEW', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000104', 'CONTROL_EDIT', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000105', 'RISK_VIEW', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000106', 'RISK_EDIT', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000107', 'OBJECTIVE_VIEW', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000108', 'OBJECTIVE_EDIT', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000109', 'POLICY_VIEW', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000110', 'POLICY_EDIT', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000111', 'ACCOUNT_GROUP_VIEW', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000112', 'ACCOUNT_GROUP_EDIT', 'MASTER_DATA', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000113', 'DOCUMENT_VIEW', 'DOCUMENT', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000114', 'DOCUMENT_UPLOAD', 'DOCUMENT', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000115', 'DOCUMENT_DOWNLOAD', 'DOCUMENT', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000116', 'DOCUMENT_DELETE', 'DOCUMENT', current_timestamp, null, null, null, 0);
insert into business_permission (id, code, module_name, created_at, updated_at, created_by, updated_by, version) values ('22000000-0000-0000-0000-000000000117', 'ACL_MANAGE', 'SECURITY', current_timestamp, null, null, null, 0);

insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000101', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'PROCESS_VIEW'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000102', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'PROCESS_EDIT'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000103', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'CONTROL_VIEW'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000104', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'CONTROL_EDIT'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000105', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'RISK_VIEW'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000106', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'RISK_EDIT'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000107', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'OBJECTIVE_VIEW'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000108', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'OBJECTIVE_EDIT'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000109', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'POLICY_VIEW'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000110', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'POLICY_EDIT'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000111', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'ACCOUNT_GROUP_VIEW'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000112', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'ACCOUNT_GROUP_EDIT'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000113', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'DOCUMENT_VIEW'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000114', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'DOCUMENT_UPLOAD'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000115', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'DOCUMENT_DOWNLOAD'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000116', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'DOCUMENT_DELETE'
where r.code = 'ROOT_ADMIN';
insert into role_business_permission (id, role_id, business_permission_id, created_at, created_by)
select '26000000-0000-0000-0000-000000000117', r.id, bp.id, current_timestamp, null
from role r join business_permission bp on bp.code = 'ACL_MANAGE'
where r.code = 'ROOT_ADMIN';
