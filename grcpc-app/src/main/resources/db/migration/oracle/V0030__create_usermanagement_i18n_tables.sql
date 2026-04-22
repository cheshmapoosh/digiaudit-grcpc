create table role_i18n (
    id varchar2(36 char) primary key,
    role_id varchar2(36 char) not null,
    locale varchar2(10 char) not null,
    title varchar2(200 char) not null,
    description varchar2(1000 char),
    constraint fk_role_i18n_role foreign key (role_id) references role(id)
);

create table permission_i18n (
    id varchar2(36 char) primary key,
    permission_id varchar2(36 char) not null,
    locale varchar2(10 char) not null,
    title varchar2(200 char) not null,
    description varchar2(1000 char),
    constraint fk_permission_i18n_permission foreign key (permission_id) references permission(id)
);

create table business_permission_i18n (
    id varchar2(36 char) primary key,
    business_permission_id varchar2(36 char) not null,
    locale varchar2(10 char) not null,
    title varchar2(200 char) not null,
    description varchar2(1000 char),
    constraint fk_business_permission_i18n_permission foreign key (business_permission_id) references business_permission(id)
);
