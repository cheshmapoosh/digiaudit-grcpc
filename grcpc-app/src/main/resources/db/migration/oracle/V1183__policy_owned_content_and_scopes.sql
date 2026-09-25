-- V1182 must succeed before any of this DDL. Oracle commits DDL implicitly.
alter table central_policy add (content clob);

merge into central_policy p
using (
  select policy_id, content, valid_from, valid_to
  from (
    select v.policy_id, v.content, v.valid_from, v.valid_to,
      row_number() over (
        partition by v.policy_id
        order by case v.version_status when 'PUBLISHED' then 0 when 'DRAFT' then 1 else 2 end,
                 v.version_number desc, v.id desc
      ) rn
    from central_policy_version v
  ) where rn = 1
) selected
on (p.id = selected.policy_id)
when matched then update set
  p.content = selected.content,
  p.valid_from = case when selected.valid_from is not null or selected.valid_to is not null
                      then selected.valid_from else p.valid_from end,
  p.valid_to = case when selected.valid_from is not null or selected.valid_to is not null
                    then selected.valid_to else p.valid_to end;

-- Preserve Central relation identity and all lifecycle, validity, and audit columns.
alter table central_policy_version_subprocess_scope drop constraint fk_central_policy_sp_scope_pol;
alter table central_policy_version_subprocess_scope rename to central_policy_subprocess_scope;
alter table central_policy_subprocess_scope rename column policy_version_id to policy_id;
update central_policy_subprocess_scope s set policy_id =
  (select v.policy_id from central_policy_version v where v.id = s.policy_id);
alter table central_policy_subprocess_scope add constraint fk_central_policy_sp_scope_pol
  foreign key (policy_id) references central_policy(id);

alter table central_policy_version_control_scope drop constraint fk_central_policy_ctrl_pol;
alter table central_policy_version_control_scope rename to central_policy_control_scope;
alter table central_policy_control_scope rename column policy_version_id to policy_id;
update central_policy_control_scope s set policy_id =
  (select v.policy_id from central_policy_version v where v.id = s.policy_id);
alter table central_policy_control_scope add constraint fk_central_policy_ctrl_pol
  foreign key (policy_id) references central_policy(id);

alter table central_policy_version_requirement_scope drop constraint fk_central_policy_req_pol;
alter table central_policy_version_requirement_scope rename to central_policy_requirement_scope;
alter table central_policy_requirement_scope rename column policy_version_id to policy_id;
update central_policy_requirement_scope s set policy_id =
  (select v.policy_id from central_policy_version v where v.id = s.policy_id);
alter table central_policy_requirement_scope add constraint fk_central_policy_req_pol
  foreign key (policy_id) references central_policy(id);

-- Local decisions retain their context, action, propagation, identity, and audit data.
alter table local_policy_organization_scope drop constraint fk_local_policy_org_scope_pol;
alter table local_policy_organization_scope rename column policy_version_id to policy_id;
update local_policy_organization_scope s set policy_id =
  (select v.policy_id from central_policy_version v where v.id = s.policy_id);
alter table local_policy_organization_scope add constraint fk_local_policy_org_scope_pol
  foreign key (policy_id) references central_policy(id);

alter table local_policy_subprocess_scope drop constraint fk_local_policy_sp_scope_pol;
alter table local_policy_subprocess_scope rename column policy_version_id to policy_id;
update local_policy_subprocess_scope s set policy_id =
  (select v.policy_id from central_policy_version v where v.id = s.policy_id);
alter table local_policy_subprocess_scope add constraint fk_local_policy_sp_scope_pol
  foreign key (policy_id) references central_policy(id);

alter table local_policy_control_scope drop constraint fk_local_policy_ctrl_scope_pol;
alter table local_policy_control_scope rename column policy_version_id to policy_id;
update local_policy_control_scope s set policy_id =
  (select v.policy_id from central_policy_version v where v.id = s.policy_id);
alter table local_policy_control_scope add constraint fk_local_policy_ctrl_scope_pol
  foreign key (policy_id) references central_policy(id);

alter table local_policy_requirement_scope drop constraint fk_local_policy_req_scope_pol;
alter table local_policy_requirement_scope rename column policy_version_id to policy_id;
update local_policy_requirement_scope s set policy_id =
  (select v.policy_id from central_policy_version v where v.id = s.policy_id);
alter table local_policy_requirement_scope add constraint fk_local_policy_req_scope_pol
  foreign key (policy_id) references central_policy(id);

-- All version document links migrate, including links from unselected versions.
update document_link l set (target_type, target_id) =
  (select 'CENTRAL_POLICY', v.policy_id from central_policy_version v where v.id = l.target_id)
where l.target_type = 'CENTRAL_POLICY_VERSION';

create table central_policy_organization_scope (
  id raw(16) not null,
  policy_id raw(16) not null,
  organization_id raw(16) not null,
  status varchar2(32 byte) not null,
  valid_from date,
  valid_to date,
  created_at timestamp(6) with time zone not null,
  updated_at timestamp(6) with time zone not null,
  created_by raw(16) not null,
  updated_by raw(16) not null,
  deleted_at timestamp(6) with time zone,
  deleted_by raw(16),
  version number(19,0) default 0 not null,
  constraint pk_central_policy_org_scope primary key (id),
  constraint uk_central_policy_org_scope unique (policy_id, organization_id),
  constraint fk_central_policy_org_pol foreign key (policy_id) references central_policy(id),
  constraint fk_central_policy_org_org foreign key (organization_id) references organization(id),
  constraint ck_central_policy_org_st check (status in ('ACTIVE', 'INACTIVE', 'DELETED')),
  constraint ck_central_policy_org_vr check (valid_to is null or valid_from is null or valid_from <= valid_to),
  constraint ck_central_policy_org_del check (
    (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
    or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
  )
);
create index ix_central_policy_org_org on central_policy_organization_scope(organization_id);
