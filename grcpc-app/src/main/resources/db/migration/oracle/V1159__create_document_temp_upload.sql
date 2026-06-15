create table document_temp_upload (
    id varchar2(36 char) primary key,
    temp_session_id varchar2(36 char) not null,
    target_type varchar2(100 char) not null,
    target_id varchar2(36 char),
    bucket_name varchar2(255 char) not null,
    object_key varchar2(1000 char) not null,
    original_file_name varchar2(500 char) not null,
    title varchar2(500 char) not null,
    content_type varchar2(255 char),
    size_bytes number(19),
    checksum_sha256 varchar2(64 char),
    version_id varchar2(255 char),
    uploaded_by varchar2(36 char),
    uploaded_at timestamp not null,
    expires_at timestamp not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19) default 0 not null,
    constraint uk_doc_temp_upload_object unique (bucket_name, object_key)
);

create index idx_doc_temp_upload_session on document_temp_upload(temp_session_id);
create index idx_doc_temp_upload_target on document_temp_upload(target_type, target_id);
create index idx_doc_temp_upload_expires on document_temp_upload(expires_at);
create index idx_doc_temp_upload_by on document_temp_upload(uploaded_by);

insert into document_temp_upload (
    id,
    temp_session_id,
    target_type,
    target_id,
    bucket_name,
    object_key,
    original_file_name,
    title,
    content_type,
    size_bytes,
    checksum_sha256,
    version_id,
    uploaded_by,
    uploaded_at,
    expires_at,
    created_at,
    updated_at,
    created_by,
    updated_by,
    version
)
select
    id,
    temp_session_id,
    target_type,
    case when target_id = temp_session_id then null else target_id end,
    bucket_name,
    object_key,
    original_file_name,
    nvl(title, original_file_name),
    content_type,
    size_bytes,
    checksum_sha256,
    version_id,
    uploaded_by,
    uploaded_at,
    nvl(expires_at, uploaded_at + interval '1' day),
    created_at,
    updated_at,
    created_by,
    updated_by,
    version
from document_attachment
where status = 'TEMP'
  and temp_session_id is not null;

delete from document_attachment
where status = 'TEMP';

alter table document_attachment drop constraint chk_document_attachment_status;
alter table document_attachment add constraint chk_document_attachment_status
    check (status in ('ACTIVE', 'DELETED', 'QUARANTINED'));
