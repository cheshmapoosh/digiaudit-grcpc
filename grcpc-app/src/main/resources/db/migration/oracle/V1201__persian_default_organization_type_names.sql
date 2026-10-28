-- V1196 is already applied: correct its untouched seeded names forwards.
-- IDs, profile ownership, legacy codes, references and lifecycle remain intact.
-- Never overwrite an administrator's edits or a live profile/name collision.
begin
    for seed_label in (
        select 'HOLDING' legacy_code, 'هلدینگ' display_name from dual union all
        select 'COMPANY', 'شرکت' from dual union all
        select 'DEPUTY', 'معاونت' from dual union all
        select 'OFFICE', 'دفتر' from dual union all
        select 'MANAGEMENT', 'مدیریت' from dual union all
        select 'DEPARTMENT', 'اداره' from dual union all
        select 'BRANCH', 'شعبه' from dual union all
        select 'UNIT', 'واحد' from dual union all
        select 'COMMITTEE', 'کمیته' from dual union all
        select 'GROUP', 'گروه' from dual union all
        select 'OTHER', 'سایر' from dual
    ) loop
        update basic_organization_type t
           set name = seed_label.display_name,
               version = version + 1,
               updated_at = systimestamp
         where t.legacy_code = seed_label.legacy_code
           and t.name = seed_label.legacy_code
           and t.status = 'ACTIVE'
           and t.version = 0
           and t.created_by is null
           and t.updated_by is null
           and t.updated_at is null
           and not exists (
               select 1
                 from basic_organization_type existing_type
                where existing_type.profile_id = t.profile_id
                  and existing_type.id <> t.id
                  and existing_type.status <> 'DELETED'
                  and lower(existing_type.name) = lower(seed_label.display_name)
           );
    end loop;
end;
/
