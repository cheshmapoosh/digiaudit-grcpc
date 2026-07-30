create sequence seq_masterdata_revision_number
    start with 1
    increment by 1;

create table masterdata_revision (
    id raw(16) not null,
    revision_number number(19,0) not null,
    title varchar2(255 char) not null,
    description clob,
    revision_domain varchar2(32 byte) not null,
    organization_id raw(16),
    caused_by_revision_id raw(16),
    revision_status varchar2(32 byte) not null,
    external_approval_reference varchar2(255 char),
    impact_analysis_snapshot clob,
    impact_analyzed_at timestamp(6) with time zone,
    impact_analyzed_by raw(16),
    applied_at timestamp(6) with time zone,
    applied_by raw(16),
    cancelled_at timestamp(6) with time zone,
    cancelled_by raw(16),
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    version number(19,0) default 0 not null,
    constraint pk_masterdata_revision primary key (id),
    constraint uk_masterdata_revision_number unique (revision_number),
    constraint fk_masterdata_revision_org foreign key (organization_id) references organization(id),
    constraint fk_masterdata_revision_caused foreign key (caused_by_revision_id) references masterdata_revision(id),
    constraint ck_masterdata_revision_domain check (revision_domain in ('CENTRAL', 'LOCAL')),
    constraint ck_masterdata_revision_status check (revision_status in ('DRAFT', 'APPLIED', 'CANCELLED')),
    constraint ck_masterdata_revision_org check (
        (revision_domain = 'CENTRAL' and organization_id is null)
        or (revision_domain = 'LOCAL' and organization_id is not null)
    ),
    constraint ck_masterdata_revision_impact_json check (impact_analysis_snapshot is null or impact_analysis_snapshot is json),
    constraint ck_masterdata_revision_status_time check (
        (revision_status = 'DRAFT'
            and applied_at is null and applied_by is null
            and cancelled_at is null and cancelled_by is null)
        or (revision_status = 'APPLIED'
            and applied_at is not null and applied_by is not null
            and cancelled_at is null and cancelled_by is null)
        or (revision_status = 'CANCELLED'
            and cancelled_at is not null and cancelled_by is not null
            and applied_at is null and applied_by is null)
    )
);

create index ix_masterdata_revision_org on masterdata_revision(organization_id);
create index ix_masterdata_revision_caused on masterdata_revision(caused_by_revision_id);
create index ix_masterdata_revision_status_time on masterdata_revision(revision_status, applied_at, created_at);

create table masterdata_revision_content (
    id raw(16) not null,
    revision_id raw(16) not null,
    sequence_number number(19,0) not null,
    entity_type varchar2(32 byte) not null,
    entity_id raw(16) not null,
    operation_type varchar2(32 byte) not null,
    expected_version number(19,0),
    before_snapshot clob,
    after_snapshot clob,
    applied_entity_version number(19,0),
    validation_result clob,
    created_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    version number(19,0) default 0 not null,
    constraint pk_masterdata_revision_content primary key (id),
    constraint uk_masterdata_revision_content_seq unique (revision_id, sequence_number),
    constraint fk_masterdata_revision_content_rev foreign key (revision_id) references masterdata_revision(id),
    constraint ck_masterdata_revision_content_seq check (sequence_number > 0),
    constraint ck_masterdata_revision_content_entity check (entity_type in (
        'ORG',
        'CENTRAL_PROCESS',
        'CENTRAL_SUBPROCESS',
        'CENTRAL_CONTROL',
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
        'DOCUMENT_RETENTION_POLICY',
        'DOCUMENT',
        'DOCUMENT_VERSION',
        'DOCUMENT_HOLD',
        'DOCUMENT_LINK'
    )),
    constraint ck_masterdata_revision_content_op check (operation_type in ('CREATE', 'UPDATE', 'ACTIVATE', 'INACTIVATE', 'DELETE', 'RESTORE')),
    constraint ck_masterdata_revision_content_exp check (
        (operation_type = 'CREATE' and expected_version is null)
        or (operation_type <> 'CREATE' and expected_version is not null and expected_version >= 0)
    ),
    constraint ck_masterdata_revision_content_app_ver check (applied_entity_version is null or applied_entity_version >= 0),
    constraint ck_masterdata_revision_content_before check (before_snapshot is null or before_snapshot is json),
    constraint ck_masterdata_revision_content_after check (after_snapshot is null or after_snapshot is json),
    constraint ck_masterdata_revision_content_valid check (validation_result is null or validation_result is json)
);

create index ix_masterdata_revision_content_target on masterdata_revision_content(entity_type, entity_id);
