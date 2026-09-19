alter table app_user add (
    password_change_required number(1,0) default 0 not null,
    credential_version number(19,0) default 0 not null
);

alter table app_user add constraint ck_user_password_change check (password_change_required in (0, 1));
