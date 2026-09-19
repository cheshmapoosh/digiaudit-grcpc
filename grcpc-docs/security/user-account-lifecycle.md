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
  details. Reactivation requires a new temporary password and its confirmation.
  The dialog identifies the affected user and explains the effect.
- The personal user menu includes Change username and Change password for every
  authenticated user, including root. Both require the current password. Voluntary
  changes can be cancelled by returning to the application; mandatory password
  change cannot be skipped.

## Credentials and sessions

- New usernames contain only ASCII letters and digits, with 1–100 characters.
  Creation validates the original input before normalizing it to lowercase. Existing
  usernames are not renamed by the migration.
- New passwords require at least eight characters and no more than 72 UTF-8 bytes,
  matching the configured BCrypt encoder's input limit. The UI and backend enforce
  the same rule; passwords are never written to audit details.
- Creating a user, resetting a password, or reactivating an account sets `password_change_required`.
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
- Reactivation atomically replaces the password, enables the account, marks the
  password as temporary, and increments the credential version while holding the
  user-row lock. The supplied password must differ from the old password. An already
  enabled account is rejected. Generic user update cannot change a disabled account
  to enabled; it returns `REACTIVATION_PASSWORD_REQUIRED` instead.
- Username changes validate the original input with the same policy as account
  creation, normalize to lowercase, and require an unused name. The current user
  is selected from the authenticated principal, never a submitted user ID. The
  database unique constraint also rejects concurrent claims to the same name.
  Changing username increments the credential version and ends the current session;
  sign in again using the new name and existing password. User ID, assigned roles
  and root status are preserved. A temporary password must be changed first.

## Delivery

`V1181__user_password_lifecycle.sql` adds two columns to `app_user` on Oracle.
Existing accounts default to no forced password change and version zero. New
accounts and future administrative resets enter the required-change flow.
Existing passwords and assignments are preserved. Deploy the backend and UI
together for the new `passwordChangeRequired` authentication response field.

The reactivation and personal-menu update requires no additional migration beyond
V1181. Deploy its backend and UI together: `PATCH /api/usermanagement/users/{id}/enable`
now requires a JSON body containing `password`; the former empty-body request is
rejected. `POST /api/auth/change-username` accepts `currentPassword` and `newUsername`.

No Master Data structural hierarchy, hierarchy guard, business revision, or
delegation policy is changed by this work.

Main implementation files:

- `UsersListReport.tsx`, `RolesListReport.tsx`, `RoleObjectPage.tsx` and
  `AssignGlobalRoleDialog.tsx`: tables, localized titles and the shared role catalog.
- `UserSecurityDialog.tsx`, `UserManagementService.java`: administrative actions.
- `ChangePasswordPage.tsx`, `PasswordService.java`, `AccountSessionFilter.java`:
  required password change and session revocation.
- `UserProfileMenu.tsx`, `ChangeUsernamePage.tsx`, `UsernameService.java`, and
  `UsernamePolicy.java`: personal credentials menu and username updates.

Verification commands completed successfully:

- Backend: `mvnw.cmd -Dskip.ui=true -Dmaven.test.skip=true package`.
- UI: `npm run build -- --outDir ../.codex-build/user-security-ui` (includes
  TypeScript checking), and `npm run lint`.
- `git -c core.safecrlf=false diff --check`.

The UI build emits a bundle-size advisory. Generated `grcpc-ui/dist` files were
not changed. The backend package contains the pre-existing static UI because its
UI build was skipped; the separate UI build is verification, not deployment.

For the initial V1181 implementation, an isolated schema in the existing development Oracle 23.26 container successfully
applied all 42 migrations through V1181. Hibernate schema validation, repository
query initialization, and complete Spring Boot/Tomcat startup succeeded using
Java 21 in a temporary container with MinIO disabled. The existing application
schema was not modified. Oracle 19c and populated-schema upgrade behavior were
not exercised. Startup evidence is in the ignored build-output directory.

The subsequent reactivation and personal-menu update was verified by backend
packaging with tests skipped, UI lint and a production UI build (including typecheck)
to a temporary directory outside the repository. Its interactive flows and concurrent
username claims have not been exercised against a running server.

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
   Reactivation without a password, with the old password, or through generic
   user update must fail. Reactivate with a new temporary password, sign in, and
   confirm mandatory password change before resuming access.
7. Confirm non-root users cannot reset another user's password or change account
   status, and that root cannot be disabled or locked.
8. From the personal menu, change the username using the current password. Invalid
   names, occupied names and incorrect passwords must fail without changing the
   account. After success, the old name and old sessions must no longer work; the
   new name must retain the same roles. Repeat for root and an ordinary user.
9. Change the password voluntarily from the menu. Confirm current-password and
   confirmation checks, session revocation and login with the new password.

Automated tests are prohibited by the repository's current delivery instructions;
none were created, modified, or run. The scenarios above are a manual acceptance
checklist, not a claim that browser or concurrency verification was performed.
