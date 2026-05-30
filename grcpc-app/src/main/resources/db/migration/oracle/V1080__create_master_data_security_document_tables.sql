alter table organization drop constraint chk_organization_type;
alter table organization add constraint chk_organization_type
    check (type in ('HOLDING', 'COMPANY', 'DEPUTY', 'OFFICE', 'MANAGEMENT', 'DEPARTMENT', 'BRANCH', 'UNIT', 'COMMITTEE', 'GROUP', 'OTHER'));

alter table regulation add (
    sort_order number(10),
    issuer varchar2(255 char),
    owner_name varchar2(255 char),
    documents_count number(10) default 0 not null
);

create table process_node (
    id varchar2(36 char) primary key,
    code varchar2(50 char) not null,
    title varchar2(255 char) not null,
    node_type varchar2(50 char) not null,
    parent_id varchar2(36 char),
    status varchar2(50 char) not null,
    sort_order number(10),
    description varchar2(2000 char),
    process_category varchar2(50 char),
    owner_id varchar2(36 char),
    owner_name varchar2(255 char),
    documents_count number(10) default 0 not null,
    objective varchar2(2000 char),
    operation_cycle varchar2(255 char),
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint uk_process_node_code unique (code),
    constraint fk_process_node_parent foreign key (parent_id) references process_node(id),
    constraint chk_process_node_type check (node_type in ('process', 'subProcess')),
    constraint chk_process_node_status check (status in ('active', 'inactive')),
    constraint chk_process_node_category check (process_category is null or process_category in ('operational', 'support', 'strategic', 'financial', 'compliance', 'it', 'other'))
);

create index idx_process_node_parent_id on process_node(parent_id);
create index idx_process_node_status on process_node(status);
create index idx_process_node_type on process_node(node_type);
create index idx_process_node_sort on process_node(parent_id, sort_order, title);

create table control (
    id varchar2(36 char) primary key,
    code varchar2(50 char) not null,
    title varchar2(255 char) not null,
    status varchar2(50 char) not null,
    sort_order number(10),
    description varchar2(2000 char),
    owner_id varchar2(36 char),
    owner_name varchar2(255 char),
    documents_count number(10) default 0 not null,
    control_objective_id varchar2(36 char),
    control_automation varchar2(50 char),
    control_frequency varchar2(255 char),
    control_classification varchar2(255 char),
    control_owner varchar2(255 char),
    test_direction varchar2(255 char),
    test_type varchar2(255 char),
    test_program varchar2(2000 char),
    importance varchar2(50 char),
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint uk_control_code unique (code),
    constraint chk_control_status check (status in ('active', 'inactive')),
    constraint chk_control_automation check (control_automation is null or control_automation in ('manual', 'automated', 'semiAutomated')),
    constraint chk_control_importance check (importance is null or importance in ('low', 'medium', 'high', 'critical'))
);

create index idx_control_status on control(status);
create index idx_control_title on control(title);
create index idx_control_objective_id on control(control_objective_id);

create table process_control_assignment (
    id varchar2(36 char) primary key,
    process_node_id varchar2(36 char) not null,
    control_id varchar2(36 char) not null,
    assignment_type varchar2(50 char) default 'scope' not null,
    valid_from date,
    valid_to date,
    active number(1) default 1 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_proc_ctrl_asg_process foreign key (process_node_id) references process_node(id),
    constraint fk_proc_ctrl_asg_control foreign key (control_id) references control(id) on delete cascade,
    constraint uk_process_control_assignment unique (process_node_id, control_id),
    constraint chk_proc_ctrl_asg_type check (assignment_type in ('scope', 'owner', 'participant')),
    constraint chk_proc_ctrl_asg_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index idx_proc_ctrl_asg_process on process_control_assignment(process_node_id);
create index idx_proc_ctrl_asg_control on process_control_assignment(control_id);
create index idx_proc_ctrl_asg_active on process_control_assignment(active);

create table risk_node (
    id varchar2(36 char) primary key,
    code varchar2(50 char) not null,
    title varchar2(255 char) not null,
    node_type varchar2(50 char) not null,
    parent_id varchar2(36 char),
    status varchar2(50 char) not null,
    sort_order number(10),
    description varchar2(2000 char),
    valid_from date,
    valid_to date,
    allow_reference number(1),
    analysis_profile varchar2(255 char),
    owner_id varchar2(36 char),
    owner_name varchar2(255 char),
    documents_count number(10) default 0 not null,
    company_operation varchar2(255 char),
    risk_type varchar2(50 char),
    causes varchar2(2000 char),
    effects_json clob,
    existing_risks_count number(10) default 0 not null,
    response_patterns_count number(10) default 0 not null,
    control_centers_count number(10) default 0 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint uk_risk_node_code unique (code),
    constraint fk_risk_node_parent foreign key (parent_id) references risk_node(id),
    constraint chk_risk_node_type check (node_type in ('riskCategory', 'riskTemplate')),
    constraint chk_risk_node_status check (status in ('active', 'inactive')),
    constraint chk_risk_node_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from),
    constraint chk_risk_node_risk_type check (risk_type is null or risk_type in ('operational', 'financial', 'strategic', 'compliance', 'technology', 'reputation', 'safety', 'other'))
);

