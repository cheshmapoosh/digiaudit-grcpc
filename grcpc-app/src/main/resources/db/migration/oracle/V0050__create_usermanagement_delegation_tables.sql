create table delegation_policy (
    id varchar2(36 char) primary key,
    subject_type varchar2(20 char) not null,
    subject_role_id varchar2(36 char),
    subject_user_id varchar2(36 char),
    allow_create_user number(1) default 0 not null,
    allow_edit_user number(1) default 0 not null,
    allow_disable_user number(1) default 0 not null,
    allow_assign_roles number(1) default 0 not null,
    allow_create_role number(1) default 0 not null,
    allow_edit_role number(1) default 0 not null,
    allow_assign_business_permissions number(1) default 0 not null,
    scope_type varchar2(50 char) not null,
    scope_org_unit_id varchar2(36 char),
    allow_subtree number(1) default 0 not null,
    manageable_user_mode varchar2(50 char) not null,
    enabled number(1) default 1 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_delegation_policy_role foreign key (subject_role_id) references role(id),
    constraint fk_delegation_policy_user foreign key (subject_user_id) references app_user(id),
    constraint ck_delegation_policy_allow_create_user check (allow_create_user in (0,1)),
    constraint ck_delegation_policy_allow_edit_user check (allow_edit_user in (0,1)),
    constraint ck_delegation_policy_allow_disable_user check (allow_disable_user in (0,1)),
    constraint ck_delegation_policy_allow_assign_roles check (allow_assign_roles in (0,1)),
    constraint ck_delegation_policy_allow_create_role check (allow_create_role in (0,1)),
    constraint ck_delegation_policy_allow_edit_role check (allow_edit_role in (0,1)),
    constraint ck_delegation_policy_allow_assign_bp check (allow_assign_business_permissions in (0,1)),
    constraint ck_delegation_policy_allow_subtree check (allow_subtree in (0,1)),
    constraint ck_delegation_policy_enabled check (enabled in (0,1)),
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
    id varchar2(36 char) primary key,
    delegation_policy_id varchar2(36 char) not null,
    assignable_role_id varchar2(36 char) not null,
    constraint fk_delegation_assignable_role_policy foreign key (delegation_policy_id) references delegation_policy(id),
    constraint fk_delegation_assignable_role_role foreign key (assignable_role_id) references role(id)
);
