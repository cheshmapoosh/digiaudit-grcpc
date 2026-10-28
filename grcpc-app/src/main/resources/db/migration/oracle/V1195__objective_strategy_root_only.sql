-- Strategies are root categories. Existing nested categories require an explicit
-- guarded business edit; never flatten existing data or rewrite Revision history.
alter table objective add constraint ck_objective_strategy_root
    check (objective_kind <> 'STRATEGY' or parent_objective_id is null or status = 'DELETED')
    enable novalidate;
