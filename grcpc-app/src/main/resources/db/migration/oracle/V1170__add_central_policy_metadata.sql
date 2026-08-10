alter table central_policy add (
    responsible_organization varchar2(255 char),
    communication_method varchar2(32 byte),
    communication_timing varchar2(255 char),
    next_review_date date,
    objective clob
);

alter table central_policy add constraint ck_central_policy_comm_method
    check (communication_method in ('ANNOUNCEMENT', 'QUESTIONNAIRE', 'SURVEY'));
