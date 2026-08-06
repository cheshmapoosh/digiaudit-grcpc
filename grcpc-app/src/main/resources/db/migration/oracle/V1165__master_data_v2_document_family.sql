create table document (
    id raw(16) not null,
    code varchar2(64 byte),
    title varchar2(255 char) not null,
    description clob,
    document_category_code varchar2(64 byte),
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_document primary key (id),
    constraint ck_document_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_document_valid_range check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_document_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create table document_version (
    id raw(16) not null,
    document_id raw(16) not null,
    document_version_number number(19,0) not null,
    file_name varchar2(512 char) not null,
    mime_type varchar2(255 byte) not null,
    file_size number(19,0) not null,
    storage_object_key varchar2(1024 byte) not null,
    checksum_algorithm varchar2(32 byte) not null,
    checksum_value varchar2(128 byte) not null,
    status varchar2(32 byte) not null,
    valid_from date,
    valid_to date,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_document_version primary key (id),
    constraint uk_document_version_number unique (document_id, document_version_number),
    constraint uk_document_version_object_key unique (storage_object_key),
    constraint fk_document_version_document foreign key (document_id) references document(id),
    constraint ck_document_version_number check (document_version_number > 0),
    constraint ck_document_version_size check (file_size >= 0),
    constraint ck_document_version_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_document_version_valid check (valid_to is null or valid_from is null or valid_from <= valid_to),
    constraint ck_document_version_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create table document_link (
    id raw(16) not null,
    document_version_id raw(16) not null,
    target_type varchar2(32 byte) not null,
    target_id raw(16) not null,
    status varchar2(32 byte) not null,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    created_by raw(16) not null,
    updated_by raw(16) not null,
    deleted_at timestamp(6) with time zone,
    deleted_by raw(16),
    version number(19,0) default 0 not null,
    constraint pk_document_link primary key (id),
    constraint uk_document_link_target unique (document_version_id, target_type, target_id),
    constraint fk_document_link_version foreign key (document_version_id) references document_version(id),
    constraint ck_document_link_status check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
    constraint ck_document_link_target_type check (target_type in (
        'ORG',
        'CENTRAL_PROCESS',
        'CENTRAL_SUBPROCESS',
        'CENTRAL_CONTROL',
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
        'MASTERDATA_REVISION'
    )),
    constraint ck_document_link_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
    )
);

create index ix_document_link_target on document_link(target_type, target_id);

create table document_temp_upload (
    id raw(16) not null,
    original_file_name varchar2(512 char) not null,
    mime_type varchar2(255 byte) not null,
    file_size number(19,0) not null,
    storage_object_key varchar2(1024 byte) not null,
    checksum_algorithm varchar2(32 byte) not null,
    checksum_value varchar2(128 byte) not null,
    uploaded_by raw(16) not null,
    uploaded_at timestamp(6) with time zone not null,
    expires_at timestamp(6) with time zone not null,
    version number(19,0) default 0 not null,
    constraint pk_document_temp_upload primary key (id),
    constraint uk_document_temp_upload_object unique (storage_object_key),
    constraint ck_document_temp_upload_size check (file_size >= 0),
    constraint ck_document_temp_upload_expiry check (expires_at > uploaded_at),
    constraint ck_document_temp_upload_version check (version >= 0)
);
