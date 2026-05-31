# AGENTS.md - grcpc project instructions for Codex

## Scope
These instructions apply to the whole repository. More specific `AGENTS.md` files under `grcpc-app`, `grcpc-ui`, and feature folders override or extend these rules.

## Project overview
- `grcpc-app`: Spring Boot 3.5.9, Java 21, Maven, Spring MVC, Spring Security, Spring Data JPA, Flyway, MapStruct, Lombok, MinIO integration.
- `grcpc-ui`: React 19, TypeScript, Vite, SAP UI5 Web Components for React, React Router, Zustand, axios, i18next.
- Deployment files live at the repository root and under `docker/`.
- The application is a GRC product. Keep naming, UX, API contracts, and security behavior consistent across backend and frontend.

## Repository-level rules
- Prefer small, focused changes. Do not rewrite working features unless the task explicitly asks for refactoring.
- Inspect the existing feature closest to the requested change and follow its pattern before introducing a new pattern.
- Do not commit secrets, real passwords, private tokens, or local machine paths.
- Do not modify generated/build output such as `grcpc-ui/dist` unless the task explicitly requires packaging static assets.
- Keep Persian as the default user-facing language where the existing UI expects Persian.
- When adding user-facing UI text, use i18n keys instead of hardcoded text.
- When adding backend database changes, use Flyway migrations. Do not edit old migrations that may already be applied.
- Maintain backend/frontend API contract compatibility. If a DTO or endpoint changes, update the matching UI repository/model/schema in the same task.

## Useful commands
Run commands from the relevant subproject directory.

Backend:
```bash
cd grcpc-app
./mvnw -Dskip.ui=true test
./mvnw -Dskip.ui=true package
```

Frontend:
```bash
cd grcpc-ui
npm run lint
npm run build
```

Full packaged app, including UI build copied into Spring Boot static resources:
```bash
cd grcpc-app
./mvnw -Dskip.ui=false package
```

## Before finishing a task
- Mention the important files changed.
- Mention verification commands you ran, or state clearly if you could not run them.
- For risky changes, explain the migration/configuration impact.
