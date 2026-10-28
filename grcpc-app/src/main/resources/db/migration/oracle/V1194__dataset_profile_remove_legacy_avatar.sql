-- Profile identity is represented only by the named color and UI5 icon codes.
-- Explicitly retire stored avatar images and the redundant hexadecimal color.
alter table dataset_profile drop column avatar_data_url;
alter table dataset_profile drop constraint ck_dataset_profile_color;
alter table dataset_profile drop column color;
