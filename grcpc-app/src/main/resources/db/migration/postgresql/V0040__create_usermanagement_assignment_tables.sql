create table role_permission (
    id uuid primary key,
    role_id uuid not null,
    permission_id uuid not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    version bigint not null default 0,
    constraint fk_role_permission_role foreign key (role_id) references role (id),
    constraint fk_role_permission_permission foreign key (permission_id) references permission (id)
);

create table role_business_permission (
    id uuid primary key,
    role_id uuid not null,
    business_permission_id uuid not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    version bigint not null default 0,
    constraint fk_role_business_permission_role foreign key (role_id) references role (id),
    constraint fk_role_business_permission_permission foreign key (business_permission_id) references business_permission (id)
);

create table user_role_assignment (
    id uuid primary key,
    user_id uuid not null,
    role_id uuid not null,
    scope_type varchar(50) not null,
    scope_org_unit_id uuid,
    valid_from timestamp,
    valid_to timestamp,
    assigned_by uuid,
    assigned_at timestamp,
    active boolean not null default true,
    created_at timestamp not null,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    version bigint not null default 0,
    constraint fk_user_role_assignment_user foreign key (user_id) references app_user (id),
    constraint fk_user_role_assignment_role foreign key (role_id) references role (id),
    constraint ck_user_role_assignment_scope check (
        (scope_type in ('GLOBAL', 'SELF') and scope_org_unit_id is null)
        or
        (scope_type in ('ORG_UNIT', 'ORG_SUBTREE') and scope_org_unit_id is not null)
    )
);
