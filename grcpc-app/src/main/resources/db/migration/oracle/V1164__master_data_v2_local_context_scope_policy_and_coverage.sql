create table local_organization_subprocess_scope (
    id raw(16) not null,
    organization_id raw(16) not null,
    subprocess_id raw(16) not null,
    context_note varchar2(1000 char),
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
    constraint pk_local_org_sp_scope primary key (id),
    constraint uk_local_org_sp_scope unique (organization_id, subprocess_id),
    constraint uk_local_org_sp_scope_ctx unique (id, organization_id, subprocess_id),
    constraint fk_local_org_sp_scope_org foreign key (organization_id) references organization(id),
    constraint fk_local_org_sp_scope_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint ck_local_org_sp_scope_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_org_sp_scope_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_org_sp_scope_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_org_sp_scope_sp on local_organization_subprocess_scope(subprocess_id);

create table local_subprocess_control_scope (
    id raw(16) not null,
    organization_subprocess_scope_id raw(16) not null,
    control_id raw(16) not null,
    central_control_scope_id raw(16),
    source_type varchar2(32 byte) not null,
    actual_owner_id raw(16),
    frequency_code varchar2(64 byte),
    execution_method_code varchar2(64 byte),
    test_method_code varchar2(64 byte),
    local_context_note varchar2(1000 char),
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
    constraint pk_local_sp_control_scope primary key (id),
    constraint uk_local_sp_control_scope unique (organization_subprocess_scope_id, control_id),
    constraint uk_local_sp_control_scope_ctx unique (id, organization_subprocess_scope_id),
    constraint fk_local_sp_ctrl_scope_ctx foreign key (organization_subprocess_scope_id) references local_organization_subprocess_scope(id),
    constraint fk_local_sp_ctrl_scope_ctrl foreign key (control_id) references central_control(id),
    constraint fk_local_sp_ctrl_scope_central foreign key (central_control_scope_id) references central_subprocess_control_scope(id),
    constraint ck_local_sp_control_scope_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_sp_control_scope_source check (source_type in ('INHERITED_FROM_CENTRAL', 'LOCAL_ADDED')),
    constraint ck_local_sp_control_scope_ref check (
        (source_type = 'INHERITED_FROM_CENTRAL' and central_control_scope_id is not null)
        or (source_type = 'LOCAL_ADDED' and central_control_scope_id is null)
    ),
    constraint ck_local_sp_control_scope_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_sp_control_scope_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_sp_ctrl_scope_ctrl on local_subprocess_control_scope(control_id);
create index ix_local_sp_ctrl_scope_central on local_subprocess_control_scope(central_control_scope_id);

create table local_subprocess_risk_scope (
    id raw(16) not null,
    organization_subprocess_scope_id raw(16) not null,
    risk_template_id raw(16) not null,
    central_risk_scope_id raw(16),
    source_type varchar2(32 byte) not null,
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
    constraint pk_local_sp_risk_scope primary key (id),
    constraint uk_local_sp_risk_scope unique (organization_subprocess_scope_id, risk_template_id),
    constraint uk_local_sp_risk_scope_ctx unique (id, organization_subprocess_scope_id),
    constraint fk_local_sp_risk_scope_ctx foreign key (organization_subprocess_scope_id) references local_organization_subprocess_scope(id),
    constraint fk_local_sp_risk_scope_rt foreign key (risk_template_id) references central_risk_template(id),
    constraint fk_local_sp_risk_scope_central foreign key (central_risk_scope_id) references central_subprocess_risk_scope(id),
    constraint ck_local_sp_risk_scope_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_sp_risk_scope_source check (source_type in ('INHERITED_FROM_CENTRAL', 'LOCAL_ADDED')),
    constraint ck_local_sp_risk_scope_ref check (
        (source_type = 'INHERITED_FROM_CENTRAL' and central_risk_scope_id is not null)
        or (source_type = 'LOCAL_ADDED' and central_risk_scope_id is null)
    ),
    constraint ck_local_sp_risk_scope_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_sp_risk_scope_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_sp_risk_scope_rt on local_subprocess_risk_scope(risk_template_id);
create index ix_local_sp_risk_scope_central on local_subprocess_risk_scope(central_risk_scope_id);

create table local_subprocess_control_objective_scope (
    id raw(16) not null,
    organization_subprocess_scope_id raw(16) not null,
    control_objective_id raw(16) not null,
    central_control_objective_scope_id raw(16),
    source_type varchar2(32 byte) not null,
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
    constraint pk_local_sp_objective_scope primary key (id),
    constraint uk_local_sp_objective_scope unique (organization_subprocess_scope_id, control_objective_id),
    constraint uk_local_sp_objective_scope_ctx unique (id, organization_subprocess_scope_id),
    constraint fk_local_sp_obj_scope_ctx foreign key (organization_subprocess_scope_id) references local_organization_subprocess_scope(id),
    constraint fk_local_sp_obj_scope_obj foreign key (control_objective_id) references central_control_objective(id),
    constraint fk_local_sp_obj_scope_central foreign key (central_control_objective_scope_id) references central_subprocess_control_objective_scope(id),
    constraint ck_local_sp_objective_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_sp_objective_scope_src check (source_type in ('INHERITED_FROM_CENTRAL', 'LOCAL_ADDED')),
    constraint ck_local_sp_objective_scope_ref check (
        (source_type = 'INHERITED_FROM_CENTRAL' and central_control_objective_scope_id is not null)
        or (source_type = 'LOCAL_ADDED' and central_control_objective_scope_id is null)
    ),
    constraint ck_local_sp_objective_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_sp_objective_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_sp_obj_scope_obj on local_subprocess_control_objective_scope(control_objective_id);
create index ix_local_sp_obj_scope_central on local_subprocess_control_objective_scope(central_control_objective_scope_id);

create table local_subprocess_requirement_scope (
    id raw(16) not null,
    organization_subprocess_scope_id raw(16) not null,
    requirement_id raw(16) not null,
    central_requirement_scope_id raw(16),
    source_type varchar2(32 byte) not null,
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
    constraint pk_local_sp_requirement_scope primary key (id),
    constraint uk_local_sp_requirement_scope unique (organization_subprocess_scope_id, requirement_id),
    constraint uk_local_sp_requirement_scope_ctx unique (id, organization_subprocess_scope_id),
    constraint fk_local_sp_req_scope_ctx foreign key (organization_subprocess_scope_id) references local_organization_subprocess_scope(id),
    constraint fk_local_sp_req_scope_req foreign key (requirement_id) references central_regulation_requirement(id),
    constraint fk_local_sp_req_scope_central foreign key (central_requirement_scope_id) references central_subprocess_requirement_scope(id),
    constraint ck_local_sp_requirement_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_sp_requirement_scope_src check (source_type in ('INHERITED_FROM_CENTRAL', 'LOCAL_ADDED')),
    constraint ck_local_sp_requirement_scope_ref check (
        (source_type = 'INHERITED_FROM_CENTRAL' and central_requirement_scope_id is not null)
        or (source_type = 'LOCAL_ADDED' and central_requirement_scope_id is null)
    ),
    constraint ck_local_sp_requirement_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_sp_requirement_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_sp_req_scope_req on local_subprocess_requirement_scope(requirement_id);
create index ix_local_sp_req_scope_central on local_subprocess_requirement_scope(central_requirement_scope_id);

create table local_subprocess_risk_control_coverage (
    id raw(16) not null,
    organization_subprocess_scope_id raw(16) not null,
    local_risk_scope_id raw(16) not null,
    local_control_scope_id raw(16) not null,
    central_risk_control_coverage_id raw(16),
    source_type varchar2(32 byte) not null,
    coverage_note varchar2(1000 char),
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
    constraint pk_local_risk_control_cov primary key (id),
    constraint uk_local_risk_control_cov unique (organization_subprocess_scope_id, local_risk_scope_id, local_control_scope_id),
    constraint fk_local_rc_cov_ctx foreign key (organization_subprocess_scope_id) references local_organization_subprocess_scope(id),
    constraint fk_local_rc_cov_central foreign key (central_risk_control_coverage_id) references central_subprocess_risk_control_coverage(id),
    constraint fk_local_rc_cov_risk foreign key (local_risk_scope_id, organization_subprocess_scope_id) references local_subprocess_risk_scope(id, organization_subprocess_scope_id),
    constraint fk_local_rc_cov_control foreign key (local_control_scope_id, organization_subprocess_scope_id) references local_subprocess_control_scope(id, organization_subprocess_scope_id),
    constraint ck_local_rc_cov_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_rc_cov_source check (source_type in ('INHERITED_FROM_CENTRAL', 'LOCAL_ADDED')),
    constraint ck_local_rc_cov_ref check (
        (source_type = 'INHERITED_FROM_CENTRAL' and central_risk_control_coverage_id is not null)
        or (source_type = 'LOCAL_ADDED' and central_risk_control_coverage_id is null)
    ),
    constraint ck_local_rc_cov_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_rc_cov_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_rc_cov_risk on local_subprocess_risk_control_coverage(local_risk_scope_id, organization_subprocess_scope_id);
create index ix_local_rc_cov_control on local_subprocess_risk_control_coverage(local_control_scope_id, organization_subprocess_scope_id);
create index ix_local_rc_cov_central on local_subprocess_risk_control_coverage(central_risk_control_coverage_id);

create table local_subprocess_risk_control_objective_coverage (
    id raw(16) not null,
    organization_subprocess_scope_id raw(16) not null,
    local_risk_scope_id raw(16) not null,
    local_control_objective_scope_id raw(16) not null,
    central_risk_control_objective_coverage_id raw(16),
    source_type varchar2(32 byte) not null,
    coverage_note varchar2(1000 char),
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
    constraint pk_local_risk_objective_cov primary key (id),
    constraint uk_local_risk_objective_cov unique (organization_subprocess_scope_id, local_risk_scope_id, local_control_objective_scope_id),
    constraint fk_local_ro_cov_ctx foreign key (organization_subprocess_scope_id) references local_organization_subprocess_scope(id),
    constraint fk_local_ro_cov_central foreign key (central_risk_control_objective_coverage_id) references central_subprocess_risk_control_objective_coverage(id),
    constraint fk_local_ro_cov_risk foreign key (local_risk_scope_id, organization_subprocess_scope_id) references local_subprocess_risk_scope(id, organization_subprocess_scope_id),
    constraint fk_local_ro_cov_objective foreign key (local_control_objective_scope_id, organization_subprocess_scope_id) references local_subprocess_control_objective_scope(id, organization_subprocess_scope_id),
    constraint ck_local_ro_cov_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_ro_cov_source check (source_type in ('INHERITED_FROM_CENTRAL', 'LOCAL_ADDED')),
    constraint ck_local_ro_cov_ref check (
        (source_type = 'INHERITED_FROM_CENTRAL' and central_risk_control_objective_coverage_id is not null)
        or (source_type = 'LOCAL_ADDED' and central_risk_control_objective_coverage_id is null)
    ),
    constraint ck_local_ro_cov_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_ro_cov_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_ro_cov_risk on local_subprocess_risk_control_objective_coverage(local_risk_scope_id, organization_subprocess_scope_id);
create index ix_local_ro_cov_obj on local_subprocess_risk_control_objective_coverage(local_control_objective_scope_id, organization_subprocess_scope_id);
create index ix_local_ro_cov_central on local_subprocess_risk_control_objective_coverage(central_risk_control_objective_coverage_id);

create table local_subprocess_control_control_objective_coverage (
    id raw(16) not null,
    organization_subprocess_scope_id raw(16) not null,
    local_control_scope_id raw(16) not null,
    local_control_objective_scope_id raw(16) not null,
    central_control_control_objective_coverage_id raw(16),
    source_type varchar2(32 byte) not null,
    coverage_note varchar2(1000 char),
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
    constraint pk_local_control_objective_cov primary key (id),
    constraint uk_local_control_objective_cov unique (organization_subprocess_scope_id, local_control_scope_id, local_control_objective_scope_id),
    constraint fk_local_co_cov_ctx foreign key (organization_subprocess_scope_id) references local_organization_subprocess_scope(id),
    constraint fk_local_co_cov_central foreign key (central_control_control_objective_coverage_id) references central_subprocess_control_control_objective_coverage(id),
    constraint fk_local_co_cov_control foreign key (local_control_scope_id, organization_subprocess_scope_id) references local_subprocess_control_scope(id, organization_subprocess_scope_id),
    constraint fk_local_co_cov_objective foreign key (local_control_objective_scope_id, organization_subprocess_scope_id) references local_subprocess_control_objective_scope(id, organization_subprocess_scope_id),
    constraint ck_local_co_cov_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_co_cov_source check (source_type in ('INHERITED_FROM_CENTRAL', 'LOCAL_ADDED')),
    constraint ck_local_co_cov_ref check (
        (source_type = 'INHERITED_FROM_CENTRAL' and central_control_control_objective_coverage_id is not null)
        or (source_type = 'LOCAL_ADDED' and central_control_control_objective_coverage_id is null)
    ),
    constraint ck_local_co_cov_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_co_cov_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_co_cov_control on local_subprocess_control_control_objective_coverage(local_control_scope_id, organization_subprocess_scope_id);
create index ix_local_co_cov_obj on local_subprocess_control_control_objective_coverage(local_control_objective_scope_id, organization_subprocess_scope_id);
create index ix_local_co_cov_central on local_subprocess_control_control_objective_coverage(central_control_control_objective_coverage_id);

create table local_subprocess_requirement_control_coverage (
    id raw(16) not null,
    organization_subprocess_scope_id raw(16) not null,
    local_requirement_scope_id raw(16) not null,
    local_control_scope_id raw(16) not null,
    central_requirement_control_coverage_id raw(16),
    source_type varchar2(32 byte) not null,
    coverage_note varchar2(1000 char),
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
    constraint pk_local_requirement_control_cov primary key (id),
    constraint uk_local_requirement_control_cov unique (organization_subprocess_scope_id, local_requirement_scope_id, local_control_scope_id),
    constraint fk_local_req_ctrl_cov_ctx foreign key (organization_subprocess_scope_id) references local_organization_subprocess_scope(id),
    constraint fk_local_req_ctrl_cov_central foreign key (central_requirement_control_coverage_id) references central_subprocess_requirement_control_coverage(id),
    constraint fk_local_req_ctrl_cov_req foreign key (local_requirement_scope_id, organization_subprocess_scope_id) references local_subprocess_requirement_scope(id, organization_subprocess_scope_id),
    constraint fk_local_req_ctrl_cov_ctrl foreign key (local_control_scope_id, organization_subprocess_scope_id) references local_subprocess_control_scope(id, organization_subprocess_scope_id),
    constraint ck_local_req_ctrl_cov_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_req_ctrl_cov_src check (source_type in ('INHERITED_FROM_CENTRAL', 'LOCAL_ADDED')),
    constraint ck_local_req_ctrl_cov_ref check (
        (source_type = 'INHERITED_FROM_CENTRAL' and central_requirement_control_coverage_id is not null)
        or (source_type = 'LOCAL_ADDED' and central_requirement_control_coverage_id is null)
    ),
    constraint ck_local_req_ctrl_cov_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_req_ctrl_cov_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_req_ctrl_cov_req on local_subprocess_requirement_control_coverage(local_requirement_scope_id, organization_subprocess_scope_id);
create index ix_local_req_ctrl_cov_ctrl on local_subprocess_requirement_control_coverage(local_control_scope_id, organization_subprocess_scope_id);
create index ix_local_req_ctrl_cov_central on local_subprocess_requirement_control_coverage(central_requirement_control_coverage_id);

create table local_policy_organization_scope (
    id raw(16) not null,
    organization_id raw(16) not null,
    policy_version_id raw(16) not null,
    scope_action varchar2(32 byte) not null,
    propagation_mode varchar2(32 byte) not null,
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
    constraint pk_local_policy_org_scope primary key (id),
    constraint uk_local_policy_org_scope unique (organization_id, policy_version_id),
    constraint fk_local_policy_org_scope_org foreign key (organization_id) references organization(id),
    constraint fk_local_policy_org_scope_pol foreign key (policy_version_id) references central_policy_version(id),
    constraint ck_local_policy_org_scope_action check (scope_action in ('INCLUDE', 'EXCLUDE')),
    constraint ck_local_policy_org_scope_mode check (propagation_mode in ('DIRECT_ONLY', 'INCLUDE_DESCENDANTS')),
    constraint ck_local_policy_org_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_policy_org_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_policy_org_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_policy_org_scope_pol on local_policy_organization_scope(policy_version_id);

create table local_policy_subprocess_scope (
    id raw(16) not null,
    organization_subprocess_scope_id raw(16) not null,
    policy_version_id raw(16) not null,
    scope_action varchar2(32 byte) not null,
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
    constraint pk_local_policy_sp_scope primary key (id),
    constraint uk_local_policy_sp_scope unique (organization_subprocess_scope_id, policy_version_id),
    constraint fk_local_policy_sp_scope_ctx foreign key (organization_subprocess_scope_id) references local_organization_subprocess_scope(id),
    constraint fk_local_policy_sp_scope_pol foreign key (policy_version_id) references central_policy_version(id),
    constraint ck_local_policy_sp_scope_action check (scope_action in ('INCLUDE', 'EXCLUDE')),
    constraint ck_local_policy_sp_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_policy_sp_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_policy_sp_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_policy_sp_scope_pol on local_policy_subprocess_scope(policy_version_id);

create table local_policy_control_scope (
    id raw(16) not null,
    local_control_scope_id raw(16) not null,
    policy_version_id raw(16) not null,
    scope_action varchar2(32 byte) not null,
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
    constraint pk_local_policy_control_scope primary key (id),
    constraint uk_local_policy_control_scope unique (local_control_scope_id, policy_version_id),
    constraint fk_local_policy_ctrl_scope_scope foreign key (local_control_scope_id) references local_subprocess_control_scope(id),
    constraint fk_local_policy_ctrl_scope_pol foreign key (policy_version_id) references central_policy_version(id),
    constraint ck_local_policy_ctrl_scope_action check (scope_action in ('INCLUDE', 'EXCLUDE')),
    constraint ck_local_policy_ctrl_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_policy_ctrl_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_policy_ctrl_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_policy_ctrl_scope_pol on local_policy_control_scope(policy_version_id);

create table local_policy_requirement_scope (
    id raw(16) not null,
    local_requirement_scope_id raw(16) not null,
    policy_version_id raw(16) not null,
    scope_action varchar2(32 byte) not null,
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
    constraint pk_local_policy_req_scope primary key (id),
    constraint uk_local_policy_req_scope unique (local_requirement_scope_id, policy_version_id),
    constraint fk_local_policy_req_scope_scope foreign key (local_requirement_scope_id) references local_subprocess_requirement_scope(id),
    constraint fk_local_policy_req_scope_pol foreign key (policy_version_id) references central_policy_version(id),
    constraint ck_local_policy_req_scope_action check (scope_action in ('INCLUDE', 'EXCLUDE')),
    constraint ck_local_policy_req_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_local_policy_req_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_local_policy_req_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_local_policy_req_scope_pol on local_policy_requirement_scope(policy_version_id);
