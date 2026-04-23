create table if not exists organization (
    id uuid primary key,
    code varchar(50) not null,
    name varchar(255) not null,
    parent_id uuid null,
    type varchar(50) not null,
    status varchar(50) not null,
    location varchar(255) null,
    description varchar(2000) null,
    valid_from date null,
    valid_to date null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint uk_organization_code unique (code),
    constraint fk_organization_parent
        foreign key (parent_id)
        references organization (id)
        on delete restrict,
    constraint chk_organization_status
        check (status in ('ACTIVE', 'INACTIVE')),
    constraint chk_organization_type
        check (type in ('HOLDING', 'COMPANY', 'MANAGEMENT', 'DEPARTMENT', 'BRANCH', 'UNIT', 'COMMITTEE', 'GROUP', 'OTHER')),
    constraint chk_organization_valid_range
        check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index if not exists idx_organization_parent_id on organization (parent_id);
create index if not exists idx_organization_status on organization (status);
create index if not exists idx_organization_type on organization (type);
create index if not exists idx_organization_name on organization (name);
