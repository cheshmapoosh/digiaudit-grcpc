-- Run the documented backup and diagnostic queries before allowing Flyway to execute this gate.
-- This migration contains no DDL: an ambiguous key must stop before Oracle implicit commits.
declare
  collision_count number;
  procedure assert_unique(p_label varchar2, p_sql varchar2) is
  begin
    execute immediate p_sql into collision_count;
    if collision_count > 0 then
      raise_application_error(-20082,
        'POLICY_MIGRATION_COLLISION ' || p_label || ': ' || collision_count ||
        ' duplicate Policy/endpoint keys. Inspect the documented preflight query and resolve every lifecycle row before retrying.');
    end if;
  end;
begin
  assert_unique('central subprocess',
    'select count(*) from (select v.policy_id, s.subprocess_id from central_policy_version_subprocess_scope s join central_policy_version v on v.id=s.policy_version_id group by v.policy_id,s.subprocess_id having count(*)>1)');
  assert_unique('central control scope',
    'select count(*) from (select v.policy_id, s.central_control_scope_id from central_policy_version_control_scope s join central_policy_version v on v.id=s.policy_version_id group by v.policy_id,s.central_control_scope_id having count(*)>1)');
  assert_unique('central requirement scope',
    'select count(*) from (select v.policy_id, s.central_requirement_scope_id from central_policy_version_requirement_scope s join central_policy_version v on v.id=s.policy_version_id group by v.policy_id,s.central_requirement_scope_id having count(*)>1)');
  assert_unique('local organization',
    'select count(*) from (select s.organization_id,v.policy_id from local_policy_organization_scope s join central_policy_version v on v.id=s.policy_version_id group by s.organization_id,v.policy_id having count(*)>1)');
  assert_unique('local subprocess',
    'select count(*) from (select s.organization_subprocess_scope_id,v.policy_id from local_policy_subprocess_scope s join central_policy_version v on v.id=s.policy_version_id group by s.organization_subprocess_scope_id,v.policy_id having count(*)>1)');
  assert_unique('local control',
    'select count(*) from (select s.local_control_scope_id,v.policy_id from local_policy_control_scope s join central_policy_version v on v.id=s.policy_version_id group by s.local_control_scope_id,v.policy_id having count(*)>1)');
  assert_unique('local requirement',
    'select count(*) from (select s.local_requirement_scope_id,v.policy_id from local_policy_requirement_scope s join central_policy_version v on v.id=s.policy_version_id group by s.local_requirement_scope_id,v.policy_id having count(*)>1)');
  assert_unique('document links to Policy',
    'select count(*) from (select l.document_version_id,v.policy_id from document_link l join central_policy_version v on l.target_type=''CENTRAL_POLICY_VERSION'' and l.target_id=v.id group by l.document_version_id,v.policy_id having count(*)>1)');
  assert_unique('document links against existing Policy links',
    'select count(*) from document_link l join central_policy_version v on l.target_type=''CENTRAL_POLICY_VERSION'' and l.target_id=v.id join document_link p on p.document_version_id=l.document_version_id and p.target_type=''CENTRAL_POLICY'' and p.target_id=v.policy_id');
  execute immediate
    'select count(*) from document_link l where l.target_type=''CENTRAL_POLICY_VERSION'' and not exists (select 1 from central_policy_version v where v.id=l.target_id)'
    into collision_count;
  if collision_count > 0 then
    raise_application_error(-20083,
      'POLICY_MIGRATION_ORPHAN_LINK: ' || collision_count ||
      ' version document links have no historical version row');
  end if;
end;
/
