alter table organization drop constraint if exists chk_organization_type;
alter table organization add constraint chk_organization_type
    check (type in ('HOLDING', 'COMPANY', 'DEPUTY', 'OFFICE', 'MANAGEMENT', 'DEPARTMENT', 'BRANCH', 'UNIT', 'COMMITTEE', 'GROUP', 'OTHER'));

alter table regulation add column if not exists sort_order integer null;
alter table regulation add column if not exists issuer varchar(255) null;
alter table regulation add column if not exists owner_name varchar(255) null;
alter table regulation add column if not exists documents_count integer not null default 0;

create table if not exists process_node (
    id uuid primary key,
    code varchar(50) not null,
    title varchar(255) not null,
    node_type varchar(50) not null,
    parent_id uuid null,
    status varchar(50) not null,
    sort_order integer null,
    description varchar(2000) null,
    process_category varchar(50) null,
    owner_id uuid null,
    owner_name varchar(255) null,
    documents_count integer not null default 0,
    objective varchar(2000) null,
    operation_cycle varchar(255) null,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint uk_process_node_code unique (code),
    constraint fk_process_node_parent foreign key (parent_id) references process_node(id) on delete restrict,
    constraint chk_process_node_type check (node_type in ('process', 'subProcess')),
    constraint chk_process_node_status check (status in ('active', 'inactive')),
    constraint chk_process_node_category check (process_category is null or process_category in ('operational', 'support', 'strategic', 'financial', 'compliance', 'it', 'other'))
);

create index if not exists idx_process_node_parent_id on process_node(parent_id);
create index if not exists idx_process_node_status on process_node(status);
create index if not exists idx_process_node_type on process_node(node_type);
create index if not exists idx_process_node_sort on process_node(parent_id, sort_order, title);

create table if not exists control (
    id uuid primary key,
    code varchar(50) not null,
    title varchar(255) not null,
    status varchar(50) not null,
    sort_order integer null,
    description varchar(2000) null,
    owner_id uuid null,
    owner_name varchar(255) null,
    documents_count integer not null default 0,
    control_objective_id uuid null,
    control_automation varchar(50) null,
    control_frequency varchar(255) null,
    control_classification varchar(255) null,
    control_owner varchar(255) null,
    test_direction varchar(255) null,
    test_type varchar(255) null,
    test_program varchar(2000) null,
    importance varchar(50) null,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint uk_control_code unique (code),
    constraint chk_control_status check (status in ('active', 'inactive')),
    constraint chk_control_automation check (control_automation is null or control_automation in ('manual', 'automated', 'semiAutomated')),
    constraint chk_control_importance check (importance is null or importance in ('low', 'medium', 'high', 'critical'))
);

create index if not exists idx_control_status on control(status);
create index if not exists idx_control_title on control(title);
create index if not exists idx_control_objective_id on control(control_objective_id);

create table if not exists process_control_assignment (
    id uuid primary key,
    process_node_id uuid not null,
    control_id uuid not null,
    assignment_type varchar(50) not null default 'scope',
    valid_from date null,
    valid_to date null,
    active boolean not null default true,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint fk_process_control_assignment_process foreign key (process_node_id) references process_node(id) on delete restrict,
    constraint fk_process_control_assignment_control foreign key (control_id) references control(id) on delete cascade,
    constraint uk_process_control_assignment unique (process_node_id, control_id),
    constraint chk_process_control_assignment_type check (assignment_type in ('scope', 'owner', 'participant')),
    constraint chk_process_control_assignment_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index if not exists idx_process_control_assignment_process on process_control_assignment(process_node_id);
create index if not exists idx_process_control_assignment_control on process_control_assignment(control_id);
create index if not exists idx_process_control_assignment_active on process_control_assignment(active);

create table if not exists risk_node (
    id uuid primary key,
    code varchar(50) not null,
    title varchar(255) not null,
    node_type varchar(50) not null,
    parent_id uuid null,
    status varchar(50) not null,
    sort_order integer null,
    description varchar(2000) null,
    valid_from date null,
    valid_to date null,
    allow_reference boolean null,
    analysis_profile varchar(255) null,
    owner_id uuid null,
    owner_name varchar(255) null,
    documents_count integer not null default 0,
    company_operation varchar(255) null,
    risk_type varchar(50) null,
    causes varchar(2000) null,
    effects_json jsonb null,
    existing_risks_count integer not null default 0,
    response_patterns_count integer not null default 0,
    control_centers_count integer not null default 0,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint uk_risk_node_code unique (code),
    constraint fk_risk_node_parent foreign key (parent_id) references risk_node(id) on delete restrict,
    constraint chk_risk_node_type check (node_type in ('riskCategory', 'riskTemplate')),
    constraint chk_risk_node_status check (status in ('active', 'inactive')),
    constraint chk_risk_node_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from),
    constraint chk_risk_node_risk_type check (risk_type is null or risk_type in ('operational', 'financial', 'strategic', 'compliance', 'technology', 'reputation', 'safety', 'other'))
);

