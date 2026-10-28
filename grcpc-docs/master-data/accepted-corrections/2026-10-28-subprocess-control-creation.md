# Process tree Controls and atomic Control creation

Project-owner request, 2026-10-28.

- The Process page projects non-deleted Control Scopes beneath their exact Subprocess. A Scope ID identifies each occurrence; the same Control can appear under multiple Subprocesses. Process/Subprocess persistence and structural leaf rules do not change.
- `GET /api/master-data/central/control-scope/process-tree` requires PROCESS and CONTROL view. It reads Scopes and endpoints in bulk and omits deleted definitions. It creates no structural nodes or tables.
- With an active Subprocess selected, the Create menu offers Control. The existing Control editor starts with no Control Group; the user must select one. Recursive Control Group Value Help displays ancestors through the root and keeps them when searching; a Group cannot select itself or a descendant as parent.
- Existing Controls are linked using the Controls tab in the existing Subprocess modal. No standalone Scope mutation endpoint is added.

## Atomic command and concurrency boundary

`POST /api/master-data/central/controls` accepts optional `initialSubprocess: { subprocessId, version }`. Without it, the existing Create contract is preserved. With it, CONTROL manage and PROCESS manage are required, and the Control Group must be supplied. The command acquires CONTROL and PROCESS, plus ACCOUNT_GROUP/RISK/REGULATION when requested by classifications/Assignments, in ascending lexical order through `TransactionalMasterDataRevisionCoordinator` before hierarchy reads or validations.

An occupied Control code is locked before Assignment endpoint locks; new Controls have no existing row to lock. The existing Control/Risk Template/Control Objective/Requirement endpoint order remains. The Subprocess row and exact occupied Scope pair are then locked under PROCESS. The internal `ProcessService.attachCreatedControl` uses MANDATORY transaction propagation and checks both Guard memberships, Subprocess version, and ordinary Scope endpoint eligibility. It reuses Scope prepare/apply without reacquiring earlier endpoint locks.

Scope validity is the inclusive intersection of the two endpoint intervals. Disjoint intervals fail the complete command. Scope frequency/execution/test recommendations remain unspecified and can be edited in the Subprocess modal. Active duplicates are rejected; occupied inactive/deleted pairs follow existing reactivation/restore rules.

The Control, touched Subprocess aggregate version, Scope, Documents, classifications/Assignments and Business Revision commit or roll back together. One CENTRAL Revision contains Control-first content, existing classification/Assignment content, then the Subprocess UPDATE and Scope content. No schema migration, Guard key, database table or configuration change is needed.

## Verification boundary

Only UI typecheck/lint and backend compile with `-Dskip.ui=true -Dmaven.test.skip=true` are authorized. Static source review verifies Guard acquisition before reads, lexical union, endpoint ordering and the shared transaction. No application, browser, Flyway, database or real concurrent transaction verification is run; compilation is not evidence of runtime concurrency correctness.
