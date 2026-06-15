alter table control add (
    name varchar2(255 char),
    control_class varchar2(255 char),
    control_nature varchar2(50 char),
    automation_type varchar2(50 char),
    objective varchar2(2000 char)
);

update control
set
    name = title,
    control_class = control_classification,
    automation_type = case control_automation
        when 'automated' then 'system'
        when 'semiAutomated' then 'semiManualSystem'
        else control_automation
    end
where name is null;

alter table control modify (name not null);
alter table control modify (title null);

alter table control add constraint chk_control_nature
    check (control_nature is null or control_nature in ('preventive', 'detective'));

alter table control add constraint chk_control_automation_type
    check (automation_type is null or automation_type in ('manual', 'system', 'semiManualSystem'));

create index idx_control_name on control(name);

create table control_assignment (
    id varchar2(36 char) primary key,
    control_id varchar2(36 char) not null,
    sub_process_id varchar2(36 char) not null,
    owner_id varchar2(36 char),
    owner_name varchar2(255 char),
    valid_from date,
    valid_to date,
    sort_order number(10),
    operation_period varchar2(255 char),
    test_method varchar2(255 char),
    test_plan varchar2(2000 char),
    assignment_status varchar2(50 char) not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_control_assignment_control foreign key (control_id) references control(id) on delete cascade,
    constraint fk_control_assignment_sub_process foreign key (sub_process_id) references process_node(id),
    constraint chk_control_assignment_status check (assignment_status in ('active', 'inactive')),
    constraint chk_control_assignment_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

insert into control_assignment (
    id,
    control_id,
    sub_process_id,
    valid_from,
    valid_to,
    assignment_status,
    created_at,
    updated_at,
    created_by,
    updated_by,
    version
)
select
    id,
    control_id,
    process_node_id,
    valid_from,
    valid_to,
    case when active = 1 then 'active' else 'inactive' end,
    created_at,
    updated_at,
    created_by,
    updated_by,
    version
from process_control_assignment;

create index idx_control_assignment_control on control_assignment(control_id);
create index idx_control_assignment_sub_process on control_assignment(sub_process_id);
create index idx_control_assignment_status on control_assignment(assignment_status);

create unique index uk_control_assignment_active on control_assignment (
    case when assignment_status = 'active' then control_id end,
    case when assignment_status = 'active' then sub_process_id end
);
