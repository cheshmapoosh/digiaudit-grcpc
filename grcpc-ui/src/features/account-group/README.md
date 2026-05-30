# Account Group Feature

Copy this folder to:

```text
src/features/account-group
```

## Router

In `AppRouter.tsx`, import and render the routes beside the existing feature routes:

```tsx
import { accountGroupRoutes } from "@/features/account-group";

// inside <Routes>
{accountGroupRoutes}
```

## Menu

In `MainLayout.tsx`, add a side navigation item that navigates to `/account-groups`.

Suggested UI5 icon:

```text
accounting-document-verification
```

Suggested i18n key:

```text
accountGroup.menu.title
```

## Data source

The feature always uses the backend API. Local storage seed data and source
overrides are not supported.

Expected API base path:

```text
/api/account-groups
```
