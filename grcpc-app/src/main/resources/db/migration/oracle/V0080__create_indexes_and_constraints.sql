alter table app_user add constraint uq_app_user_username unique (username);
alter table role add constraint uq_role_code unique (code);
alter table permission add constraint uq_permission_code unique (code);
alter table business_permission add constraint uq_business_permission_code unique (code);

alter table role_i18n add constraint uq_role_i18n_role_locale unique (role_id, locale);
alter table permission_i18n add constraint uq_permission_i18n_permission_locale unique (permission_id, locale);
alter table business_permission_i18n add constraint uq_business_permission_i18n_locale unique (business_permission_id, locale);

alter table role_permission add constraint uq_role_permission unique (role_id, permission_id);
alter table role_business_permission add constraint uq_role_business_permission unique (role_id, business_permission_id);
alter table delegation_assignable_role add constraint uq_delegation_assignable_role unique (delegation_policy_id, assignable_role_id);

create unique index uq_app_user_single_root on app_user (case when root_user = 1 then 1 end);
create index ix_app_user_default_org_unit_id on app_user(default_org_unit_id);
create index ix_user_role_assignment_user_id on user_role_assignment(user_id);
create index ix_user_role_assignment_role_id on user_role_assignment(role_id);
create index ix_user_role_assignment_scope_org_unit_id on user_role_assignment(scope_org_unit_id);
create index ix_delegation_policy_subject_role_id on delegation_policy(subject_role_id);
create index ix_delegation_policy_subject_user_id on delegation_policy(subject_user_id);
create index ix_delegation_policy_scope_org_unit_id on delegation_policy(scope_org_unit_id);
create index ix_audit_log_event_time on audit_log(event_time);
create index ix_audit_log_actor_user_id on audit_log(actor_user_id);
create index ix_audit_log_event_type on audit_log(event_type);
