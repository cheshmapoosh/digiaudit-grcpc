create table delegation_policy (
    id uuid primary key,
    subject_type varchar(20) not null,
    subject_role_id uuid,
    subject_user_id uuid,
    allow_create_user boolean not null default false,
    allow_edit_user boolean not null default false,
    allow_disable_user boolean not null default false,
    allow_assign_roles boolean not null default false,
    allow_create_role boolean not null default false,
    allow_edit_role boolean not null default false,
    allow_assign_business_permissions boolean not null default false,
    scope_type varchar(50) not null,
    scope_org_unit_id uuid,
    allow_subtree boolean not null default false,
    manageable_user_mode varchar(50) not null,
    enabled boolean not null default true,
    created_at timestamp not null,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    version bigint not null default 0,
    constraint fk_delegation_policy_role foreign key (subject_role_id) references role(id),
    constraint fk_delegation_policy_user foreign key (subject_user_id) references app_user(id),
    constraint ck_delegation_policy_subject_type check (subject_type in ('ROLE', 'USER')),
    constraint ck_delegation_policy_scope_type check (scope_type in ('GLOBAL', 'ORG_UNIT', 'ORG_SUBTREE', 'SELF')),
    constraint ck_delegation_policy_manageable_user_mode check (manageable_user_mode in ('ALL_IN_SCOPE', 'ONLY_CREATED_BY_SELF')),
    constraint ck_delegation_policy_subject_ref check (
        (subject_type = 'ROLE' and subject_role_id is not null and subject_user_id is null) or
        (subject_type = 'USER' and subject_user_id is not null and subject_role_id is null)
    ),
    constraint ck_delegation_policy_scope_org check (
        (scope_type in ('ORG_UNIT', 'ORG_SUBTREE') and scope_org_unit_id is not null) or
        (scope_type in ('GLOBAL', 'SELF') and scope_org_unit_id is null)
    )
);

create table delegation_assignable_role (
    id uuid primary key,
    delegation_policy_id uuid not null,
    assignable_role_id uuid not null,
    constraint fk_delegation_assignable_role_policy foreign key (delegation_policy_id) references delegation_policy(id),
    constraint fk_delegation_assignable_role_role foreign key (assignable_role_id) references role(id)
);
