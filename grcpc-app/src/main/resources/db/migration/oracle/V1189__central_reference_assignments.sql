-- Accepted central reference Assignments. Existing Scope/Coverage data and contracts are retained.

create table central_risk_control_assignment (
    id raw(16) not null,
    control_id raw(16) not null,
    risk_template_id raw(16) not null,
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
    constraint pk_central_rca primary key (id),
    constraint uk_central_rca_pair unique (control_id, risk_template_id),
    constraint fk_central_rca_owner foreign key (control_id) references central_control(id),
    constraint fk_central_rca_dest foreign key (risk_template_id) references central_risk_template(id),
    constraint ck_central_rca_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_rca_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_rca_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);
create index ix_central_rca_dest on central_risk_control_assignment(risk_template_id);

create table central_risk_control_objective_assignment (
    id raw(16) not null,
    control_objective_id raw(16) not null,
    risk_template_id raw(16) not null,
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
    constraint pk_central_roa primary key (id),
    constraint uk_central_roa_pair unique (control_objective_id, risk_template_id),
    constraint fk_central_roa_owner foreign key (control_objective_id) references central_control_objective(id),
    constraint fk_central_roa_dest foreign key (risk_template_id) references central_risk_template(id),
    constraint ck_central_roa_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_roa_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_roa_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);
create index ix_central_roa_dest on central_risk_control_objective_assignment(risk_template_id);

create table central_control_control_objective_assignment (
    id raw(16) not null,
    control_id raw(16) not null,
    control_objective_id raw(16) not null,
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
    constraint pk_central_coa primary key (id),
    constraint uk_central_coa_pair unique (control_id, control_objective_id),
    constraint fk_central_coa_owner foreign key (control_id) references central_control(id),
    constraint fk_central_coa_dest foreign key (control_objective_id) references central_control_objective(id),
    constraint ck_central_coa_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_coa_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_coa_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);
create index ix_central_coa_dest on central_control_control_objective_assignment(control_objective_id);

create table central_requirement_control_assignment (
    id raw(16) not null,
    control_id raw(16) not null,
    requirement_id raw(16) not null,
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
    constraint pk_central_qca primary key (id),
    constraint uk_central_qca_pair unique (control_id, requirement_id),
    constraint fk_central_qca_owner foreign key (control_id) references central_control(id),
    constraint fk_central_qca_dest foreign key (requirement_id) references central_regulation_requirement(id),
    constraint ck_central_qca_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_qca_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_qca_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);
create index ix_central_qca_dest on central_requirement_control_assignment(requirement_id);

alter table masterdata_revision_content drop constraint ck_masterdata_revision_content_entity;
alter table masterdata_revision_content add constraint ck_masterdata_revision_content_entity
    check (entity_type in (
        'ORG',
        'OBJECTIVE',
        'ORGANIZATION_OBJECTIVE',
        'CONTROL_GROUP',
        'GLOBAL_CONTROL',
        'GLOBAL_CONTROL_REGULATION',
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
        'CENTRAL_POLICY_ORG',
        'CENTRAL_POLICY_CONTROL',
        'CENTRAL_POLICY_REQUIREMENT',
        'CENTRAL_RISK_CONTROL_ASG',
        'CENTRAL_RISK_OBJECTIVE_ASG',
        'CENTRAL_CONTROL_OBJECTIVE_ASG',
        'CENTRAL_REQUIREMENT_CONTROL_ASG',
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
