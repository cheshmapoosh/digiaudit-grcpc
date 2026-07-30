create table document_temp_upload (
    id raw(16) not null,
    original_file_name varchar2(512 char) not null,
    mime_type varchar2(255 byte) not null,
    file_size number(19,0) not null,
    storage_object_key varchar2(1024 byte) not null,
    checksum_algorithm varchar2(32 byte) not null,
    checksum_value varchar2(128 byte) not null,
    upload_status varchar2(32 byte) not null,
    uploaded_by raw(16) not null,
    uploaded_at timestamp(6) with time zone not null,
    expires_at timestamp(6) with time zone not null,
    consumed_at timestamp(6) with time zone,
    document_version_id raw(16),
    version number(19,0) default 0 not null,
    constraint pk_document_temp_upload primary key (id),
    constraint uk_document_temp_upload_object unique (storage_object_key),
    constraint fk_document_temp_upload_version foreign key (document_version_id) references document_version(id),
    constraint ck_document_temp_upload_status check (upload_status in ('UPLOADING', 'AVAILABLE', 'CONSUMED', 'EXPIRED', 'FAILED')),
    constraint ck_document_temp_upload_size check (file_size >= 0),
    constraint ck_document_temp_upload_expiry check (expires_at > uploaded_at),
    constraint ck_document_temp_upload_consumed check (
        (upload_status = 'CONSUMED' and consumed_at is not null and document_version_id is not null)
        or (upload_status <> 'CONSUMED' and consumed_at is null and document_version_id is null)
    )
);

create index ix_document_temp_upload_version on document_temp_upload(document_version_id);
