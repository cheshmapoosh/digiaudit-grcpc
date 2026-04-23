create table app_user (
    id varchar2(36 char) primary key,
    username varchar2(100 char) not null,
    password_hash varchar2(200 char) not null,
    first_name varchar2(100 char) not null,
    last_name varchar2(100 char) not null,
    mobile varchar2(20 char),
    email varchar2(200 char),
    enabled number(1) default 1 not null,
    locked number(1) default 0 not null,
    root_user number(1) default 0 not null,
    default_org_unit_id varchar2(36 char),
    last_login_at timestamp,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19,0) default 0 not null,
    constraint ck_app_user_enabled check (enabled in (0, 1)),
    constraint ck_app_user_locked check (locked in (0, 1)),
    constraint ck_app_user_root_user check (root_user in (0, 1))
);

create table role (
    id varchar2(36 char) primary key,
    code varchar2(100 char) not null,
    system_defined number(1) default 0 not null,
    enabled number(1) default 1 not null,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19,0) default 0 not null,
    constraint ck_role_system_defined check (system_defined in (0, 1)),
    constraint ck_role_enabled check (enabled in (0, 1))
);

create table permission (
    id varchar2(36 char) primary key,
    code varchar2(100 char) not null,
    module_name varchar2(100 char) not null,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19,0) default 0 not null
);

create table business_permission (
    id varchar2(36 char) primary key,
    code varchar2(100 char) not null,
    module_name varchar2(100 char) not null,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    version number(19,0) default 0 not null
);
