merge into objective_organization_assignment target
using (
    select
        lower(
            substr(generated_uuid, 1, 8) || '-' ||
            substr(generated_uuid, 9, 4) || '-' ||
            substr(generated_uuid, 13, 4) || '-' ||
            substr(generated_uuid, 17, 4) || '-' ||
            substr(generated_uuid, 21, 12)
        ) as generated_id,
        objective_node_id,
        organization_id,
        active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        version
    from (
        select
            rawtohex(sys_guid()) as generated_uuid,
            grouped_source.*
        from (
            select
                reference_id as objective_node_id,
                organization_id,
                max(active) as active,
                min(created_at) as created_at,
                max(updated_at) as updated_at,
                min(created_by) keep (dense_rank first order by created_at nulls last, id) as created_by,
                min(updated_by) keep (dense_rank last order by nvl(updated_at, created_at) nulls first, id) as updated_by,
                max(version) as version
            from organization_reference_assignment
            where reference_type = 'OBJECTIVE'
            group by reference_id, organization_id
        ) grouped_source
    )
) source
on (
    target.objective_node_id = source.objective_node_id
    and target.organization_id = source.organization_id
)
when matched then update set
    target.active = case
        when target.active = 1 or source.active = 1 then 1
        else 0
    end,
    target.updated_at = case
        when target.active = 0 and source.active = 1 then coalesce(source.updated_at, source.created_at, target.updated_at, systimestamp)
        else target.updated_at
    end,
    target.updated_by = case
        when target.active = 0 and source.active = 1 then coalesce(source.updated_by, target.updated_by)
        else target.updated_by
    end,
    target.version = greatest(nvl(target.version, 0), nvl(source.version, 0))
when not matched then insert (
    id,
    objective_node_id,
    organization_id,
    active,
    created_at,
    updated_at,
    created_by,
    updated_by,
    version
) values (
    source.generated_id,
    source.objective_node_id,
    source.organization_id,
    source.active,
    coalesce(source.created_at, systimestamp),
    source.updated_at,
    source.created_by,
    source.updated_by,
    nvl(source.version, 0)
);

delete from organization_reference_assignment
where reference_type = 'OBJECTIVE';

alter table organization_reference_assignment drop constraint chk_org_ref_asg_type;

alter table organization_reference_assignment add constraint chk_org_ref_asg_type
    check (reference_type in ('CONTROL', 'REGULATION', 'POLICY'));
