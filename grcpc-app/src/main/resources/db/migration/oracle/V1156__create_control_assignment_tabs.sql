create table control_step (
    id varchar2(36 char) primary key,
    control_assignment_id varchar2(36 char) not null,
    title varchar2(255 char) not null,
    description varchar2(2000 char),
    required_document varchar2(1000 char),
    required_note varchar2(1000 char),
    sensitivity varchar2(100 char),
    sort_order number(10),
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_control_step_assignment foreign key (control_assignment_id) references control_assignment(id) on delete cascade
);

create index idx_control_step_assignment on control_step(control_assignment_id);

create table control_regulation_link (
    id varchar2(36 char) primary key,
    control_assignment_id varchar2(36 char) not null,
    regulation_id varchar2(36 char) not null,
    code varchar2(50 char),
    title varchar2(255 char),
    description varchar2(2000 char),
    valid_from date,
    valid_to date,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_ctl_reg_link_assignment foreign key (control_assignment_id) references control_assignment(id) on delete cascade,
    constraint fk_ctl_reg_link_regulation foreign key (regulation_id) references regulation(id),
    constraint uk_ctl_reg_link unique (control_assignment_id, regulation_id),
    constraint chk_ctl_reg_link_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index idx_ctl_reg_link_assignment on control_regulation_link(control_assignment_id);
create index idx_ctl_reg_link_regulation on control_regulation_link(regulation_id);

create table control_requirement_link (
    id varchar2(36 char) primary key,
    control_assignment_id varchar2(36 char) not null,
    requirement_id varchar2(36 char) not null,
    regulation_id varchar2(36 char),
    code varchar2(50 char),
    title varchar2(255 char),
    description varchar2(2000 char),
    regulation_title varchar2(255 char),
    valid_from date,
    valid_to date,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_ctl_req_link_assignment foreign key (control_assignment_id) references control_assignment(id) on delete cascade,
    constraint fk_ctl_req_link_requirement foreign key (requirement_id) references regulation(id),
    constraint fk_ctl_req_link_regulation foreign key (regulation_id) references regulation(id),
    constraint uk_ctl_req_link unique (control_assignment_id, requirement_id),
    constraint chk_ctl_req_link_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index idx_ctl_req_link_assignment on control_requirement_link(control_assignment_id);
create index idx_ctl_req_link_requirement on control_requirement_link(requirement_id);
create index idx_ctl_req_link_regulation on control_requirement_link(regulation_id);

create table control_risk_link (
    id varchar2(36 char) primary key,
    control_assignment_id varchar2(36 char) not null,
    risk_id varchar2(36 char) not null,
    code varchar2(50 char),
    title varchar2(255 char),
    description varchar2(2000 char),
    source varchar2(255 char),
    organization_title varchar2(255 char),
    valid_from date,
    valid_to date,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_ctl_risk_link_assignment foreign key (control_assignment_id) references control_assignment(id) on delete cascade,
    constraint fk_ctl_risk_link_risk foreign key (risk_id) references risk_node(id),
    constraint uk_ctl_risk_link unique (control_assignment_id, risk_id),
    constraint chk_ctl_risk_link_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index idx_ctl_risk_link_assignment on control_risk_link(control_assignment_id);
create index idx_ctl_risk_link_risk on control_risk_link(risk_id);

create table control_account_group_link (
    id varchar2(36 char) primary key,
    control_assignment_id varchar2(36 char) not null,
    account_group_id varchar2(36 char) not null,
    code varchar2(50 char),
    title varchar2(255 char),
    description varchar2(2000 char),
    assertion_type varchar2(255 char),
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_ctl_acc_link_assignment foreign key (control_assignment_id) references control_assignment(id) on delete cascade,
    constraint fk_ctl_acc_link_group foreign key (account_group_id) references account_group(id),
    constraint uk_ctl_acc_link unique (control_assignment_id, account_group_id)
);

create index idx_ctl_acc_link_assignment on control_account_group_link(control_assignment_id);
create index idx_ctl_acc_link_group on control_account_group_link(account_group_id);

create table control_document (
    id varchar2(36 char) primary key,
    control_assignment_id varchar2(36 char) not null,
    name varchar2(255 char) not null,
    document_type varchar2(100 char),
    description varchar2(1000 char),
    file_ref varchar2(1000 char),
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_control_doc_assignment foreign key (control_assignment_id) references control_assignment(id) on delete cascade
);

create index idx_control_doc_assignment on control_document(control_assignment_id);

create table control_performance_plan (
    id varchar2(36 char) primary key,
    control_assignment_id varchar2(36 char) not null,
    title varchar2(255 char) not null,
    description varchar2(2000 char),
    frequency varchar2(100 char),
    owner_name varchar2(255 char),
    planned_date date,
    status varchar2(50 char),
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_control_perf_assignment foreign key (control_assignment_id) references control_assignment(id) on delete cascade
);

create index idx_control_perf_assignment on control_performance_plan(control_assignment_id);
