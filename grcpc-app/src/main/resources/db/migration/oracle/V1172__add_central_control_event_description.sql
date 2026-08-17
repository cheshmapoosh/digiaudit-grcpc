alter table central_control add (
    event_description varchar2(1000 char)
);

alter table central_control add constraint ck_central_control_event_desc
    check (event_description is null or trigger_type = 'EVENT');
