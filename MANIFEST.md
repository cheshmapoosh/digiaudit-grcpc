# Hierarchy Guard Documentation Pack Manifest

Prepared on 2026-08-04 for `feature/master-data-v2-greenfield`.

## Decision captured

```text
Database Guard Row per independent structural hierarchy
PESSIMISTIC_WRITE before hierarchy read/validation
Single transaction through structural mutation and Business Revision
```

## Current hierarchy keys

```text
ORGANIZATION
PROCESS
```

## Existing documentation conflicts corrected

The reviewed documentation previously stated:

- no technical lock table;
- `document_temp_upload` was the only technical table;
- 46 physical tables total.

The accepted decision changes this to:

- one approved technical Guard table;
- two technical tables total;
- 47 physical tables total.

## Files

- Updated root and backend `AGENTS.md` files.
- Updated Organization and Process feature instructions.
- English ADR and Persian ADR summary.
- Binding hierarchy Guard implementation contract.
- Unified patch updates the Master Data README without replacing or truncating its existing content.
- Unified alignment patch for the implementation contract, table catalog, dependency map, API conventions, and acceptance checklist.
- Application instructions.
