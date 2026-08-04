create table organization (
    id raw(16) not null,
    code varchar2(64 byte) not null,
    name varchar2(255 char) not null,
    organization_type varchar2(32 byte) not null,
    parent_organization_id raw(16),
    location varchar2(255 char),
    description clob,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_organization primary key (id),
    constraint uk_organization_code unique (code),
    constraint fk_organization_parent foreign key (parent_organization_id) references organization(id),
    constraint ck_organization_type check (organization_type in (
        'HOLDING', 'COMPANY', 'DEPUTY', 'OFFICE', 'MANAGEMENT', 'DEPARTMENT',
        'BRANCH', 'UNIT', 'COMMITTEE', 'GROUP', 'OTHER'
    )),
    constraint ck_organization_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_organization_valid_range check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_organization_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    ),
    constraint ck_organization_not_self check (parent_organization_id is null or parent_organization_id <> id)
);

create index ix_organization_parent on organization(parent_organization_id);

create table central_process (
    id raw(16) not null,
    code varchar2(64 byte) not null,
    title varchar2(255 char) not null,
    parent_process_id raw(16),
    description clob,
    sort_order number(10,0) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_process primary key (id),
    constraint uk_central_process_code unique (code),
    constraint fk_central_process_parent foreign key (parent_process_id) references central_process(id),
    constraint ck_central_process_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_process_valid_range check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_process_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    ),
    constraint ck_central_process_not_self check (parent_process_id is null or parent_process_id <> id),
    constraint ck_central_process_sort check (sort_order >= 0)
);

create index ix_central_process_parent on central_process(parent_process_id);

create table central_subprocess (
    id raw(16) not null,
    code varchar2(64 byte) not null,
    title varchar2(255 char) not null,
    process_id raw(16) not null,
    description clob,
    sort_order number(10,0) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_subprocess primary key (id),
    constraint uk_central_subprocess_code unique (code),
    constraint fk_central_subprocess_process foreign key (process_id) references central_process(id),
    constraint ck_central_subprocess_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_subprocess_valid_range check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_subprocess_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    ),
    constraint ck_central_subprocess_sort check (sort_order >= 0)
);

create index ix_central_subprocess_process on central_subprocess(process_id);

create table central_control (
    id raw(16) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_control primary key (id),
    constraint ck_central_control_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_control_valid_range check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_control_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create table central_control_objective (
    id raw(16) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_control_objective primary key (id),
    constraint ck_central_control_objective_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_control_objective_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_control_objective_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create table central_risk_category (
    id raw(16) not null,
    parent_category_id raw(16),
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_risk_category primary key (id),
    constraint fk_central_risk_category_parent foreign key (parent_category_id) references central_risk_category(id),
    constraint ck_central_risk_category_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_risk_category_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_risk_category_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    ),
    constraint ck_central_risk_category_self check (parent_category_id is null or parent_category_id <> id)
);

create index ix_central_risk_category_parent on central_risk_category(parent_category_id);

create table central_risk_template (
    id raw(16) not null,
    risk_category_id raw(16) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_risk_template primary key (id),
    constraint fk_central_risk_template_cat foreign key (risk_category_id) references central_risk_category(id),
    constraint ck_central_risk_template_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_risk_template_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_risk_template_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_risk_template_cat on central_risk_template(risk_category_id);

create table central_account_group (
    id raw(16) not null,
    parent_account_group_id raw(16),
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_account_group primary key (id),
    constraint fk_central_account_group_parent foreign key (parent_account_group_id) references central_account_group(id),
    constraint ck_central_account_group_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_account_group_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_account_group_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    ),
    constraint ck_central_account_group_self check (parent_account_group_id is null or parent_account_group_id <> id)
);

create index ix_central_account_group_parent on central_account_group(parent_account_group_id);

create table central_regulation_group (
    id raw(16) not null,
    parent_group_id raw(16),
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_regulation_group primary key (id),
    constraint fk_central_reg_group_parent foreign key (parent_group_id) references central_regulation_group(id),
    constraint ck_central_reg_group_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_reg_group_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_reg_group_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    ),
    constraint ck_central_reg_group_self check (parent_group_id is null or parent_group_id <> id)
);

create index ix_central_reg_group_parent on central_regulation_group(parent_group_id);

create table central_regulation (
    id raw(16) not null,
    regulation_group_id raw(16) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_regulation primary key (id),
    constraint fk_central_regulation_group foreign key (regulation_group_id) references central_regulation_group(id),
    constraint ck_central_regulation_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_regulation_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_regulation_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_regulation_group on central_regulation(regulation_group_id);

create table central_regulation_requirement (
    id raw(16) not null,
    regulation_id raw(16) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_reg_requirement primary key (id),
    constraint fk_central_reg_requirement_reg foreign key (regulation_id) references central_regulation(id),
    constraint ck_central_reg_requirement_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_reg_requirement_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_reg_requirement_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_reg_requirement_reg on central_regulation_requirement(regulation_id);

create table central_policy_group (
    id raw(16) not null,
    parent_group_id raw(16),
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_policy_group primary key (id),
    constraint fk_central_policy_group_parent foreign key (parent_group_id) references central_policy_group(id),
    constraint ck_central_policy_group_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_policy_group_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_policy_group_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    ),
    constraint ck_central_policy_group_self check (parent_group_id is null or parent_group_id <> id)
);

create index ix_central_policy_group_parent on central_policy_group(parent_group_id);

create table central_policy (
    id raw(16) not null,
    policy_group_id raw(16) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_policy primary key (id),
    constraint fk_central_policy_group foreign key (policy_group_id) references central_policy_group(id),
    constraint ck_central_policy_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_policy_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_policy_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_policy_group on central_policy(policy_group_id);

create table central_policy_version (
    id raw(16) not null,
    policy_id raw(16) not null,
    version_status varchar2(32 byte) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_central_policy_version primary key (id),
    constraint fk_central_policy_version_policy foreign key (policy_id) references central_policy(id),
    constraint ck_central_policy_version_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_policy_version_vs check (version_status in ('DRAFT', 'PUBLISHED', 'SUPERSEDED')),
    constraint ck_central_policy_version_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_policy_version_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_policy_version_policy on central_policy_version(policy_id);
