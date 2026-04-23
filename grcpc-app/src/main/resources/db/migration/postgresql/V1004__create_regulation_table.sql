create table if not exists regulation (
    id uuid primary key,
    code varchar(50) not null,
    title varchar(255) not null,
    parent_id uuid null,
    node_type varchar(50) not null,
    status varchar(50) not null,
    description varchar(2000) null,
    effective_from date null,
    effective_to date null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint uk_regulation_code unique (code),
    constraint fk_regulation_parent
        foreign key (parent_id)
        references regulation (id)
        on delete restrict,
    constraint chk_regulation_node_type
        check (node_type in ('GROUP', 'LAW', 'REQUIREMENT')),
    constraint chk_regulation_status
        check (status in ('ACTIVE', 'INACTIVE')),
    constraint chk_regulation_valid_range
        check (effective_to is null or effective_from is null or effective_to >= effective_from)
);

create index if not exists idx_regulation_parent_id on regulation (parent_id);
create index if not exists idx_regulation_node_type on regulation (node_type);
create index if not exists idx_regulation_status on regulation (status);
create index if not exists idx_regulation_title on regulation (title);
