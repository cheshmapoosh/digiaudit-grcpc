alter table central_policy add (
    policy_type varchar2(32 byte) default 'POLICY' not null
);

alter table central_policy add constraint ck_central_policy_type
    check (policy_type in ('POLICY', 'PROCEDURE', 'ANNOUNCEMENT', 'WORK_INSTRUCTION'));
