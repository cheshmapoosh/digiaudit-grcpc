create table role_permission (
    id varchar2(36 char) primary key,
    role_id varchar2(36 char) not null,
    permission_id varchar2(36 char) not null,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19,0) default 0 not null,
    constraint fk_role_permission_role foreign key (role_id) references role(id),
    constraint fk_role_permission_permission foreign key (permission_id) references permission(id)
);

create table role_business_permission (
    id varchar2(36 char) primary key,
    role_id varchar2(36 char) not null,
    business_permission_id varchar2(36 char) not null,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19,0) default 0 not null,
    constraint fk_role_business_permission_role foreign key (role_id) references role(id),
    constraint fk_role_business_permission_permission foreign key (business_permission_id) references business_permission(id)
);

create table user_role_assignment (
    id varchar2(36 char) primary key,
    user_id varchar2(36 char) not null,
    role_id varchar2(36 char) not null,
    scope_type varchar2(50 char) not null,
    scope_org_unit_id varchar2(36 char),
    valid_from timestamp,
    valid_to timestamp,
    assigned_by varchar2(36 char),
    assigned_at timestamp,
    active number(1) default 1 not null,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19,0) default 0 not null,
    constraint fk_user_role_assignment_user foreign key (user_id) references app_user(id),
    constraint fk_user_role_assignment_role foreign key (role_id) references role(id),
    constraint ck_user_role_assignment_active check (active in (0, 1)),
    constraint ck_user_role_assignment_scope check (
        (scope_type in ('GLOBAL', 'SELF') and scope_org_unit_id is null)
        or
        (scope_type in ('ORG_UNIT', 'ORG_SUBTREE') and scope_org_unit_id is not null)
    )
);
