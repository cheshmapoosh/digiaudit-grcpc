# AGENTS.md - backend auth module

## Scope
Applies to the backend `auth` module.

## Feature purpose
This module exposes authentication-related API behavior such as `/api/auth/me`. Most login/security mechanics are configured in `common/security`.

## Rules
- Keep controllers thin and delegate identity resolution to the security layer or application services.
- Do not duplicate authentication logic already handled by Spring Security or `SecurityConfig`.
- Never log credentials, session identifiers, remember-me values, or tokens.
- Keep response DTOs minimal and safe for the browser.
- If changing login/session behavior, inspect `common/security` and the UI `auth` feature in the same task.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- For contract changes, also run `npm run build` from `grcpc-ui`.
