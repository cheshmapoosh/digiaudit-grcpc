create table process_regulation_assignment (
    id varchar2(36 char) primary key,
    process_node_id varchar2(36 char) not null,
    regulation_node_id varchar2(36 char) not null,
    active number(1) default 1 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_proc_reg_asg_process foreign key (process_node_id) references process_node(id),
    constraint fk_proc_reg_asg_regulation foreign key (regulation_node_id) references regulation(id),
    constraint uk_process_regulation_assignment unique (process_node_id, regulation_node_id)
);

create index idx_proc_reg_asg_process on process_regulation_assignment(process_node_id);
create index idx_proc_reg_asg_regulation on process_regulation_assignment(regulation_node_id);
create index idx_proc_reg_asg_active on process_regulation_assignment(active);
