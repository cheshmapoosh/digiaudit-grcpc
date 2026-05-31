create table process_objective_assignment (
    id varchar2(36 char) primary key,
    process_node_id varchar2(36 char) not null,
    objective_node_id varchar2(36 char) not null,
    assignment_type varchar2(50 char) default 'scope' not null,
    valid_from date,
    valid_to date,
    active number(1) default 1 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_proc_obj_asg_process foreign key (process_node_id) references process_node(id),
    constraint fk_proc_obj_asg_objective foreign key (objective_node_id) references objective_node(id),
    constraint uk_process_objective_assignment unique (process_node_id, objective_node_id),
    constraint chk_proc_obj_asg_type check (assignment_type in ('scope', 'owner', 'participant')),
    constraint chk_proc_obj_asg_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index idx_proc_obj_asg_process on process_objective_assignment(process_node_id);
create index idx_proc_obj_asg_objective on process_objective_assignment(objective_node_id);
create index idx_proc_obj_asg_active on process_objective_assignment(active);
