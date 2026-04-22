create table role_i18n (
    id uuid primary key,
    role_id uuid not null,
    locale varchar(10) not null,
    title varchar(200) not null,
    description varchar(1000),
    constraint fk_role_i18n_role foreign key (role_id) references role(id)
);

create table permission_i18n (
    id uuid primary key,
    permission_id uuid not null,
    locale varchar(10) not null,
    title varchar(200) not null,
    description varchar(1000),
    constraint fk_permission_i18n_permission foreign key (permission_id) references permission(id)
);

create table business_permission_i18n (
    id uuid primary key,
    business_permission_id uuid not null,
    locale varchar(10) not null,
    title varchar(200) not null,
    description varchar(1000),
    constraint fk_business_permission_i18n_permission foreign key (business_permission_id) references business_permission(id)
);