create index idx_risk_node_parent_id on risk_node(parent_id);
create index idx_risk_node_status on risk_node(status);
create index idx_risk_node_type on risk_node(node_type);
create index idx_risk_node_sort on risk_node(parent_id, sort_order, title);

create table objective_node (
    id varchar2(36 char) primary key,
    code varchar2(50 char) not null,
    title varchar2(255 char) not null,
    node_type varchar2(50 char) not null,
    parent_id varchar2(36 char),
    status varchar2(50 char) not null,
    sort_order number(10),
    description varchar2(2000 char),
    strategy varchar2(2000 char),
    objective_type varchar2(50 char),
    objective_class varchar2(255 char),
    organization_unit_id varchar2(36 char),
    organization_unit_name varchar2(255 char),
    effective_from date,
    valid_until date,
    documents_count number(10) default 0 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint uk_objective_node_code unique (code),
    constraint fk_objective_node_parent foreign key (parent_id) references objective_node(id),
    constraint chk_objective_node_type check (node_type in ('objective')),
    constraint chk_objective_node_status check (status in ('active', 'inactive')),
    constraint chk_objective_node_valid_range check (valid_until is null or effective_from is null or valid_until >= effective_from),
    constraint chk_objective_node_objective_type check (objective_type is null or objective_type in ('operational', 'compliance', 'strategic', 'financial', 'reporting', 'market'))
);

create index idx_objective_node_parent_id on objective_node(parent_id);
create index idx_objective_node_status on objective_node(status);
create index idx_objective_node_sort on objective_node(parent_id, sort_order, title);

alter table control add constraint fk_control_objective foreign key (control_objective_id) references objective_node(id) on delete set null;

create table policy_node (
    id varchar2(36 char) primary key,
    code varchar2(50 char) not null,
    title varchar2(255 char) not null,
    node_type varchar2(50 char) not null,
    parent_id varchar2(36 char),
    status varchar2(50 char) not null,
    sort_order number(10),
    description varchar2(2000 char),
    policy_category varchar2(50 char),
    policy_kind varchar2(50 char),
    owner_id varchar2(36 char),
    owner_name varchar2(255 char),
    owner_organization varchar2(255 char),
    creator_name varchar2(255 char),
    documents_count number(10) default 0 not null,
    policy_version varchar2(255 char),
    valid_from date,
    valid_to date,
    next_review_date date,
    communication_method varchar2(50 char),
    communication_language varchar2(255 char),
    objective varchar2(2000 char),
    note varchar2(2000 char),
    evaluation_confirmed number(1),
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint uk_policy_node_code unique (code),
    constraint fk_policy_node_parent foreign key (parent_id) references policy_node(id),
    constraint chk_policy_node_type check (node_type in ('policyGroup', 'policy')),
    constraint chk_policy_node_status check (status in ('draft', 'underReview', 'pendingApproval', 'approved', 'inactive')),
    constraint chk_policy_node_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from),
    constraint chk_policy_node_category check (policy_category is null or policy_category in ('hr', 'accounting', 'purchase', 'it', 'finance', 'compliance', 'other')),
    constraint chk_policy_node_kind check (policy_kind is null or policy_kind in ('policy', 'procedure', 'announcement', 'workInstruction')),
    constraint chk_policy_node_comm_method check (communication_method is null or communication_method in ('announcement', 'questionnaire', 'survey'))
);

