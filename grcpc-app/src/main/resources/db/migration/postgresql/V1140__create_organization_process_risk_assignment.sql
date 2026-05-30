create table if not exists organization_process_risk_assignment (
    id uuid primary key,
    organization_id uuid not null,
    process_node_id uuid not null,
    risk_node_id uuid not null,
    assignment_type varchar(50) not null default 'scope',
    valid_from date null,
    valid_to date null,
    active boolean not null default true,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint fk_org_proc_risk_asg_org foreign key (organization_id) references organization(id) on delete restrict,
    constraint fk_org_proc_risk_asg_process foreign key (process_node_id) references process_node(id) on delete restrict,
    constraint fk_org_proc_risk_asg_risk foreign key (risk_node_id) references risk_node(id) on delete restrict,
    constraint uk_org_proc_risk_assignment unique (organization_id, process_node_id, risk_node_id),
    constraint chk_org_proc_risk_asg_type check (assignment_type in ('scope', 'owner', 'participant')),
    constraint chk_org_proc_risk_asg_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index if not exists idx_org_proc_risk_asg_org on organization_process_risk_assignment(organization_id);
create index if not exists idx_org_proc_risk_asg_process on organization_process_risk_assignment(process_node_id);
create index if not exists idx_org_proc_risk_asg_risk on organization_process_risk_assignment(risk_node_id);
create index if not exists idx_org_proc_risk_asg_active on organization_process_risk_assignment(active);
