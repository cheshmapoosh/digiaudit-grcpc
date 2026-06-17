create table objective_organization_assignment (
    id varchar2(36 char) primary key,
    objective_node_id varchar2(36 char) not null,
    organization_id varchar2(36 char) not null,
    active number(1) default 1 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_obj_org_asg_objective foreign key (objective_node_id) references objective_node(id),
    constraint fk_obj_org_asg_org foreign key (organization_id) references organization(id),
    constraint uk_objective_org_assignment unique (objective_node_id, organization_id)
);

create index idx_obj_org_asg_objective on objective_organization_assignment(objective_node_id);
create index idx_obj_org_asg_org on objective_organization_assignment(organization_id);
create index idx_obj_org_asg_active on objective_organization_assignment(active);
