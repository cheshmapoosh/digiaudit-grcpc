-- Profile identity uses stable, named colors and SAP UI5 icon names.
-- Existing image data is retained; the bundled UI now renders the named icon.
alter table dataset_profile add (
    color_name varchar2(32 char) default 'blue' not null,
    icon_name varchar2(64 char) default 'building' not null
);

update dataset_profile set color_name = case upper(color)
    when '#0070F2' then 'blue'
    when '#1B4F72' then 'navy'
    when '#2980B9' then 'sky'
    when '#008B8B' then 'cyan'
    when '#00796B' then 'teal'
    when '#2E7D32' then 'green'
    when '#145A32' then 'forest'
    when '#6B8E23' then 'olive'
    when '#7CB342' then 'lime'
    when '#F9A825' then 'yellow'
    when '#FF8F00' then 'amber'
    when '#E76500' then 'orange'
    when '#E76F51' then 'coral'
    when '#C0392B' then 'red'
    when '#7B241C' then 'burgundy'
    when '#C2185B' then 'pink'
    when '#8E44AD' then 'purple'
    when '#5B2C6F' then 'indigo'
    when '#546E7A' then 'slate'
    when '#795548' then 'brown'
    else 'blue' end;

alter table dataset_profile add constraint ck_dataset_profile_color_name
    check (color_name in ('blue', 'navy', 'sky', 'cyan', 'teal', 'green', 'forest', 'olive', 'lime', 'yellow', 'amber', 'orange', 'coral', 'red', 'burgundy', 'pink', 'purple', 'indigo', 'slate', 'brown'));
alter table dataset_profile add constraint ck_dataset_profile_icon_name
    check (icon_name in ('building', 'company-view', 'org-chart', 'official-service', 'factory', 'business-objects-experience', 'functional-location', 'home', 'group', 'world', 'globe', 'customer', 'manager', 'collaborate', 'business-card', 'capital-projects', 'retail-store', 'education', 'supplier', 'suitcase'));
