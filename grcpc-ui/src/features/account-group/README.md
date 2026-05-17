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

By default the feature uses localStorage seed data.
Use one project-wide setting for all CRUD features:

```env
VITE_GRCPC_DATA_SOURCE=api
```

Optional override only for this feature:

```env
VITE_GRCPC_ACCOUNT_GROUP_SOURCE=api
```

Expected API base path:

```text
/api/account-groups
```
