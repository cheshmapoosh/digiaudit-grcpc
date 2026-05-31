# AGENTS.md - backend user management module

## Scope
Applies to the backend `usermanagement` module.

## Feature purpose
User management handles users, roles, permissions, business permissions, and delegation policies.

## Rules
- Keep role/permission/business-permission i18n behavior intact. User-facing titles/descriptions should not be language-neutral only when translations are expected.
- Do not expose password hashes or sensitive user fields through DTOs.
- Hash passwords through the configured password encoder.
- Keep role assignment and permission assignment operations explicit and auditable.
- Be careful with root/admin capabilities; do not accidentally grant broad permissions by default.
- Keep endpoint paths under `/api/usermanagement/**` aligned with UI repositories.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If DTOs change, update `grcpc-ui/src/features/usermanagement`.
