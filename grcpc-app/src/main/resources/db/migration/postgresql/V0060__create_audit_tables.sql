create table audit_log (
    id uuid primary key,
    event_type varchar(100) not null,
    actor_user_id uuid,
    target_type varchar(100) not null,
    target_id varchar(100),
    action_result varchar(50) not null,
    event_time timestamp not null,
    ip_address varchar(100),
    user_agent varchar(500),
    details_json jsonb not null,
    constraint fk_audit_log_actor_user foreign key (actor_user_id) references app_user(id)
);
