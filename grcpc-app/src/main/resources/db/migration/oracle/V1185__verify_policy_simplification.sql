-- Postcondition gate for the active schema. Compare row counts and immutable revisions
-- with the external evidence captured before V1182 (see migration runbook).
declare
  failures number;
begin
  select count(*) into failures
  from (
    select policy_id, content, valid_from, valid_to from (
      select v.policy_id, v.content, v.valid_from, v.valid_to,
        row_number() over (
          partition by v.policy_id
          order by case v.version_status when 'PUBLISHED' then 0 when 'DRAFT' then 1 else 2 end,
                   v.version_number desc, v.id desc
        ) rn
      from central_policy_version v
    ) where rn = 1
  ) selected
  join central_policy p on p.id = selected.policy_id
  where (selected.content is null and p.content is not null)
     or (selected.content is not null and p.content is null)
     or (selected.content is not null and p.content is not null
         and dbms_lob.compare(selected.content, p.content) <> 0)
     or ((selected.valid_from is not null or selected.valid_to is not null)
         and (decode(selected.valid_from, p.valid_from, 0, 1) = 1
              or decode(selected.valid_to, p.valid_to, 0, 1) = 1));
  if failures > 0 then
    raise_application_error(-20085, 'POLICY_MIGRATION_POSTCONDITION: selected content or validity mismatch on ' || failures || ' policies');
  end if;

  select count(*) into failures from document_link where target_type = 'CENTRAL_POLICY_VERSION';
  if failures > 0 then
    raise_application_error(-20086, 'POLICY_MIGRATION_POSTCONDITION: version document links remain');
  end if;

  select count(*) into failures from (
    select s.id from central_policy_subprocess_scope s left join central_policy p on p.id=s.policy_id where p.id is null
    union all
    select s.id from central_policy_organization_scope s left join central_policy p on p.id=s.policy_id where p.id is null
    union all
    select s.id from central_policy_control_scope s left join central_policy p on p.id=s.policy_id where p.id is null
    union all
    select s.id from central_policy_requirement_scope s left join central_policy p on p.id=s.policy_id where p.id is null
    union all
    select s.id from local_policy_organization_scope s left join central_policy p on p.id=s.policy_id where p.id is null
    union all
    select s.id from local_policy_subprocess_scope s left join central_policy p on p.id=s.policy_id where p.id is null
    union all
    select s.id from local_policy_control_scope s left join central_policy p on p.id=s.policy_id where p.id is null
    union all
    select s.id from local_policy_requirement_scope s left join central_policy p on p.id=s.policy_id where p.id is null
  );
  if failures > 0 then
    raise_application_error(-20087, 'POLICY_MIGRATION_POSTCONDITION: orphan Policy relation rows ' || failures);
  end if;
end;
/

