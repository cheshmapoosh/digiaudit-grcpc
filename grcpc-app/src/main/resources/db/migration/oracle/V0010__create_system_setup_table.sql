create table system_setup (
    id varchar2(36 char) primary key,
    initialized number(1) default 0 not null,
    initialized_at timestamp,
    initialized_by_user_id varchar2(36 char),
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19,0) default 0 not null,
    constraint ck_system_setup_initialized check (initialized in (0, 1))
);
