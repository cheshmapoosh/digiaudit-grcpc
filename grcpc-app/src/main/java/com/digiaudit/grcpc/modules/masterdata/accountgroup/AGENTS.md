# AGENTS.md - backend account group master data

## Scope
Applies to the backend account group feature under `modules/masterdata/accountgroup`.

## Feature purpose
Account groups are hierarchical master data nodes that can include assertions, linked objectives, account ranges, and risk references.

## Rules
- Preserve tree behavior using `parentId`; prevent invalid parent references and cycles.
- Keep account group code/title/status validation consistent with other master data features.
- Store structured lists through the existing value/converter pattern; do not replace them with untyped JSON strings.
- Keep API base path `/api/account-groups` aligned with the UI repository.
- Keep delete behavior safe: validate children and dependent references before removal.
- Prompt 7.5 and Prompt 7.6 add independent typed Control and Control Objective classifications to one exact Account Group node. Account Group is inverse-read-only for both relations and never owns their mutations. Parent and leaf nodes are eligible; selection never propagates through the hierarchy.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If DTOs change, update `grcpc-ui/src/features/account-group`.
