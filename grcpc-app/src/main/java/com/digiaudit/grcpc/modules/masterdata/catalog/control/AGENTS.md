# AGENTS.md — Central Control V2

This file extends `grcpc-app/src/main/java/com/digiaudit/grcpc/modules/masterdata/AGENTS.md` for the Central Control feature.

The accepted project-owner correction in `grcpc-docs/master-data/accepted-corrections/2026-08-17-central-control-design.md` is authoritative for this feature. It is a later accepted correction and therefore overrides older conflicting Control mock-up/catalog wording and the older business-table count where necessary.

## Rules

- `central_control_group` is the one approved additional business table for this correction.
- Control Group is a recursive categorization hierarchy only. No Master Data entity other than `central_control` relates directly to Control Group.
- `central_control.control_group_id` is the only direct Control Group membership relation in this slice.
- Control Group structural mutations use the `CONTROL` hierarchy Guard Row.
- Do not implement Control/Subprocess, Control/Risk, Control/Regulation, Control/Requirement, Control/Account Group, Scope, Coverage, or any other cross-entity Control relation in this slice.
- Keep Test Plan deferred: no table, FK, persisted free text, or API relation for Test Plan in this slice.
- Do not add test Input/Output fields.
- `control_relevance` is a controlled multi-value Control attribute, not a generic relation.
- A customer test schema has already been delivered. Never edit or renumber migrations through `V1170`; evolve this feature only with later Flyway migrations, beginning at `V1171`.
- Keep new schema columns compatible with previously delivered rows unless a later explicit migration decision says otherwise.
- Do not add or run tests unless a later prompt explicitly authorizes them.
