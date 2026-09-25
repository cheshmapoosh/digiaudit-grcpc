# Policy simplification migration runbook (Oracle)

This correction makes `central_policy` the live owner of content and four typed
Central relationships. It leaves every `central_policy_version` row in place as
**unmapped historical storage**. It does not rewrite applied Business Revisions.
Run the migration only with a verified backup and an approved maintenance window.
The migration is prepared here; it has **not** been executed against a database.

## Ordering and backup

1. Stop writers and take a verified, restorable RMAN or Data Pump backup of the
   populated schema. Include at least `central_policy`, `central_policy_version`,
   all three Central and four Local Policy Scope tables, `document`,
   `document_version`, `document_link`, `masterdata_revision`, and
   `masterdata_revision_content`; retain the external MinIO objects referenced
   by Document Versions. Record backup identifier, time, row counts, restore
   test, and immutable revision snapshot export/checksum in change evidence.
2. Run the diagnostic SQL below against that backup or a read-only copy, retain
   its full output (including Policy's original validity pair), and resolve
   every collision across **all** lifecycle states. Do not choose a winning
   relation row or alter INCLUDE/EXCLUDE by automation.
3. Apply Flyway in order:
   `V1182__preflight_policy_simplification.sql` (no DDL; aborts on collisions
   or orphan version document links),
   `V1183__policy_owned_content_and_scopes.sql` (data copy and in-place
   retargeting),
   `V1184__policy_organization_stored_codes.sql` (closed vocabularies), then
   `V1185__verify_policy_simplification.sql` (postcondition gate).
4. Compare the postcondition queries and exported row counts/checksums below
   before enabling application writers.

Oracle DDL commits implicitly. A failed V1183 or later step may leave a partly
changed schema; arbitrary transaction rollback cannot restore it. **Recovery
order:** keep writers stopped; preserve the failure log and a forensic copy;
restore the verified pre-migration schema backup and external object snapshot
into an isolated database; verify Policy/Version/scope/document/revision counts
and revision export checksums; resolve the reported source collision or migration
defect; rehearse on a fresh restored copy; only then reapply the full ordered
migration chain and reopen traffic. Do not use Flyway clean/repair as recovery.

## Source selection and evidence

The chosen row is highest `version_number` among `PUBLISHED`; otherwise
highest among `DRAFT`; otherwise highest of all statuses. `id` breaks ties
deterministically. This selection includes deleted and inactive historical
rows. Policy lifecycle and deletion audit remain authoritative. A selected
null-content published baseline still wins. If its version validity has either
bound, both version bounds replace the Policy pair; otherwise the existing
Policy pair remains. Policies without versions remain intact with null content.

Capture this before applying V1182. The output reports the selected historical
status/lifecycle, original Policy interval, replacement pair, content lengths,
and content held only by non-selected versions:

```sql
with ranked as (
  select v.*, row_number() over (
    partition by v.policy_id
    order by case v.version_status when 'PUBLISHED' then 0
      when 'DRAFT' then 1 else 2 end, v.version_number desc, v.id desc
  ) rn
  from central_policy_version v
)
select rawtohex(p.id) policy_id, p.status policy_lifecycle,
       p.valid_from original_policy_from, p.valid_to original_policy_to,
       rawtohex(s.id) selected_version_id, s.version_status selected_publication_status,
       s.status selected_historical_lifecycle, s.version_number,
       s.valid_from selected_from, s.valid_to selected_to,
       dbms_lob.getlength(s.content) selected_content_length,
       (select count(*) from ranked other
        where other.policy_id=p.id and other.rn<>1 and other.content is not null)
         nonselected_versions_with_content
from central_policy p left join ranked s on s.policy_id=p.id and s.rn=1
order by p.code;
```

Export full CLOBs and audit columns as part of the backup, not a truncated
screen result. Save separately the rows whose original Policy validity differs
from a selected non-null-bound pair:

```sql
with ranked as (
  select v.*, row_number() over (
    partition by v.policy_id
    order by case v.version_status when 'PUBLISHED' then 0
      when 'DRAFT' then 1 else 2 end, v.version_number desc, v.id desc
  ) rn from central_policy_version v
)
select rawtohex(p.id) policy_id, p.valid_from original_from, p.valid_to original_to,
       s.valid_from replacement_from, s.valid_to replacement_to
from central_policy p join ranked s on s.policy_id=p.id and s.rn=1
where (s.valid_from is not null or s.valid_to is not null)
  and (decode(p.valid_from,s.valid_from,0,1)=1
       or decode(p.valid_to,s.valid_to,0,1)=1);
```

## Collision diagnostics

V1182 blocks duplicate Policy/endpoint keys, including inactive/deleted rows,
in all seven existing scope tables. This diagnostic lists the exact relation
IDs and Local actions. Resolve each group explicitly and preserve source
evidence before retrying:

```sql
with mapped as (
 select 'CENTRAL_SUBPROCESS' family, v.policy_id, s.subprocess_id endpoint_id,
        s.id relation_id, s.status, cast(null as varchar2(32)) scope_action
 from central_policy_version_subprocess_scope s join central_policy_version v on v.id=s.policy_version_id
 union all
 select 'CENTRAL_CONTROL', v.policy_id, s.central_control_scope_id, s.id, s.status, null
 from central_policy_version_control_scope s join central_policy_version v on v.id=s.policy_version_id
 union all
 select 'CENTRAL_REQUIREMENT', v.policy_id, s.central_requirement_scope_id, s.id, s.status, null
 from central_policy_version_requirement_scope s join central_policy_version v on v.id=s.policy_version_id
 union all
 select 'LOCAL_ORGANIZATION', v.policy_id, s.organization_id, s.id, s.status, s.scope_action
 from local_policy_organization_scope s join central_policy_version v on v.id=s.policy_version_id
 union all
 select 'LOCAL_SUBPROCESS', v.policy_id, s.organization_subprocess_scope_id, s.id, s.status, s.scope_action
 from local_policy_subprocess_scope s join central_policy_version v on v.id=s.policy_version_id
 union all
 select 'LOCAL_CONTROL', v.policy_id, s.local_control_scope_id, s.id, s.status, s.scope_action
 from local_policy_control_scope s join central_policy_version v on v.id=s.policy_version_id
 union all
 select 'LOCAL_REQUIREMENT', v.policy_id, s.local_requirement_scope_id, s.id, s.status, s.scope_action
 from local_policy_requirement_scope s join central_policy_version v on v.id=s.policy_version_id
)
select family, rawtohex(policy_id) policy_id, rawtohex(endpoint_id) endpoint_id,
       count(*) rows_for_key,
       listagg(rawtohex(relation_id)||':'||status||':'||nvl(scope_action,'-'), ', ')
         within group (order by relation_id) relation_evidence
from mapped group by family, policy_id, endpoint_id having count(*)>1;
```

For document collisions, inspect both multiple version links converging on one
Policy and an already-existing Policy link with the same Document Version:

```sql
select rawtohex(l.document_version_id) document_version_id,
       rawtohex(v.policy_id) policy_id, count(*) links,
       listagg(rawtohex(l.id), ',') within group(order by l.id) link_ids
from document_link l join central_policy_version v
  on l.target_type='CENTRAL_POLICY_VERSION' and l.target_id=v.id
group by l.document_version_id,v.policy_id having count(*)>1;

select rawtohex(l.id) version_link_id, rawtohex(p.id) policy_link_id,
       rawtohex(l.document_version_id) document_version_id, rawtohex(v.policy_id) policy_id
from document_link l join central_policy_version v
  on l.target_type='CENTRAL_POLICY_VERSION' and l.target_id=v.id
join document_link p on p.document_version_id=l.document_version_id
 and p.target_type='CENTRAL_POLICY' and p.target_id=v.policy_id;
```

## Postcondition evidence

Compare these with the backup's table counts; Central tables are renamed in
place and should keep every row ID. Local table names stay the same and their
`scope_action`/`propagation_mode` values remain unchanged. All Document and
Document Version identities and files remain unchanged. The migration does not
write to either Business Revision table.

```sql
select 'POLICY' family, count(*) n from central_policy
union all select 'HISTORICAL_VERSION', count(*) from central_policy_version
union all select 'CENTRAL_SUBPROCESS', count(*) from central_policy_subprocess_scope
union all select 'CENTRAL_ORGANIZATION', count(*) from central_policy_organization_scope
union all select 'CENTRAL_CONTROL', count(*) from central_policy_control_scope
union all select 'CENTRAL_REQUIREMENT', count(*) from central_policy_requirement_scope
union all select 'LOCAL_ORGANIZATION', count(*) from local_policy_organization_scope
union all select 'LOCAL_SUBPROCESS', count(*) from local_policy_subprocess_scope
union all select 'LOCAL_CONTROL', count(*) from local_policy_control_scope
union all select 'LOCAL_REQUIREMENT', count(*) from local_policy_requirement_scope
union all select 'DOCUMENT', count(*) from document
union all select 'DOCUMENT_VERSION', count(*) from document_version
union all select 'DOCUMENT_LINK', count(*) from document_link
union all select 'REVISION', count(*) from masterdata_revision
union all select 'REVISION_CONTENT', count(*) from masterdata_revision_content;

select count(*) remaining_version_links from document_link
 where target_type='CENTRAL_POLICY_VERSION';
```

V1185 additionally checks selected content byte-for-byte as CLOB, selected
validity pairs, absent version-target links, and Policy foreign-key orphans.
Check every migration diagnostic and compare the externally saved original
Policy intervals, non-selected CLOBs, publication/audit rows, document link IDs,
revision content export checksums, and all before/after counts. Do not claim
runtime or concurrency safety from these static checks.

The resulting schema has 45 active Master Data business structures, one
retained historical `central_policy_version` table, and two approved technical
tables (`document_temp_upload`, `masterdata_hierarchy_guard`): 48 physical
Master Data tables. This count follows the original 45 business tables,
replacement of the active Version concept by Central Organization Scope, and
the deliberate historical retention; the seven scope retargets do not change
table count.

