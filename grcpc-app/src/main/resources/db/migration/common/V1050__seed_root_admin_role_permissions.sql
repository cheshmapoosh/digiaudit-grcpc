insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000001', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_VIEW' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000002', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_CREATE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000003', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_EDIT' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000004', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_ENABLE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000005', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_DISABLE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000006', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_LOCK' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000007', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_UNLOCK' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000008', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_CHANGE_PASSWORD' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000009', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_RESET_PASSWORD' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000010', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_ASSIGN_ROLE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000011', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'USER_REMOVE_ROLE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000012', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ROLE_VIEW' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000013', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ROLE_CREATE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000014', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ROLE_EDIT' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000015', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ROLE_DELETE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000016', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ROLE_ASSIGN_PERMISSION' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000017', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ROLE_ASSIGN_BUSINESS_PERMISSION' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000018', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ROLE_ASSIGN_SCOPE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000019', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ROLE_ASSIGN_DELEGATION' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000020', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'BUSINESS_PERMISSION_ASSIGN' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000021', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'BUSINESS_PERMISSION_REVOKE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000022', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ORG_SCOPE_ASSIGN' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000023', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'ORG_SCOPE_REVOKE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000024', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'DELEGATION_POLICY_MANAGE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000025', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'SETUP_VIEW' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000026', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'SETUP_INITIALIZE' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000027', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'AUDIT_VIEW' where r.code = 'ROOT_ADMIN';
insert into role_permission (id, role_id, permission_id, created_at, created_by)
select '25000000-0000-0000-0000-000000000028', r.id, p.id, current_timestamp, null from role r join permission p on p.code = 'AUDIT_EXPORT' where r.code = 'ROOT_ADMIN';
