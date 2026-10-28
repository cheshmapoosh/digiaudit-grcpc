-- Extend only the two existing lifecycle constraint pairs. Existing rows and identities stay intact.
alter table organization_owner_assignment drop constraint ck_org_owner_status;
alter table organization_owner_assignment add constraint ck_org_owner_status
    check (status in ('ACTIVE', 'INACTIVE', 'DELETED'));
alter table organization_owner_assignment drop constraint ck_org_owner_deleted;
alter table organization_owner_assignment add constraint ck_org_owner_deleted check (
    (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
    or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
);

alter table global_control_regulation drop constraint ck_global_control_reg_status;
alter table global_control_regulation add constraint ck_global_control_reg_status
    check (status in ('ACTIVE', 'INACTIVE', 'DELETED'));
alter table global_control_regulation drop constraint ck_global_control_reg_deleted;
alter table global_control_regulation add constraint ck_global_control_reg_deleted check (
    (status = 'DELETED' and deleted_at is not null and deleted_by is not null)
    or (status <> 'DELETED' and deleted_at is null and deleted_by is null)
);