create index if not exists idx_risk_node_parent_id on risk_node(parent_id);
create index if not exists idx_risk_node_status on risk_node(status);
create index if not exists idx_risk_node_type on risk_node(node_type);
create index if not exists idx_risk_node_sort on risk_node(parent_id, sort_order, title);

create table if not exists objective_node (
    id uuid primary key,
    code varchar(50) not null,
    title varchar(255) not null,
    node_type varchar(50) not null,
    parent_id uuid null,
    status varchar(50) not null,
    sort_order integer null,
    description varchar(2000) null,
    strategy varchar(2000) null,
    objective_type varchar(50) null,
    objective_class varchar(255) null,
    organization_unit_id uuid null,
    organization_unit_name varchar(255) null,
    effective_from date null,
    valid_until date null,
    documents_count integer not null default 0,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint uk_objective_node_code unique (code),
    constraint fk_objective_node_parent foreign key (parent_id) references objective_node(id) on delete restrict,
    constraint chk_objective_node_type check (node_type in ('objective')),
    constraint chk_objective_node_status check (status in ('active', 'inactive')),
    constraint chk_objective_node_valid_range check (valid_until is null or effective_from is null or valid_until >= effective_from),
    constraint chk_objective_node_objective_type check (objective_type is null or objective_type in ('operational', 'compliance', 'strategic', 'financial', 'reporting', 'market'))
);

create index if not exists idx_objective_node_parent_id on objective_node(parent_id);
create index if not exists idx_objective_node_status on objective_node(status);
create index if not exists idx_objective_node_sort on objective_node(parent_id, sort_order, title);

alter table control drop constraint if exists fk_control_objective;
alter table control add constraint fk_control_objective foreign key (control_objective_id) references objective_node(id) on delete set null;

create table if not exists policy_node (
    id uuid primary key,
    code varchar(50) not null,
    title varchar(255) not null,
    node_type varchar(50) not null,
    parent_id uuid null,
    status varchar(50) not null,
    sort_order integer null,
    description varchar(2000) null,
    policy_category varchar(50) null,
    policy_kind varchar(50) null,
    owner_id uuid null,
    owner_name varchar(255) null,
    owner_organization varchar(255) null,
    creator_name varchar(255) null,
    documents_count integer not null default 0,
    policy_version varchar(255) null,
    valid_from date null,
    valid_to date null,
    next_review_date date null,
    communication_method varchar(50) null,
    communication_language varchar(255) null,
    objective varchar(2000) null,
    note varchar(2000) null,
    evaluation_confirmed boolean null,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint uk_policy_node_code unique (code),
    constraint fk_policy_node_parent foreign key (parent_id) references policy_node(id) on delete restrict,
    constraint chk_policy_node_type check (node_type in ('policyGroup', 'policy')),
    constraint chk_policy_node_status check (status in ('draft', 'underReview', 'pendingApproval', 'approved', 'inactive')),
    constraint chk_policy_node_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from),
    constraint chk_policy_node_category check (policy_category is null or policy_category in ('hr', 'accounting', 'purchase', 'it', 'finance', 'compliance', 'other')),
    constraint chk_policy_node_kind check (policy_kind is null or policy_kind in ('policy', 'procedure', 'announcement', 'workInstruction')),
    constraint chk_policy_node_comm_method check (communication_method is null or communication_method in ('announcement', 'questionnaire', 'survey'))
);

