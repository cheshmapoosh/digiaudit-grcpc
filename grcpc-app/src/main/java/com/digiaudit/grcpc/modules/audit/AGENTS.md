# AGENTS.md - backend audit module

## Scope
Applies to the backend `audit` module.

## Feature purpose
This module records important system and security actions in `AuditLogEntity` through `AuditService`.

## Rules
- Treat audit logs as append-only business records. Do not add update/delete behavior unless explicitly requested.
- Keep audit event taxonomy aligned with `AuditEventType`, `AuditTargetType`, and `ActionResult`.
- Do not log secrets, raw passwords, tokens, or sensitive payloads.
- Prefer adding audit calls in the application service where the business action succeeds or fails, not in controllers.
- Keep audit entries useful for compliance: actor, target type/id, event type, result, and timestamps should remain clear.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app` when changing this module.
