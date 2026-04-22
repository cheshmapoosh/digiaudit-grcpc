create table app_user (
    id uuid primary key,
    username varchar(100) not null,
    password_hash varchar(200) not null,
    first_name varchar(100) not null,
    last_name varchar(100) not null,
    mobile varchar(20),
    email varchar(200),
    enabled boolean not null default true,
    locked boolean not null default false,
    root_user boolean not null default false,
    default_org_unit_id uuid,
    last_login_at timestamp,
    created_at timestamp not null,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    version bigint not null default 0
);

create table role (
    id uuid primary key,
    code varchar(100) not null,
    system_defined boolean not null default false,
    enabled boolean not null default true,
    created_at timestamp not null,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    version bigint not null default 0
);

create table permission (
    id uuid primary key,
    code varchar(100) not null,
    module_name varchar(100) not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    version bigint not null default 0
);

create table business_permission (
    id uuid primary key,
    code varchar(100) not null,
    module_name varchar(100) not null,
    created_at timestamp not null,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    version bigint not null default 0
);
