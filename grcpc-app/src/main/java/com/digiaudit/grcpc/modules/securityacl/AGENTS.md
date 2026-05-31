# AGENTS.md - backend security ACL module

## Scope
Applies to the backend `securityacl` module.

## Feature purpose
Security ACL stores resource-level access rules and business permission mappings.

## Rules
- Treat ACL changes as security-sensitive. Do not bypass authorization checks for convenience.
- Keep resource type, resource id, subject/principal, and business permission semantics explicit.
- Validate that ACL entries do not create accidental broad access.
- Use existing exceptions for forbidden/not-found/conflict cases.
- Audit sensitive ACL changes when following existing audit patterns.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- For UI contract changes, update the user/access-control UI paths as needed.
