create table central_control_group (
    id raw(16) not null,
    code varchar2(64 byte) not null,
    title varchar2(255 char) not null,
    parent_group_id raw(16),
    description clob,
    sort_order number(10,0) default 0 not null,
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
    constraint pk_central_control_group primary key (id),
    constraint uk_central_control_group_code unique (code),
    constraint fk_central_control_group_parent foreign key (parent_group_id) references central_control_group(id),
    constraint ck_central_control_group_code check (code = upper(trim(code))),
    constraint ck_central_control_group_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_control_group_dates check (
        (valid_from is null or valid_from = trunc(valid_from))
        and (valid_to is null or valid_to = trunc(valid_to))
    ),
    constraint ck_central_control_group_range check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_control_group_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    ),
    constraint ck_central_control_group_self check (parent_group_id is null or parent_group_id <> id),
    constraint ck_central_control_group_sort check (sort_order >= 0)
);

create index ix_central_control_group_parent on central_control_group(parent_group_id);

alter table central_control add (
    control_group_id raw(16),
    control_risk varchar2(32 byte),
    nature varchar2(32 byte),
    control_relevance varchar2(1000 char),
    trigger_type varchar2(32 byte),
    operation_frequency varchar2(32 byte),
    to_be_tested number(1,0),
    test_automation_type varchar2(32 byte),
    testing_technique varchar2(64 byte),
    evidence_level varchar2(64 byte)
);

alter table central_control add constraint fk_central_control_group
    foreign key (control_group_id) references central_control_group(id);

alter table central_control add constraint ck_central_control_risk
    check (control_risk is null or control_risk in ('LOW', 'MEDIUM', 'HIGH'));

alter table central_control add constraint ck_central_control_nature
    check (nature is null or nature in (
        'ADJUSTMENT', 'AUTHORIZATION', 'INITIATION', 'MATCH', 'PROCESSING',
        'RECONCILIATION', 'RECORDING', 'RESTRICTED_ACCESS', 'REVIEW',
        'SAFEGUARDING_OF_ASSETS', 'SEGREGATION_OF_DUTIES'
    ));

alter table central_control add constraint ck_central_control_trigger
    check (trigger_type is null or trigger_type in ('EVENT', 'DATE'));

alter table central_control add constraint ck_central_control_frequency
    check (operation_frequency is null or operation_frequency in (
        'ANNUAL', 'BI_WEEKLY', 'CONTINUAL', 'DAILY', 'MONTHLY', 'QUARTERLY', 'SEMI_MONTHLY', 'WEEKLY'
    ));

alter table central_control add constraint ck_central_control_frequency_trigger
    check (operation_frequency is null or trigger_type = 'DATE');

alter table central_control add constraint ck_central_control_test_flag
    check (to_be_tested is null or to_be_tested in (0, 1));

alter table central_control add constraint ck_central_control_test_automation
    check (test_automation_type is null or test_automation_type in ('AUTOMATED', 'MANUAL', 'SEMI_AUTOMATED'));

alter table central_control add constraint ck_central_control_test_technique
    check (testing_technique is null or testing_technique in (
        'ATTRIBUTE_SAMPLING',
        'DOCUMENT_INSPECTION_WITH_INQUIRY',
        'CONTROL_OBSERVATION_WITH_INQUIRY',
        'CONTROL_REPERFORMANCE_WITH_INQUIRY'
    ));

alter table central_control add constraint ck_central_control_evidence
    check (evidence_level is null or evidence_level in (
        'NO_TESTING', 'SELF_ASSESSMENT', 'CONTROL_DESIGN_AND_EFFECTIVENESS', 'NOT_APPLICABLE'
    ));

create index ix_central_control_group on central_control(control_group_id);

insert into masterdata_hierarchy_guard (hierarchy_key) values ('CONTROL');

alter table masterdata_revision_content drop constraint ck_masterdata_revision_content_entity;

alter table masterdata_revision_content add constraint ck_masterdata_revision_content_entity check (entity_type in (
    'ORG',
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
