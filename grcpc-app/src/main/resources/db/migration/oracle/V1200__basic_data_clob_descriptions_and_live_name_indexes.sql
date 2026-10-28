-- Preserve the already-applied V1196 checksum. Apply its later refinements forwards.
-- Oracle VARCHAR2 -> CLOB conversion uses a new column and retains every description.
alter table basic_organization_type add (description_v1200 clob);
update basic_organization_type set description_v1200 = to_clob(description) where description is not null;
alter table basic_organization_type drop column description;
alter table basic_organization_type rename column description_v1200 to description;

alter table basic_document_type add (description_v1200 clob);
update basic_document_type set description_v1200 = to_clob(description) where description is not null;
alter table basic_document_type drop column description;
alter table basic_document_type rename column description_v1200 to description;

-- Soft-deleted names no longer occupy the active profile/name business key.
drop index ux_basic_organization_type_name;
create unique index ux_basic_organization_type_name on basic_organization_type(
    case when status <> 'DELETED' then profile_id end,
    case when status <> 'DELETED' then lower(name) end
);
drop index ux_basic_document_type_name;
create unique index ux_basic_document_type_name on basic_document_type(
    case when status <> 'DELETED' then profile_id end,
    case when status <> 'DELETED' then lower(name) end
);
