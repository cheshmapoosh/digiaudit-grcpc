create table organization_reference_assignment (
    id varchar2(36 char) primary key,
    organization_id varchar2(36 char) not null,
    reference_type varchar2(50 char) not null,
    reference_id varchar2(36 char) not null,
    assignment_type varchar2(50 char) default 'scope' not null,
    valid_from date,
    valid_to date,
    active number(1) default 1 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_org_ref_asg_org foreign key (organization_id) references organization(id),
    constraint uk_org_ref_assignment unique (organization_id, reference_type, reference_id),
    constraint chk_org_ref_asg_type check (reference_type in ('CONTROL', 'REGULATION', 'POLICY', 'OBJECTIVE')),
    constraint chk_org_ref_asg_assignment check (assignment_type in ('scope', 'owner', 'participant')),
    constraint chk_org_ref_asg_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index idx_org_ref_asg_org on organization_reference_assignment(organization_id);
create index idx_org_ref_asg_type on organization_reference_assignment(reference_type);
create index idx_org_ref_asg_ref on organization_reference_assignment(reference_id);
create index idx_org_ref_asg_active on organization_reference_assignment(active);
