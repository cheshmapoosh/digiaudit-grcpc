# User account lifecycle

## User interface

- Users use the shared UI5 table pattern: full name, username, status.
- Roles use a UI5 table: localized title, status. Internal role codes and the
  all-languages translation section are no longer displayed. Assignment summaries
  also use localized titles without role codes.
- The role list and assignment selector use the same role repository and sorting.
  The previous five-role allowlist has been removed. Disabled roles remain visible
  with their status, but cannot be submitted or assigned by the server. The installed
  UI5 Option component has no disabled property; choosing a disabled role displays
  an explanation and disables Save.
- Root can reset a non-root user's password or enable/disable the account from its
  details. The dialog identifies the affected user and explains the effect.

## Credentials and sessions

- New usernames contain only ASCII letters and digits, with 1–100 characters.
  Creation validates the original input before normalizing it to lowercase. Existing
  usernames are not renamed by the migration.
- New passwords require at least eight characters and no more than 72 UTF-8 bytes,
  matching the configured BCrypt encoder's input limit. The UI and backend enforce
  the same rule; passwords are never written to audit details.
- Creating a user or resetting a password sets `password_change_required`.
  Authentication with that password establishes a restricted session. Until the
  user changes it, only `/api/auth/me`, `/api/auth/change-password`, and logout are
  available; other API requests receive `403 PASSWORD_CHANGE_REQUIRED`.
- The password-change endpoint rechecks the current password and requires a
  different new password. A successful change clears the flag, increments the
  credential version and ends the current session. The user then signs in with
  the new password. Direct navigation is also guarded in the UI.
- A persisted `credential_version` is copied into the authenticated principal.
  Every subsequent API request checks enabled/locked state and this version.
  Password reset/change and enabled/locked transitions invalidate old sessions,
  returning `401 SESSION_REVOKED` on their next request. Re-enabling an account
  does not revive earlier sessions. Already-admitted in-flight requests are not
  cancelled.
- Password updates and account-state changes serialize on the affected user row
  within their business transaction. Self-service password change rechecks the
  credential version after locking, so a concurrent administrative reset cannot
  be overwritten by an old session. Existing root disable/lock protections remain.
- Successful login rotates an existing session ID.

## Delivery

`V1181__user_password_lifecycle.sql` adds two columns to `app_user` on Oracle.
Existing accounts default to no forced password change and version zero. New
accounts and future administrative resets enter the required-change flow.
Existing passwords and assignments are preserved. Deploy the backend and UI
together for the new `passwordChangeRequired` authentication response field.

No Master Data structural hierarchy, hierarchy guard, business revision, or
delegation policy is changed by this work.

Main implementation files:

- `UsersListReport.tsx`, `RolesListReport.tsx`, `RoleObjectPage.tsx` and
  `AssignGlobalRoleDialog.tsx`: tables, localized titles and the shared role catalog.
- `UserSecurityDialog.tsx`, `UserManagementService.java`: administrative actions.
- `ChangePasswordPage.tsx`, `PasswordService.java`, `AccountSessionFilter.java`:
  required password change and session revocation.

Verification commands completed successfully:

- Backend: `mvnw.cmd -Dskip.ui=true -Dmaven.test.skip=true package`.
- UI: `npm run build -- --outDir ../.codex-build/user-security-ui` (includes
  TypeScript checking), and `npm run lint`.
- `git -c core.safecrlf=false diff --check`.

The UI build emits a bundle-size advisory. Generated `grcpc-ui/dist` files were
not changed. The backend package contains the pre-existing static UI because its
UI build was skipped; the separate UI build is verification, not deployment.

An isolated schema in the existing development Oracle 23.26 container successfully
applied all 42 migrations through V1181. Hibernate schema validation, repository
query initialization, and complete Spring Boot/Tomcat startup succeeded using
Java 21 in a temporary container with MinIO disabled. The existing application
schema was not modified. Oracle 19c and populated-schema upgrade behavior were
not exercised. Startup evidence is in the ignored build-output directory.

## Manual acceptance scenarios

1. As root, compare the role list with the assignment selector, including disabled
   roles. Confirm title-only role display and the requested table columns.
2. Try usernames with Persian letters, whitespace, `/`, `#`, and `@`; creation
   must fail in both the UI and a direct API request. ASCII letters/digits succeed.
3. Create a user, assign a role, and sign in with the initial password. Confirm
   navigation and direct business API calls remain blocked until password change.
   Wrong current passwords, reused passwords, mismatched confirmation and invalid
   password lengths must not complete the flow.
4. Change the password, sign in again, and confirm normal authorized access.
5. Reset that password as root while an earlier session exists. The old session
   must fail on its next request; the reset password must again require change.
6. Disable the account. Both a fresh login and an existing session must fail.
   Re-enable it and confirm only a fresh login resumes access.
7. Confirm non-root users cannot reset another user's password or change account
   status, and that root cannot be disabled or locked.

Automated tests are prohibited by the repository's current delivery instructions;
none were created, modified, or run. The scenarios above are a manual acceptance
checklist, not a claim that browser or concurrency verification was performed.
