# AGENTS.md - backend setup module

## Scope
Applies to the backend `setup` module.

## Feature purpose
Setup initializes the system and creates the first root administrator when the application is not initialized.

## Rules
- Initialization must be safe and idempotent: once setup is complete, do not allow creating another root through setup endpoints.
- Do not hardcode root credentials or seed real passwords in migrations.
- Hash passwords through the configured password encoder.
- Keep `/api/setup/status` and `/api/setup/initialize` compatible with the UI setup flow.
- Audit initialization when following existing audit patterns.

## Verification
- Run `./mvnw -Dskip.ui=true test` from `grcpc-app`.
- If setup responses change, update `grcpc-ui/src/features/setup`.