create index if not exists idx_policy_node_parent_id on policy_node(parent_id);
create index if not exists idx_policy_node_status on policy_node(status);
create index if not exists idx_policy_node_sort on policy_node(parent_id, sort_order, title);

create table if not exists account_group (
    id uuid primary key,
    code varchar(50) not null,
    title varchar(255) not null,
    parent_id uuid null,
    status varchar(50) not null,
    sort_order integer null,
    description varchar(2000) null,
    importance varchar(50) null,
    reasonable_assurance boolean null,
    effective_date date null,
    documents_count integer not null default 0,
    assertion_existence boolean null,
    assertion_completeness boolean null,
    assertion_valuation boolean null,
    assertion_disclosure boolean null,
    objectives_json jsonb null,
    account_ranges_json jsonb null,
    risks_json jsonb null,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint uk_account_group_code unique (code),
    constraint fk_account_group_parent foreign key (parent_id) references account_group(id) on delete restrict,
    constraint chk_account_group_status check (status in ('active', 'inactive')),
    constraint chk_account_group_importance check (importance is null or importance in ('low', 'medium', 'high', 'critical'))
);

create index if not exists idx_account_group_parent_id on account_group(parent_id);
create index if not exists idx_account_group_status on account_group(status);
create index if not exists idx_account_group_sort on account_group(parent_id, sort_order, title);

create table if not exists organization_process_assignment (
    id uuid primary key,
    organization_id uuid not null,
    process_node_id uuid not null,
    assignment_type varchar(50) not null default 'scope',
    valid_from date null,
    valid_to date null,
    active boolean not null default true,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint fk_org_process_assignment_org foreign key (organization_id) references organization(id) on delete restrict,
    constraint fk_org_process_assignment_process foreign key (process_node_id) references process_node(id) on delete restrict,
    constraint uk_org_process_assignment unique (organization_id, process_node_id),
    constraint chk_org_process_assignment_type check (assignment_type in ('scope', 'owner', 'participant')),
    constraint chk_org_process_assignment_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index if not exists idx_org_process_assignment_org on organization_process_assignment(organization_id);
create index if not exists idx_org_process_assignment_process on organization_process_assignment(process_node_id);
create index if not exists idx_org_process_assignment_active on organization_process_assignment(active);

create table if not exists resource_acl_entry (
    id uuid primary key,
    target_type varchar(100) not null,
    target_id uuid not null,
    subject_type varchar(50) not null,
    subject_id uuid not null,
    permission_code varchar(100) not null,
    effect varchar(50) not null,
    valid_from timestamp null,
    valid_to timestamp null,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint chk_resource_acl_subject_type check (subject_type in ('USER', 'ROLE')),
    constraint chk_resource_acl_effect check (effect in ('ALLOW', 'DENY')),
    constraint chk_resource_acl_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create unique index if not exists uk_resource_acl_entry
    on resource_acl_entry(target_type, target_id, subject_type, subject_id, permission_code);
create index if not exists idx_resource_acl_target on resource_acl_entry(target_type, target_id);
create index if not exists idx_resource_acl_subject on resource_acl_entry(subject_type, subject_id);
create index if not exists idx_resource_acl_permission on resource_acl_entry(permission_code);

create table if not exists document_attachment (
    id uuid primary key,
    target_type varchar(100) not null,
    target_id uuid not null,
    bucket_name varchar(255) not null,
    object_key varchar(1000) not null,
    original_file_name varchar(500) not null,
    content_type varchar(255) null,
    size_bytes bigint null,
    checksum_sha256 varchar(64) null,
    version_id varchar(255) null,
    status varchar(50) not null,
    uploaded_by uuid null,
    uploaded_at timestamp not null,
    created_at timestamp not null,
    updated_at timestamp null,
    created_by uuid null,
    updated_by uuid null,
    version bigint not null default 0,
    constraint uk_document_attachment_object unique (bucket_name, object_key),
    constraint chk_document_attachment_status check (status in ('ACTIVE', 'DELETED', 'QUARANTINED'))
);

create index if not exists idx_document_attachment_target on document_attachment(target_type, target_id);
create index if not exists idx_document_attachment_status on document_attachment(status);
create index if not exists idx_document_attachment_uploaded_by on document_attachment(uploaded_by);
