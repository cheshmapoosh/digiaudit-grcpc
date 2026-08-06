create table masterdata_hierarchy_guard (
    hierarchy_key varchar2(64 byte) not null,
    constraint pk_masterdata_hierarchy_guard
        primary key (hierarchy_key),
    constraint ck_masterdata_hierarchy_guard_key
        check (hierarchy_key = upper(trim(hierarchy_key)))
);

insert into masterdata_hierarchy_guard (hierarchy_key)
values ('ORGANIZATION');

insert into masterdata_hierarchy_guard (hierarchy_key)
values ('PROCESS');

insert into masterdata_hierarchy_guard (hierarchy_key)
values ('RISK');

insert into masterdata_hierarchy_guard (hierarchy_key)
values ('ACCOUNT_GROUP');

insert into masterdata_hierarchy_guard (hierarchy_key)
values ('REGULATION');

insert into masterdata_hierarchy_guard (hierarchy_key)
values ('POLICY');
