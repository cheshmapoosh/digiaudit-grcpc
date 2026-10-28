-- Delivery items 1, 12, 14. Upgrade and fresh-install migration; never rewrites file identities.
-- The initial dataset identity is fixed here only. Runtime selection never falls back to it or its name.
create table dataset_profile (
    id raw(16) primary key,
    name varchar2(255 char) not null,
    description clob,
    color varchar2(7 char) not null,
    status varchar2(32 byte) not null,
    created_at timestamp default systimestamp not null,
    updated_at timestamp,
    created_by varchar2(36 char),
    updated_by varchar2(36 char),
    deleted_at timestamp,
    deleted_by varchar2(36 char),
    version number(19,0) default 0 not null,
    constraint ck_dataset_profile_status check (status in ('ACTIVE','INACTIVE','DELETED')),
    constraint ck_dataset_profile_color check (regexp_like(color, '^#[0-9a-fA-F]{6}$')),
    constraint ck_dataset_profile_deleted check (
        (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
        or (status <> 'DELETED' and deleted_at is null and deleted_by is null))
);
insert into dataset_profile (id, name, color, status)
values (hextoraw('00000000000040008000000000000001'), 'پیش فرض', '#0070F2', 'ACTIVE');

-- Independent of hierarchy guard keys: profile lifecycle, membership and dataset writes share this row.
create table dataset_profile_guard (guard_key varchar2(32 byte) primary key);
insert into dataset_profile_guard (guard_key) values ('ADMINISTRATION');

alter table app_user add (profile_id raw(16), profile_admin number(1) default 0 not null);
update app_user set profile_id = hextoraw('00000000000040008000000000000001') where root_user = 0;
alter table app_user add constraint fk_app_user_profile foreign key (profile_id) references dataset_profile(id);
alter table app_user add constraint ck_app_user_profile_kind check (
    (root_user = 1 and profile_admin = 0 and profile_id is null)
    or (root_user = 0 and profile_admin = 1 and profile_id is null)
    or (root_user = 0 and profile_admin = 0 and profile_id is not null));
alter table app_user add constraint uk_app_user_profile_id unique (profile_id, id);
create index ix_app_user_profile on app_user(profile_id);

create table profile_admin_access (
    profile_id raw(16) not null,
    user_id varchar2(36 char) not null,
    granted_by varchar2(36 char) not null,
    granted_at timestamp default systimestamp not null,
    constraint pk_profile_admin_access primary key (profile_id, user_id),
    constraint fk_profile_admin_profile foreign key (profile_id) references dataset_profile(id),
    constraint fk_profile_admin_user foreign key (user_id) references app_user(id),
    constraint fk_profile_admin_actor foreign key (granted_by) references app_user(id)
);
create index ix_profile_admin_user on profile_admin_access(user_id, profile_id);

-- Existing grants retain their scope, validity and role; no permission is added.
alter table user_role_assignment add (profile_id raw(16));
update user_role_assignment set profile_id = hextoraw('00000000000040008000000000000001');
alter table user_role_assignment modify (profile_id not null);
alter table user_role_assignment add constraint fk_user_role_profile foreign key (profile_id) references dataset_profile(id);
create index ix_user_role_profile on user_role_assignment(profile_id, user_id, active);

insert into role (id, code, system_defined, enabled, created_at, version)
values ('11900000-0000-4000-8000-000000000001', 'PROFILE_ADMIN', 1, 1, systimestamp, 0);
insert into role_i18n (id, role_id, locale, title, description)
values ('11900000-0000-4000-8000-000000000002', '11900000-0000-4000-8000-000000000001', 'fa', 'ادمین پروفایل', 'مدیریت پروفایل‌های مجاز؛ واگذاری فقط توسط root');
insert into role_i18n (id, role_id, locale, title, description)
values ('11900000-0000-4000-8000-000000000003', '11900000-0000-4000-8000-000000000001', 'en', 'Profile Admin', 'Administration of explicitly authorized datasets; granted only by root');

-- Explicit registry includes retained Policy Version history and active ACL data.
-- Existing typed FKs are rebuilt with profile_id; audit user references remain global.
declare
    type names_type is table of varchar2(128);
    owned names_type := names_type(
        'CENTRAL_RISK_CONTROL_ASSIGNMENT',
        'CENTRAL_RISK_CONTROL_OBJECTIVE_ASSIGNMENT',
        'CENTRAL_CONTROL_CONTROL_OBJECTIVE_ASSIGNMENT',
        'CENTRAL_REQUIREMENT_CONTROL_ASSIGNMENT',
        'DOCUMENT',
        'DOCUMENT_LINK',
        'DOCUMENT_TEMP_UPLOAD',
        'DOCUMENT_VERSION',
        'CENTRAL_ACCOUNT_GROUP',
        'CONTROL_GROUP',
        'GLOBAL_CONTROL',
        'GLOBAL_CONTROL_REGULATION',
        'OBJECTIVE',
        'ORGANIZATION_OBJECTIVE',
        'CENTRAL_CONTROL',
        'CENTRAL_CONTROL_GROUP',
        'CENTRAL_CONTROL_OBJECTIVE',
        'CENTRAL_CONTROL_ACCOUNT_GROUP',
        'CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP',
        'CENTRAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE',
        'CENTRAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE',
        'CENTRAL_SUBPROCESS_RISK_CONTROL_COVERAGE',
        'CENTRAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE',
        'CENTRAL_POLICY',
        'CENTRAL_POLICY_GROUP',
        'CENTRAL_POLICY_SUBPROCESS_SCOPE',
        'CENTRAL_POLICY_ORGANIZATION_SCOPE',
        'CENTRAL_POLICY_CONTROL_SCOPE',
        'CENTRAL_POLICY_REQUIREMENT_SCOPE',
        'CENTRAL_REGULATION',
        'CENTRAL_REGULATION_GROUP',
        'CENTRAL_REGULATION_REQUIREMENT',
        'CENTRAL_RISK_CATEGORY',
        'CENTRAL_RISK_TEMPLATE',
        'LOCAL_ORGANIZATION_SUBPROCESS_SCOPE',
        'LOCAL_SUBPROCESS_CONTROL_SCOPE',
        'LOCAL_SUBPROCESS_RISK_SCOPE',
        'LOCAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE',
        'LOCAL_SUBPROCESS_REQUIREMENT_SCOPE',
        'LOCAL_SUBPROCESS_RISK_CONTROL_COVERAGE',
        'LOCAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE',
        'LOCAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE',
        'LOCAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE',
        'LOCAL_POLICY_ORGANIZATION_SCOPE',
        'LOCAL_POLICY_SUBPROCESS_SCOPE',
        'LOCAL_POLICY_CONTROL_SCOPE',
        'LOCAL_POLICY_REQUIREMENT_SCOPE',
        'CENTRAL_PROCESS',
        'CENTRAL_SUBPROCESS',
        'MASTERDATA_REVISION_CONTENT',
        'MASTERDATA_REVISION',
        'CENTRAL_SUBPROCESS_CONTROL_SCOPE',
        'CENTRAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE',
        'CENTRAL_SUBPROCESS_RISK_SCOPE',
        'CENTRAL_SUBPROCESS_REQUIREMENT_SCOPE',
        'ORGANIZATION',
        'RESOURCE_ACL_ENTRY',
        'CENTRAL_POLICY_VERSION'
    );
    type ddl_type is table of varchar2(32767) index by pls_integer;
    foreign_keys ddl_type;
    foreign_key_tables ddl_type;
    foreign_key_columns ddl_type;
    foreign_key_count pls_integer := 0;
    table_set varchar2(16000) := ',';
    source_columns varchar2(4000);
    target_columns varchar2(4000);
    index_table varchar2(128);
    index_columns varchar2(4000);
    index_column_count pls_integer;
    covering_indexes pls_integer;
    function is_owned(table_name varchar2) return boolean is
    begin return instr(table_set, ',' || upper(table_name) || ',') > 0; end;
begin
    for i in 1..owned.count loop table_set := table_set || upper(owned(i)) || ','; end loop;
    for i in 1..owned.count loop
        execute immediate 'alter table ' || owned(i) || ' add (profile_id raw(16))';
        execute immediate 'update ' || owned(i) || ' set profile_id = hextoraw(''00000000000040008000000000000001'')';
        execute immediate 'alter table ' || owned(i) || ' modify (profile_id not null)';
        execute immediate 'alter table ' || owned(i) || ' add constraint fk_dataset_' || i || ' foreign key (profile_id) references dataset_profile(id)';
        execute immediate 'create index ix_dataset_' || i || ' on ' || owned(i) || '(profile_id)';
    end loop;

    -- Save the complete column lists first, then remove dependent FKs before replacing unique keys.
    for fk in (select c.table_name, c.constraint_name, c.r_constraint_name, p.table_name parent_table
                 from user_constraints c join user_constraints p on p.constraint_name = c.r_constraint_name
                where c.constraint_type = 'R') loop
        if is_owned(fk.table_name) and is_owned(fk.parent_table) then
            select listagg(column_name, ',') within group (order by position) into source_columns
              from user_cons_columns where constraint_name = fk.constraint_name;
            select listagg(column_name, ',') within group (order by position) into target_columns
              from user_cons_columns where constraint_name = fk.r_constraint_name;
            foreign_key_count := foreign_key_count + 1;
            foreign_key_tables(foreign_key_count) := fk.table_name;
            foreign_key_columns(foreign_key_count) := 'PROFILE_ID,' || source_columns;
            foreign_keys(foreign_key_count) := 'alter table ' || fk.table_name || ' add constraint ' || fk.constraint_name
                || ' foreign key (profile_id,' || source_columns || ') references ' || fk.parent_table
                || '(profile_id,' || target_columns || ')';
            execute immediate 'alter table ' || fk.table_name || ' drop constraint ' || fk.constraint_name;
        end if;
    end loop;

    -- Scope every pre-existing business unique key, including deleted-row code/pair reservations.
    for uk in (select table_name, constraint_name from user_constraints where constraint_type = 'U') loop
        if is_owned(uk.table_name) then
            select listagg(column_name, ',') within group (order by position) into source_columns
              from user_cons_columns where constraint_name = uk.constraint_name;
            execute immediate 'alter table ' || uk.table_name || ' drop constraint ' || uk.constraint_name || ' drop index';
            execute immediate 'alter table ' || uk.table_name || ' add constraint ' || uk.constraint_name
                || ' unique (profile_id,' || source_columns || ')';
        end if;
    end loop;
    for i in 1..owned.count loop
        execute immediate 'alter table ' || owned(i) || ' add constraint uk_dataset_id_' || i || ' unique (profile_id,id)';
    end loop;

    for i in 1..foreign_key_count loop
        execute immediate foreign_keys(i);
        index_table := foreign_key_tables(i);
        index_columns := foreign_key_columns(i);
        index_column_count := regexp_count(index_columns, ',') + 1;
        select count(*) into covering_indexes from (
            select index_name, listagg(column_name, ',') within group (order by column_position) columns_list
              from user_ind_columns where table_name = index_table and column_position <= index_column_count
             group by index_name
        ) where columns_list = index_columns;
        if covering_indexes = 0 then
            execute immediate 'create index ix_dataset_ref_' || i || ' on ' || index_table || '(' || index_columns || ')';
        end if;
    end loop;
end;
/

-- Preserve the historical published-only key's all-NULL exclusion for unpublished rows.
-- Prefixing a non-null profile_id unconditionally would change Oracle NULL uniqueness semantics.
drop index uq_central_policy_version_pub;
create unique index uq_central_policy_version_pub on central_policy_version (
    case when version_status = 'PUBLISHED' then profile_id end,
    case when version_status = 'PUBLISHED' then policy_id end
);

-- Existing organizations intentionally have no fabricated owner.
alter table organization add (owner_user_id varchar2(36 char));
alter table organization add constraint fk_organization_profile_owner
    foreign key (profile_id, owner_user_id) references app_user(profile_id, id);
create index ix_organization_profile_owner on organization(profile_id, owner_user_id);
