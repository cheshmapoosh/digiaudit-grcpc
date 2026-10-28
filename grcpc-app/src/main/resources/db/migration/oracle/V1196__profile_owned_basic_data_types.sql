-- Profile-owned controlled dictionaries. Existing Organization enum values retain their meaning.
create table basic_organization_type (
    id raw(16) primary key,
    profile_id raw(16) not null,
    name varchar2(255 char) not null,
    description varchar2(2000 char),
    legacy_code varchar2(32 byte),
    status varchar2(32 byte) default 'ACTIVE' not null,
    version number(19,0) default 0 not null,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    deleted_at timestamp,
    deleted_by varchar2(36 char),
    constraint fk_basic_organization_type_profile foreign key (profile_id) references dataset_profile(id),
    constraint uk_basic_organization_type_profile_id unique (profile_id, id),
    constraint ck_basic_organization_type_status check (status in ('ACTIVE','INACTIVE','DELETED')),
    constraint ck_basic_organization_type_deleted check ((status = 'DELETED' and deleted_at is not null and deleted_by is not null) or (status <> 'DELETED' and deleted_at is null and deleted_by is null))
);
create unique index ux_basic_organization_type_name on basic_organization_type(profile_id, lower(name));

create table basic_document_type (
    id raw(16) primary key,
    profile_id raw(16) not null,
    name varchar2(255 char) not null,
    description varchar2(2000 char),
    status varchar2(32 byte) default 'ACTIVE' not null,
    version number(19,0) default 0 not null,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    deleted_at timestamp,
    deleted_by varchar2(36 char),
    constraint fk_basic_document_type_profile foreign key (profile_id) references dataset_profile(id),
    constraint uk_basic_document_type_profile_id unique (profile_id, id),
    constraint ck_basic_document_type_status check (status in ('ACTIVE','INACTIVE','DELETED')),
    constraint ck_basic_document_type_deleted check ((status = 'DELETED' and deleted_at is not null and deleted_by is not null) or (status <> 'DELETED' and deleted_at is null and deleted_by is null))
);
create unique index ux_basic_document_type_name on basic_document_type(profile_id, lower(name));

create unique index ux_basic_org_type_legacy on basic_organization_type(profile_id, legacy_code);
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'HOLDING', 'HOLDING', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'COMPANY', 'COMPANY', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'DEPUTY', 'DEPUTY', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'OFFICE', 'OFFICE', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'MANAGEMENT', 'MANAGEMENT', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'DEPARTMENT', 'DEPARTMENT', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'BRANCH', 'BRANCH', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'UNIT', 'UNIT', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'COMMITTEE', 'COMMITTEE', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'GROUP', 'GROUP', 'ACTIVE' from dataset_profile;
insert into basic_organization_type (id, profile_id, name, legacy_code, status)
select sys_guid(), id, 'OTHER', 'OTHER', 'ACTIVE' from dataset_profile;

alter table organization add (organization_type_id raw(16));
update organization o set organization_type_id = (select t.id from basic_organization_type t where t.profile_id = o.profile_id and t.legacy_code = o.organization_type);
alter table organization modify (organization_type_id not null);
alter table organization add constraint fk_org_basic_type foreign key (profile_id, organization_type_id) references basic_organization_type(profile_id, id);
create index ix_org_basic_type on organization(profile_id, organization_type_id);

-- Existing unclassified Documents remain readable; new attachments require a controlled type.
alter table document add (document_type_id raw(16));
alter table document add constraint fk_document_basic_type foreign key (profile_id, document_type_id) references basic_document_type(profile_id, id);
create index ix_document_basic_type on document(profile_id, document_type_id);
