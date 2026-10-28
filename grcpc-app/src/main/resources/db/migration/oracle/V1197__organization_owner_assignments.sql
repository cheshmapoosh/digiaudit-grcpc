-- Typed, profile-owned, many-to-many Organization ownership. Shared root/admin identities use global user FK.
create table organization_owner_assignment (
    id raw(16) constraint pk_org_owner_assignment primary key,
    profile_id raw(16) not null,
    organization_id raw(16) not null,
    user_id varchar2(36 char) not null,
    status varchar2(32 byte) default 'ACTIVE' not null,
    version number(19,0) default 0 not null,
    created_at timestamp(6) with time zone default systimestamp not null,
    updated_at timestamp(6) with time zone default systimestamp not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    constraint fk_org_owner_profile foreign key (profile_id) references dataset_profile(id),
    constraint fk_org_owner_organization foreign key (profile_id, organization_id) references organization(profile_id, id),
    constraint fk_org_owner_user foreign key (user_id) references app_user(id),
    constraint uk_org_owner_pair unique (profile_id, organization_id, user_id),
    constraint ck_org_owner_status check (status in ('ACTIVE','DELETED')),
    constraint ck_org_owner_deleted check ((status = 'DELETED' and deleted_at is not null and deleted_by is not null) or (status = 'ACTIVE' and deleted_at is null and deleted_by is null))
);
create index ix_org_owner_user on organization_owner_assignment(user_id, profile_id, status);

-- Preserve existing owners without granting a role or fabricating additional owners.
insert into organization_owner_assignment (id, profile_id, organization_id, user_id, status, version, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by)
select sys_guid(), profile_id, id, owner_user_id,
    case when status = 'DELETED' then 'DELETED' else 'ACTIVE' end, 0, systimestamp, systimestamp,
    updated_by, updated_by, case when status = 'DELETED' then deleted_at end, case when status = 'DELETED' then deleted_by end
from organization where owner_user_id is not null;
alter table organization drop constraint fk_organization_profile_owner;
drop index ix_organization_profile_owner;
alter table organization drop column owner_user_id;

alter table masterdata_revision_content drop constraint ck_masterdata_revision_content_entity;
alter table masterdata_revision_content add constraint ck_masterdata_revision_content_entity check (entity_type in (
    'ORGANIZATION_OWNER_ASG',
    'ORG',
    'OBJECTIVE',
    'ORGANIZATION_OBJECTIVE',
    'CONTROL_GROUP',
    'GLOBAL_CONTROL',
    'GLOBAL_CONTROL_REGULATION',
    'CENTRAL_PROCESS',
    'CENTRAL_SUBPROCESS',
    'CENTRAL_CONTROL',
    'CENTRAL_CONTROL_GROUP',
    'CENTRAL_CONTROL_OBJECTIVE_DEF',
    'CENTRAL_RISK_CATEGORY',
    'CENTRAL_RISK_TEMPLATE',
    'CENTRAL_ACCOUNT_GROUP',
    'CENTRAL_REGULATION_GROUP',
    'CENTRAL_REGULATION',
    'CENTRAL_REQUIREMENT',
    'CENTRAL_POLICY_GROUP',
    'CENTRAL_POLICY',
    'CENTRAL_POLICY_VERSION',
    'CENTRAL_CONTROL_SCOPE',
    'CENTRAL_RISK_SCOPE',
    'CENTRAL_OBJECTIVE_SCOPE',
    'CENTRAL_REQUIREMENT_SCOPE',
    'CENTRAL_POLICY_SUBPROCESS',
    'CENTRAL_POLICY_ORG',
    'CENTRAL_POLICY_CONTROL',
    'CENTRAL_POLICY_REQUIREMENT',
    'CENTRAL_RISK_CONTROL_ASG',
    'CENTRAL_RISK_OBJECTIVE_ASG',
    'CENTRAL_CONTROL_OBJECTIVE_ASG',
    'CENTRAL_REQUIREMENT_CONTROL_ASG',
    'CENTRAL_CONTROL_ACCOUNT_GROUP',
    'CENTRAL_OBJECTIVE_ACCOUNT_GROUP',
    'CENTRAL_RISK_CONTROL_COV',
    'CENTRAL_RISK_OBJECTIVE_COV',
    'CENTRAL_CONTROL_OBJECTIVE_COV',
    'CENTRAL_REQUIREMENT_CONTROL_COV',
    'LOCAL_CONTEXT',
    'LOCAL_CONTROL_SCOPE',
    'LOCAL_RISK_SCOPE',
    'LOCAL_OBJECTIVE_SCOPE',
    'LOCAL_REQUIREMENT_SCOPE',
    'LOCAL_RISK_CONTROL_COV',
    'LOCAL_RISK_OBJECTIVE_COV',
    'LOCAL_CONTROL_OBJECTIVE_COV',
    'LOCAL_REQUIREMENT_CONTROL_COV',
    'LOCAL_POLICY_ORG',
    'LOCAL_POLICY_SUBPROCESS',
    'LOCAL_POLICY_CONTROL',
    'LOCAL_POLICY_REQUIREMENT',
    'DOCUMENT',
    'DOCUMENT_VERSION',
    'DOCUMENT_LINK'
));
