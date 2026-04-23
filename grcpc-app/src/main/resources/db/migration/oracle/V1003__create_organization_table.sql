create table organization (
    id varchar2(36 char) primary key,
    code varchar2(50 char) not null,
    name varchar2(255 char) not null,
    parent_id varchar2(36 char),
    type varchar2(50 char) not null,
    status varchar2(50 char) not null,
    location varchar2(255 char),
    description varchar2(2000 char),
    valid_from date,
    valid_to date,
    created_at timestamp with time zone default systimestamp not null,
    updated_at timestamp with time zone default systimestamp not null,
    constraint uk_organization_code unique (code),
    constraint fk_organization_parent foreign key (parent_id) references organization(id),
    constraint chk_organization_status check (status in ('ACTIVE', 'INACTIVE')),
    constraint chk_organization_type check (type in ('HOLDING', 'COMPANY', 'MANAGEMENT', 'DEPARTMENT', 'BRANCH', 'UNIT', 'COMMITTEE', 'GROUP', 'OTHER')),
    constraint chk_organization_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index idx_organization_parent_id on organization(parent_id);
create index idx_organization_status on organization(status);
create index idx_organization_type on organization(type);
create index idx_organization_name on organization(name);
