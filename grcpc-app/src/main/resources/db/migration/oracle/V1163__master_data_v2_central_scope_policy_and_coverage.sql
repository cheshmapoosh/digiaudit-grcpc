create table central_subprocess_control_scope (
    id raw(16) not null,
    subprocess_id raw(16) not null,
    control_id raw(16) not null,
    recommended_frequency_code varchar2(64 byte),
    recommended_execution_method_code varchar2(64 byte),
    recommended_test_method_code varchar2(64 byte),
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
    constraint pk_central_sp_control_scope primary key (id),
    constraint uk_central_sp_control_scope unique (subprocess_id, control_id),
    constraint uk_central_sp_control_scope_ctx unique (id, subprocess_id),
    constraint fk_central_sp_ctrl_scope_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint fk_central_sp_ctrl_scope_ctrl foreign key (control_id) references central_control(id),
    constraint ck_central_sp_control_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_sp_control_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_sp_control_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_sp_ctrl_scope_ctrl on central_subprocess_control_scope(control_id);

create table central_subprocess_risk_scope (
    id raw(16) not null,
    subprocess_id raw(16) not null,
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
    constraint pk_central_sp_risk_scope primary key (id),
    constraint uk_central_sp_risk_scope unique (subprocess_id, risk_template_id),
    constraint uk_central_sp_risk_scope_ctx unique (id, subprocess_id),
    constraint fk_central_sp_risk_scope_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint fk_central_sp_risk_scope_rt foreign key (risk_template_id) references central_risk_template(id),
    constraint ck_central_sp_risk_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_sp_risk_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_sp_risk_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_sp_risk_scope_rt on central_subprocess_risk_scope(risk_template_id);

create table central_subprocess_control_objective_scope (
    id raw(16) not null,
    subprocess_id raw(16) not null,
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
    constraint pk_central_sp_objective_scope primary key (id),
    constraint uk_central_sp_objective_scope unique (subprocess_id, control_objective_id),
    constraint uk_central_sp_objective_scope_ctx unique (id, subprocess_id),
    constraint fk_central_sp_obj_scope_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint fk_central_sp_obj_scope_obj foreign key (control_objective_id) references central_control_objective(id),
    constraint ck_central_sp_objective_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_sp_objective_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_sp_objective_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_sp_obj_scope_obj on central_subprocess_control_objective_scope(control_objective_id);

create table central_subprocess_requirement_scope (
    id raw(16) not null,
    subprocess_id raw(16) not null,
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
    constraint pk_central_sp_requirement_scope primary key (id),
    constraint uk_central_sp_requirement_scope unique (subprocess_id, requirement_id),
    constraint uk_central_sp_requirement_scope_ctx unique (id, subprocess_id),
    constraint fk_central_sp_req_scope_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint fk_central_sp_req_scope_req foreign key (requirement_id) references central_regulation_requirement(id),
    constraint ck_central_sp_requirement_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_sp_requirement_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_sp_requirement_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_sp_req_scope_req on central_subprocess_requirement_scope(requirement_id);

create table central_policy_version_subprocess_scope (
    id raw(16) not null,
    policy_version_id raw(16) not null,
    subprocess_id raw(16) not null,
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
    constraint pk_central_policy_sp_scope primary key (id),
    constraint uk_central_policy_sp_scope unique (policy_version_id, subprocess_id),
    constraint fk_central_policy_sp_scope_pol foreign key (policy_version_id) references central_policy_version(id),
    constraint fk_central_policy_sp_scope_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint ck_central_policy_sp_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_policy_sp_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_policy_sp_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_policy_sp_scope_sp on central_policy_version_subprocess_scope(subprocess_id);

create table central_policy_version_control_scope (
    id raw(16) not null,
    policy_version_id raw(16) not null,
    central_control_scope_id raw(16) not null,
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
    constraint pk_central_policy_control_scope primary key (id),
    constraint uk_central_policy_control_scope unique (policy_version_id, central_control_scope_id),
    constraint fk_central_policy_ctrl_pol foreign key (policy_version_id) references central_policy_version(id),
    constraint fk_central_policy_ctrl_scope foreign key (central_control_scope_id) references central_subprocess_control_scope(id),
    constraint ck_central_policy_ctrl_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_policy_ctrl_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_policy_ctrl_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_policy_ctrl_scope on central_policy_version_control_scope(central_control_scope_id);

create table central_policy_version_requirement_scope (
    id raw(16) not null,
    policy_version_id raw(16) not null,
    central_requirement_scope_id raw(16) not null,
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
    constraint pk_central_policy_req_scope primary key (id),
    constraint uk_central_policy_req_scope unique (policy_version_id, central_requirement_scope_id),
    constraint fk_central_policy_req_pol foreign key (policy_version_id) references central_policy_version(id),
    constraint fk_central_policy_req_scope foreign key (central_requirement_scope_id) references central_subprocess_requirement_scope(id),
    constraint ck_central_policy_req_scope_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_policy_req_scope_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_policy_req_scope_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_policy_req_scope on central_policy_version_requirement_scope(central_requirement_scope_id);

create table central_control_account_group (
    id raw(16) not null,
    control_id raw(16) not null,
    account_group_id raw(16) not null,
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
    constraint pk_central_control_account_group primary key (id),
    constraint uk_central_control_account_group unique (control_id, account_group_id),
    constraint fk_central_ctrl_acct_ctrl foreign key (control_id) references central_control(id),
    constraint fk_central_ctrl_acct_group foreign key (account_group_id) references central_account_group(id),
    constraint ck_central_ctrl_acct_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_ctrl_acct_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_ctrl_acct_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_ctrl_acct_group on central_control_account_group(account_group_id);

create table central_control_objective_account_group (
    id raw(16) not null,
    control_objective_id raw(16) not null,
    account_group_id raw(16) not null,
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
    constraint pk_central_objective_account_group primary key (id),
    constraint uk_central_objective_account_group unique (control_objective_id, account_group_id),
    constraint fk_central_obj_acct_obj foreign key (control_objective_id) references central_control_objective(id),
    constraint fk_central_obj_acct_group foreign key (account_group_id) references central_account_group(id),
    constraint ck_central_obj_acct_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_obj_acct_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_obj_acct_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_obj_acct_group on central_control_objective_account_group(account_group_id);

create table central_subprocess_risk_control_coverage (
    id raw(16) not null,
    subprocess_id raw(16) not null,
    risk_scope_id raw(16) not null,
    control_scope_id raw(16) not null,
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
    constraint pk_central_risk_control_cov primary key (id),
    constraint uk_central_risk_control_cov unique (subprocess_id, risk_scope_id, control_scope_id),
    constraint fk_central_rc_cov_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint fk_central_rc_cov_risk foreign key (risk_scope_id, subprocess_id) references central_subprocess_risk_scope(id, subprocess_id),
    constraint fk_central_rc_cov_control foreign key (control_scope_id, subprocess_id) references central_subprocess_control_scope(id, subprocess_id),
    constraint ck_central_rc_cov_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_rc_cov_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_rc_cov_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_rc_cov_risk on central_subprocess_risk_control_coverage(risk_scope_id, subprocess_id);
create index ix_central_rc_cov_control on central_subprocess_risk_control_coverage(control_scope_id, subprocess_id);

create table central_subprocess_risk_control_objective_coverage (
    id raw(16) not null,
    subprocess_id raw(16) not null,
    risk_scope_id raw(16) not null,
    control_objective_scope_id raw(16) not null,
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
    constraint pk_central_risk_objective_cov primary key (id),
    constraint uk_central_risk_objective_cov unique (subprocess_id, risk_scope_id, control_objective_scope_id),
    constraint fk_central_ro_cov_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint fk_central_ro_cov_risk foreign key (risk_scope_id, subprocess_id) references central_subprocess_risk_scope(id, subprocess_id),
    constraint fk_central_ro_cov_obj foreign key (control_objective_scope_id, subprocess_id) references central_subprocess_control_objective_scope(id, subprocess_id),
    constraint ck_central_ro_cov_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_ro_cov_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_ro_cov_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_ro_cov_risk on central_subprocess_risk_control_objective_coverage(risk_scope_id, subprocess_id);
create index ix_central_ro_cov_obj on central_subprocess_risk_control_objective_coverage(control_objective_scope_id, subprocess_id);

create table central_subprocess_control_control_objective_coverage (
    id raw(16) not null,
    subprocess_id raw(16) not null,
    control_scope_id raw(16) not null,
    control_objective_scope_id raw(16) not null,
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
    constraint pk_central_control_objective_cov primary key (id),
    constraint uk_central_control_objective_cov unique (subprocess_id, control_scope_id, control_objective_scope_id),
    constraint fk_central_co_cov_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint fk_central_co_cov_ctrl foreign key (control_scope_id, subprocess_id) references central_subprocess_control_scope(id, subprocess_id),
    constraint fk_central_co_cov_obj foreign key (control_objective_scope_id, subprocess_id) references central_subprocess_control_objective_scope(id, subprocess_id),
    constraint ck_central_co_cov_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_co_cov_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_co_cov_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_co_cov_ctrl on central_subprocess_control_control_objective_coverage(control_scope_id, subprocess_id);
create index ix_central_co_cov_obj on central_subprocess_control_control_objective_coverage(control_objective_scope_id, subprocess_id);

create table central_subprocess_requirement_control_coverage (
    id raw(16) not null,
    subprocess_id raw(16) not null,
    requirement_scope_id raw(16) not null,
    control_scope_id raw(16) not null,
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
    constraint pk_central_requirement_control_cov primary key (id),
    constraint uk_central_requirement_control_cov unique (subprocess_id, requirement_scope_id, control_scope_id),
    constraint fk_central_req_ctrl_cov_sp foreign key (subprocess_id) references central_subprocess(id),
    constraint fk_central_req_ctrl_cov_req foreign key (requirement_scope_id, subprocess_id) references central_subprocess_requirement_scope(id, subprocess_id),
    constraint fk_central_req_ctrl_cov_ctrl foreign key (control_scope_id, subprocess_id) references central_subprocess_control_scope(id, subprocess_id),
    constraint ck_central_req_ctrl_cov_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_central_req_ctrl_cov_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_central_req_ctrl_cov_del check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_central_req_ctrl_cov_req on central_subprocess_requirement_control_coverage(requirement_scope_id, subprocess_id);
create index ix_central_req_ctrl_cov_ctrl on central_subprocess_requirement_control_coverage(control_scope_id, subprocess_id);
