alter table document_attachment add temp_session_id varchar2(36 char);
alter table document_attachment add expires_at timestamp;
alter table document_attachment add committed_at timestamp;

alter table document_attachment drop constraint chk_document_attachment_status;
alter table document_attachment add constraint chk_document_attachment_status
    check (status in ('ACTIVE', 'TEMP', 'DELETED', 'QUARANTINED'));

create index idx_document_attachment_temp_session on document_attachment(temp_session_id);
create index idx_document_attachment_expires_at on document_attachment(expires_at);