create index idx_policy_node_parent_id on policy_node(parent_id);
create index idx_policy_node_status on policy_node(status);
create index idx_policy_node_sort on policy_node(parent_id, sort_order, title);

create table account_group (
    id varchar2(36 char) primary key,
    code varchar2(50 char) not null,
    title varchar2(255 char) not null,
    parent_id varchar2(36 char),
    status varchar2(50 char) not null,
    sort_order number(10),
    description varchar2(2000 char),
    importance varchar2(50 char),
    reasonable_assurance number(1),
    effective_date date,
    documents_count number(10) default 0 not null,
    assertion_existence number(1),
    assertion_completeness number(1),
    assertion_valuation number(1),
    assertion_disclosure number(1),
    objectives_json clob,
    account_ranges_json clob,
    risks_json clob,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint uk_account_group_code unique (code),
    constraint fk_account_group_parent foreign key (parent_id) references account_group(id),
    constraint chk_account_group_status check (status in ('active', 'inactive')),
    constraint chk_account_group_importance check (importance is null or importance in ('low', 'medium', 'high', 'critical'))
);

create index idx_account_group_parent_id on account_group(parent_id);
create index idx_account_group_status on account_group(status);
create index idx_account_group_sort on account_group(parent_id, sort_order, title);

create table organization_process_assignment (
    id varchar2(36 char) primary key,
    organization_id varchar2(36 char) not null,
    process_node_id varchar2(36 char) not null,
    assignment_type varchar2(50 char) default 'scope' not null,
    valid_from date,
    valid_to date,
    active number(1) default 1 not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint fk_org_proc_asg_org foreign key (organization_id) references organization(id),
    constraint fk_org_proc_asg_process foreign key (process_node_id) references process_node(id),
    constraint uk_org_process_assignment unique (organization_id, process_node_id),
    constraint chk_org_proc_asg_type check (assignment_type in ('scope', 'owner', 'participant')),
    constraint chk_org_proc_asg_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index idx_org_proc_asg_org on organization_process_assignment(organization_id);
create index idx_org_proc_asg_process on organization_process_assignment(process_node_id);
create index idx_org_proc_asg_active on organization_process_assignment(active);

create table resource_acl_entry (
    id varchar2(36 char) primary key,
    target_type varchar2(100 char) not null,
    target_id varchar2(36 char) not null,
    subject_type varchar2(50 char) not null,
    subject_id varchar2(36 char) not null,
    permission_code varchar2(100 char) not null,
    effect varchar2(50 char) not null,
    valid_from timestamp,
    valid_to timestamp,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint chk_resource_acl_subject_type check (subject_type in ('USER', 'ROLE')),
    constraint chk_resource_acl_effect check (effect in ('ALLOW', 'DENY')),
    constraint chk_resource_acl_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from),
    constraint uk_resource_acl_entry unique (target_type, target_id, subject_type, subject_id, permission_code)
);

create index idx_resource_acl_target on resource_acl_entry(target_type, target_id);
create index idx_resource_acl_subject on resource_acl_entry(subject_type, subject_id);
create index idx_resource_acl_permission on resource_acl_entry(permission_code);

create table document_attachment (
    id varchar2(36 char) primary key,
    target_type varchar2(100 char) not null,
    target_id varchar2(36 char) not null,
    bucket_name varchar2(255 char) not null,
    object_key varchar2(1000 char) not null,
    original_file_name varchar2(500 char) not null,
    content_type varchar2(255 char),
    size_bytes number(19),
    checksum_sha256 varchar2(64 char),
    version_id varchar2(255 char),
    status varchar2(50 char) not null,
    uploaded_by varchar2(36 char),
    uploaded_at timestamp not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint uk_document_attachment_object unique (bucket_name, object_key),
    constraint chk_document_attachment_status check (status in ('ACTIVE', 'DELETED', 'QUARANTINED'))
);

create index idx_document_attachment_target on document_attachment(target_type, target_id);
create index idx_document_attachment_status on document_attachment(status);
create index idx_document_attachment_uploaded_by on document_attachment(uploaded_by);
