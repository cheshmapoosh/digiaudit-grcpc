create table audit_log (
    id varchar2(36 char) primary key,
    event_type varchar2(100 char) not null,
    actor_user_id varchar2(36 char),
    target_type varchar2(100 char) not null,
    target_id varchar2(100 char),
    action_result varchar2(50 char) not null,
    event_time timestamp not null,
    ip_address varchar2(100 char),
    user_agent varchar2(500 char),
    details_json clob not null,
    constraint fk_audit_log_actor_user foreign key (actor_user_id) references app_user(id)
);
