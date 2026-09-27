create table control_group (
    id raw(16) not null,
    code varchar2(64 byte) not null,
    name varchar2(255 char) not null,
    description clob,
    parent_id raw(16),
    valid_from date,
    valid_to date,
    status varchar2(32 byte) not null,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_control_group primary key (id),
    constraint uk_control_group_code unique (code),
    constraint fk_control_group_parent foreign key (parent_id) references control_group(id),
    constraint ck_control_group_code check (code = upper(trim(code))),
    constraint ck_control_group_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_control_group_range check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_control_group_self check (parent_id is null or parent_id <> id),
    constraint ck_control_group_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null))
);

create index ix_control_group_parent on control_group(parent_id);

create table global_control (
    id raw(16) not null,
    code varchar2(64 byte) not null,
    name varchar2(255 char) not null,
    description clob,
    control_group_id raw(16) not null,
    control_type varchar2(64 byte) not null,
    test_required number(1,0) not null,
    valid_from date,
    valid_to date,
    status varchar2(32 byte) not null,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_global_control primary key (id),
    constraint uk_global_control_code unique (code),
    constraint fk_global_control_group foreign key (control_group_id) references control_group(id),
    constraint ck_global_control_code check (code = upper(trim(code))),
    constraint ck_global_control_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_global_control_test check (test_required in (0, 1)),
    constraint ck_global_control_range check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_global_control_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null))
);

create index ix_global_control_group on global_control(control_group_id);

create table global_control_regulation (
    id raw(16) not null,
    global_control_id raw(16) not null,
    regulation_id raw(16) not null,
    status varchar2(32 byte) not null,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_global_control_regulation primary key (id),
    constraint uk_global_control_regulation unique (global_control_id, regulation_id),
    constraint fk_global_control_reg_control foreign key (global_control_id) references global_control(id),
    constraint fk_global_control_reg_regulation foreign key (regulation_id) references central_regulation(id),
    constraint ck_global_control_reg_status check (status in ('ACTIVE', 'DELETED')),
    constraint ck_global_control_reg_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status = 'ACTIVE' and deleted_at is null and deleted_by is null))
);

create index ix_global_control_reg_regulation on global_control_regulation(regulation_id);

insert into masterdata_hierarchy_guard (hierarchy_key) values ('GLOBAL_CONTROL');


alter table masterdata_revision_content drop constraint ck_masterdata_revision_content_entity;
alter table masterdata_revision_content add constraint ck_masterdata_revision_content_entity check (entity_type in (
    'ORG',
    'OBJECTIVE',
    'CONTROL_GROUP',
    'GLOBAL_CONTROL',
    'GLOBAL_CONTROL_REGULATION',
    'ORGANIZATION_OBJECTIVE',
    'CENTRAL_PROCESS',
    'CENTRAL_SUBPROCESS',
    'CENTRAL_CONTROL',
    'CENTRAL_CONTROL_GROUP',
    'CENTRAL_CONTROL_OBJECTIVE_DEF',
    'CENTRAL_RISK_CATEGORY',
    'CENTRAL_RISK_TEMPLATE',
    'CENTRAL_ACCOUNT_GROUP',
    'CENTRAL_REGULATION_GROUP',
    'CENTRAL_REGULATION',
    'CENTRAL_REQUIREMENT',
    'CENTRAL_POLICY_GROUP',
    'CENTRAL_POLICY',
    'CENTRAL_POLICY_ORG',
    'CENTRAL_POLICY_VERSION',
    'CENTRAL_CONTROL_SCOPE',
    'CENTRAL_RISK_SCOPE',
    'CENTRAL_OBJECTIVE_SCOPE',
    'CENTRAL_REQUIREMENT_SCOPE',
    'CENTRAL_POLICY_SUBPROCESS',
    'CENTRAL_POLICY_CONTROL',
    'CENTRAL_POLICY_REQUIREMENT',
    'CENTRAL_CONTROL_ACCOUNT_GROUP',
    'CENTRAL_OBJECTIVE_ACCOUNT_GROUP',
    'CENTRAL_RISK_CONTROL_COV',
    'CENTRAL_RISK_OBJECTIVE_COV',
    'CENTRAL_CONTROL_OBJECTIVE_COV',
    'CENTRAL_REQUIREMENT_CONTROL_COV',
    'LOCAL_CONTEXT',
    'LOCAL_CONTROL_SCOPE',
    'LOCAL_RISK_SCOPE',
    'LOCAL_OBJECTIVE_SCOPE',
    'LOCAL_REQUIREMENT_SCOPE',
    'LOCAL_RISK_CONTROL_COV',
    'LOCAL_RISK_OBJECTIVE_COV',
    'LOCAL_CONTROL_OBJECTIVE_COV',
    'LOCAL_REQUIREMENT_CONTROL_COV',
    'LOCAL_POLICY_ORG',
    'LOCAL_POLICY_SUBPROCESS',
    'LOCAL_POLICY_CONTROL',
    'LOCAL_POLICY_REQUIREMENT',
    'DOCUMENT',
    'DOCUMENT_VERSION',
    'DOCUMENT_LINK'
));
