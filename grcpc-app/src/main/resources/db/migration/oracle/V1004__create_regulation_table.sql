create table regulation (
    id varchar2(36 char) primary key,
    code varchar2(50 char) not null,
    title varchar2(255 char) not null,
    parent_id varchar2(36 char),
    node_type varchar2(50 char) not null,
    status varchar2(50 char) not null,
    description varchar2(2000 char),
    effective_from date,
    effective_to date,
    created_at timestamp with time zone default systimestamp not null,
    updated_at timestamp with time zone default systimestamp not null,
    constraint uk_regulation_code unique (code),
    constraint fk_regulation_parent foreign key (parent_id) references regulation(id),
    constraint chk_regulation_node_type check (node_type in ('GROUP', 'LAW', 'REQUIREMENT')),
    constraint chk_regulation_status check (status in ('ACTIVE', 'INACTIVE')),
    constraint chk_regulation_valid_range check (effective_to is null or effective_from is null or effective_to >= effective_from)
);

create index idx_regulation_parent_id on regulation(parent_id);
create index idx_regulation_node_type on regulation(node_type);
create index idx_regulation_status on regulation(status);
create index idx_regulation_title on regulation(title);
