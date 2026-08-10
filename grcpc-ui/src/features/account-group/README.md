# Account Group Feature

Master Data V2 Account Group catalog UI.

## Route

```text
/account-groups
```

## API

```text
/api/master-data/central/account-groups
```

## UX contract

- Hierarchical page built with SAP UI5 `Tree` / `TreeItemCustom` and the same FCL interaction pattern used by the Risk feature.
- Main actions: Create, View, Delete.
- Create under the selected Account Group; with no selection create a root Account Group.
- View/Edit use a modal Object Page.
- General Information: code, title, parent, status, importance, reasonable assurance, validity range, description.
- Documents tab is active using `CENTRAL_ACCOUNT_GROUP` Parent-Save document handling.
- Risks tab is visible but disabled in this catalog-only scope.
- Parent and status are editable with the approved Move and Lifecycle commands.
- Legacy assertions, account ranges, objectives, and embedded risk data are not part of Master Data V2 Account Group runtime scope.
