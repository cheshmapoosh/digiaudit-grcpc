create table if not exists resource_acl_entry (
    id uuid primary key,
    target_type varchar(100) not null,
    target_id uuid not null,
    subject_type varchar(50) not null,
    subject_id uuid not null,
    permission_code varchar(100) not null,
    effect varchar(50) not null,
    valid_from timestamp null,
    valid_to timestamp null,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint chk_resource_acl_subject_type check (subject_type in ('USER', 'ROLE')),
    constraint chk_resource_acl_effect check (effect in ('ALLOW', 'DENY')),
    constraint chk_resource_acl_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create unique index if not exists uk_resource_acl_entry
    on resource_acl_entry(target_type, target_id, subject_type, subject_id, permission_code);
create index if not exists idx_resource_acl_target on resource_acl_entry(target_type, target_id);
create index if not exists idx_resource_acl_subject on resource_acl_entry(subject_type, subject_id);
create index if not exists idx_resource_acl_permission on resource_acl_entry(permission_code);
