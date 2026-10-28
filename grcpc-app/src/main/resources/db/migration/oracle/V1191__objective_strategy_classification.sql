-- Strategy categories and objectives share the existing profile-scoped hierarchy.
-- Preserve the meaning of existing objectives; classification is an explicit business edit.
alter table objective add (
    objective_kind varchar2(32 byte) default 'OBJECTIVE' not null
);

alter table objective add constraint ck_objective_kind
    check (objective_kind in ('STRATEGY', 'OBJECTIVE'));

-- Existing unclassified objectives remain readable. New/updated objectives require a parent.
-- Application commands also require that parent to be a strategy in the same profile.
alter table objective add constraint ck_objective_strategy_parent
    check (objective_kind = 'STRATEGY' or parent_objective_id is not null or status = 'DELETED')
    enable novalidate;
