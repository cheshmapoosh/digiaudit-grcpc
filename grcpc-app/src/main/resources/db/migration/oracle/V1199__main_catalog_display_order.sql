-- Main catalog page presentation order only. Existing form/relationship sort_order is unchanged.
-- NULL ranks are sorted by created_at descending, ahead of manually ordered siblings.
-- New inserts inherit NULL, so each new item is first in its current group.
alter table organization add (display_order number(19,0));
alter table organization add constraint ck_org_display_order check (display_order >= 0);
alter table central_process add (display_order number(19,0));
alter table central_process add constraint ck_process_display_order check (display_order >= 0);
alter table central_subprocess add (display_order number(19,0));
alter table central_subprocess add constraint ck_subprocess_display_order check (display_order >= 0);
alter table central_control_group add (display_order number(19,0));
alter table central_control_group add constraint ck_control_group_display_order check (display_order >= 0);
alter table central_control add (display_order number(19,0));
alter table central_control add constraint ck_control_display_order check (display_order >= 0);
alter table central_risk_category add (display_order number(19,0));
alter table central_risk_category add constraint ck_risk_category_display_order check (display_order >= 0);
alter table central_risk_template add (display_order number(19,0));
alter table central_risk_template add constraint ck_risk_template_display_order check (display_order >= 0);
alter table central_regulation_group add (display_order number(19,0));
alter table central_regulation_group add constraint ck_reg_group_display_order check (display_order >= 0);
alter table central_regulation add (display_order number(19,0));
alter table central_regulation add constraint ck_regulation_display_order check (display_order >= 0);
alter table central_regulation_requirement add (display_order number(19,0));
alter table central_regulation_requirement add constraint ck_requirement_display_order check (display_order >= 0);
alter table central_policy_group add (display_order number(19,0));
alter table central_policy_group add constraint ck_policy_group_display_order check (display_order >= 0);
alter table central_policy add (display_order number(19,0));
alter table central_policy add constraint ck_policy_display_order check (display_order >= 0);
alter table central_account_group add (display_order number(19,0));
alter table central_account_group add constraint ck_account_group_display_order check (display_order >= 0);
alter table objective add (display_order number(19,0));
alter table objective add constraint ck_objective_display_order check (display_order >= 0);
alter table control_group add (display_order number(19,0));
alter table control_group add constraint ck_global_group_display_order check (display_order >= 0);
alter table global_control add (display_order number(19,0));
alter table global_control add constraint ck_global_ctrl_display_order check (display_order >= 0);
