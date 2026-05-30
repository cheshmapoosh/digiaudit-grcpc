create table organization_process_risk_assignment (
    id varchar2(36 char) primary key,
    organization_id varchar2(36 char) not null,
    process_node_id varchar2(36 char) not null,
    risk_node_id varchar2(36 char) not null,
    assignment_type varchar2(50 char) default 'scope' not null,
    valid_from date,
    valid_to date,
    active number(1) default 1 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_org_proc_risk_asg_org foreign key (organization_id) references organization(id),
    constraint fk_org_proc_risk_asg_process foreign key (process_node_id) references process_node(id),
    constraint fk_org_proc_risk_asg_risk foreign key (risk_node_id) references risk_node(id),
    constraint uk_org_proc_risk_assignment unique (organization_id, process_node_id, risk_node_id),
    constraint chk_org_proc_risk_asg_type check (assignment_type in ('scope', 'owner', 'participant')),
    constraint chk_org_proc_risk_asg_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index idx_org_proc_risk_asg_org on organization_process_risk_assignment(organization_id);
create index idx_org_proc_risk_asg_process on organization_process_risk_assignment(process_node_id);
create index idx_org_proc_risk_asg_risk on organization_process_risk_assignment(risk_node_id);
create index idx_org_proc_risk_asg_active on organization_process_risk_assignment(active);
