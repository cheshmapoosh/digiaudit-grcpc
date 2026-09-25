# AGENTS.md — Central Control V2

This file extends `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/masterdata/AGENTS.md` for the Central Control feature.

The accepted project-owner correction in `grcpc-docs/master-data/accepted-corrections/2026-08-17-central-control-design.md` is authoritative for this feature. It is a later accepted correction and therefore overrides older conflicting Control mock-up/catalog wording and the older business-table count where necessary.

## Rules

- `central_control_group` is the one approved additional business table for this correction.
- Control Group is a recursive categorization hierarchy only. No Master Data entity other than `central_control` relates directly to Control Group.
- `central_control.control_group_id` is the only direct Control Group membership relation in this slice.
- Control Group structural mutations use the `CONTROL` hierarchy Guard Row.
- Prompt 7.5 supersedes the former Control/Account Group deferral only. `central_control_account_group` is a typed classification owned by the Control aggregate Save. Prompt 7.6 adds the independent Control Objective/Account Group classification without changing Control ownership or Guard behavior. Prompt 7 relationship completion adds contextual Coverage inverse reads only; Control Save never owns Coverage mutation.
- Control Create/Update always use the `CONTROL` Guard. A Save containing Account Group classification mutations acquires `ACCOUNT_GROUP` then `CONTROL` in lexical order and retains both keys in the revision context.
- Keep Test Plan deferred: no table, FK, persisted free text, or API relation for Test Plan in this slice.
- Do not add test Input/Output fields.
- `control_relevance` is a controlled multi-value Control attribute, not a generic relation.
- A customer test schema has already been delivered. Never edit or renumber migrations through `V1170`; evolve this feature only with later Flyway migrations, beginning at `V1171`.
- Keep new schema columns compatible with previously delivered rows unless a later explicit migration decision says otherwise.
- Do not add or run tests unless a later prompt explicitly authorizes them.
