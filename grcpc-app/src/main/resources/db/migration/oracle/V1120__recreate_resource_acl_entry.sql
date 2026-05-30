create table resource_acl_entry (
    id varchar2(36 char) primary key,
    target_type varchar2(100 char) not null,
    target_id varchar2(36 char) not null,
    subject_type varchar2(50 char) not null,
    subject_id varchar2(36 char) not null,
    permission_code varchar2(100 char) not null,
    effect varchar2(50 char) not null,
    valid_from timestamp,
    valid_to timestamp,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint chk_resource_acl_subject_type check (subject_type in ('USER', 'ROLE')),
    constraint chk_resource_acl_effect check (effect in ('ALLOW', 'DENY')),
    constraint chk_resource_acl_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from),
    constraint uk_resource_acl_entry unique (target_type, target_id, subject_type, subject_id, permission_code)
);

create index idx_resource_acl_target on resource_acl_entry(target_type, target_id);
create index idx_resource_acl_subject on resource_acl_entry(subject_type, subject_id);
create index idx_resource_acl_permission on resource_acl_entry(permission_code);
