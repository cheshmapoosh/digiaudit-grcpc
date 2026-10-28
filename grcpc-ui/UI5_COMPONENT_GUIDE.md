# UI5_COMPONENT_GUIDE.md

# GRCPC UI5 Component Guide

## Purpose

This document is the UI5 implementation reference for `grcpc-ui`. It
defines which SAP UI5 Web Components React components should be used for
common GRCPC UI scenarios.

The goal is to keep the UI consistent, accessible, RTL compatible, and
aligned with SAP UI5 patterns.

------------------------------------------------------------------------

# Core Rule: UI5 First

Before implementing any UI element:

1.  Check whether a SAP UI5 Web Component React equivalent exists.
2.  If it exists, use the UI5 component.
3.  Do not create custom HTML/CSS components as replacements.

A custom implementation is allowed only when: - UI5 has no suitable
component, or - there is a documented limitation.

## Form density

- `index.html` enables the native UI5 Compact density on the document root
  with `data-ui5-compact-size`. Application forms and portals inherit it.
- `AppRouterRoot` owns native density on both html and body: login uses UI5's
  default Cozy density; setup and all authenticated pages use Compact. This
  also covers trees, tables, dialog top layers and React portals. PublicAuthLayout
  only controls the auth page layout; language/theme settings preserve density.
- Let UI5 determine input and action heights. Do not override them with CSS.
- Use `Form` / `FormItem` and `itemSpacing="Normal"` for label/field layout
  instead of custom field heights, margins or gaps.
- Page content uses the public `sapContent_Space_Small` theme token and list
  sections use `sapContent_Space_Tiny`. Avoid repeating padding in FCL slots,
  their inner frames and tree/list bodies. Keep native Bar spacing and button
  widths instead of extra action wrappers, fixed widths or per-button margins.
- In the user editor, full-span native FormGroups keep First/Last Name together
  and Password/Confirm Password together in two columns, falling back to one
  on small screens. Confirm Password is client-side only and gates Create Save.
  Profile-admin access uses one native MultiComboBox containing all available
  profiles, with controlled selected items and the native select-all action.

## Application theme

- Use standard Horizon (`sap_horizon`), with the standard Horizon Dark
  (`sap_horizon_dark`) option. Previously saved Quartz settings fall back to Horizon.
- The authorized exception is the existing Vazirmatn font, loaded from local
  font assets and applied through UI5's public font-family theme tokens.
  Do not replace icon fonts or add shadow-DOM CSS for typography.
- Keep native UI5 component colors, font sizes and weights, borders, radii, shadows and
  focus indicators. Do not override theme tokens, shadow parts or component
  styles through CSS, inline styles or `addCustomCSS`, except for the font-family
  tokens above, the requested menu icon alignment, and the profile identity colors below.
- CSS may arrange page layouts and branding images; it must not reskin UI5 controls.
- Do not show placeholder text. Keep field labels and accessible search names.
  The shared date picker uses a blank placeholder to suppress UI5's automatic format hint.

## Create menus

- Use native UI5 `Button`, `Menu` and `MenuItem`. The whole create button opens
  the menu; no implicit default creation action is assigned.
- Create-menu React wrappers forward `slot` to their native Button so Bar
  can arrange all header actions in its endContent slot without custom wrappers.
- Use `endIcon="slim-arrow-down"` and `className="createMenuButton"` for these
  buttons. The requested trailing icon belongs at the left edge in RTL and
  the right edge in LTR, within the button's standard theme padding.
- UI5 2.18 uses a physical `margin-left: auto` on this icon. The shared
  `create-menu-button.css` corrects only the public `endIcon` part's inline
  margins. This layout exception does not change theme styling or control sizes.

## Application shell and reference branding

- `MainLayout` uses `NavigationLayout`, with `ShellBar` in its header and
  `SideNavigation` as its direct side content. Let `NavigationLayout` own
  navigation sizing and device behavior; do not add a parallel fixed-width CSS shell.
- Use ShellBar's native profile Avatar and `profile-click` opener for `UserMenu`.
  Its selected `UserMenuAccount` owns the centered identity header and its built-in
  sign-out action owns the footer. Do not add Profile, Preferences or account
  switching entries. Dataset selection is a separate control in ShellBar's content slot.
- Put UI settings in `UserMenu`, opening native `UserSettingsDialog` with
  `UserSettingsItem` and `UserSettingsView`. Do not add a separate settings action
  to ShellBar. Preserve immediate theme/language/direction persistence.
- Render native Compact `Breadcrumbs` directly in the page content above the
  routed page/title. Do not add a separate Bar, header strip, background or fixed height.
- Put Roles under User Management at `/access-control/roles`. Profile Management
  is a direct navigation item at `/profiles`; do not add a Settings navigation group.
  Legacy `/settings/roles` and `/settings/profiles` URLs redirect to these pages.
- Users and Profiles use full-width native Tables and separate native Dialogs
  for details. Roles currently has no detail modal. Do not add a side detail pane.
  Users and Profiles use TableSelectionSingle with behavior="RowOnly", hiding
  the radio selector column through the public UI5 API. A row click only selects
  the action target; the header View button opens its detail dialog. Do not bind
  row-click navigation: UI5 suppresses that event in RowOnly mode. Roles remains
  a selectable list without a detail modal or a radio selector column.
  User lifecycle/password actions use the selected UserSummary, without a detail
  fetch on row selection. Load UserDetail when its view dialog opens. Match server
  permissions: profile admins manage ordinary users; root can reset any managed
  user's password, including root. Root cannot be disabled.
  The Users/Profile detail footer contains only Edit and Close;
  omit manual Refresh actions and the deleted-profile filter.
  List search is the first header action, before Create, revealing
  native Search inside a Popover on demand. HeaderSearch forwards its slot;
  do not add a standalone search input or ShellBar search/navigation logic.
  Compact editors use native Form/FormItem spacing and retain draft protection.
- `ProfileSelector` forwards its `slot` to the outer UI5 FlexBox in ShellBar.
  Put the colored Avatar and profile name in one native active ListItemCustom
  inside a List. The whole item opens the choices, with one keyboard focus target.
  Keep its native hover/focus styling; do not add nested buttons or an interactive
  Avatar inside it. Do not add a separate color marker or field label.
  Decorative content inside active profile/symbol items passes pointer events to
  the native list item, so Text does not replace its pointer cursor with a caret.
  Use Popover/List/ListItemCustom with profile names for selection.
- `ProfileAvatar` uses the selected profile's explicit color as its background
  and computes a contrasting foreground. This requested identity color is local
  to dataset avatars/markers, not a global theme override. Keep native avatar
  sizing, shape, borders and focus styling. Render its stored UI5 icon and use
  the building icon as the default for missing or invalid legacy metadata.
- The profile editor uses native ColorPalette with 20 named colors and a native
  Popover/List with 20 organizational UI5 icons. The Avatar itself opens the
  symbol choices; do not add a separate Choose Symbol button. Show the selected
  color name opposite its label. Use single-line Input for Description beside
  Name, and title the existing profile editor "Profile". Translate Avatar as "نشان پروفایل".
  Portal the symbol Popover to body rather than mounting it in FormItem content.
  Give the avatar field layout padding for its native focus/hover outline, and
  prevent Avatar flex shrinking. Do not resize or reskin its native parts.
  Persist stable color and icon names as text with the existing versioned Save.
  V1193 adds color_name/icon_name and backfills existing profiles. V1194 removes
  avatar_data_url and the redundant hexadecimal color column; API/entity identity
  contains only the two named codes. Do not display profile audit/version fields.
- Use DialogFooterBar in the native Dialog footer slot. Nested ObjectPages use
  DialogFooter to portal their locally owned actions into that same native slot.
  Center the actions in Bar's default slot so they remain visible while content
  scrolls. Do not put action footers inside scrollable content or use CSS sticky.
- Management detail/editor dialogs share the catalog width (90vw). Users,
  Profiles and short catalog/group forms use two columns; larger forms use
  three columns on wide screens and two on medium screens. Collapse to one
  column on small screens. Keep validity date pairs in the same row as a group.
  Conditionally mounted management detail/profile editor dialogs start closed;
  use useDialogOpenAfterRender to wait for UI5 renderFinished before opening,
  so native Dialog centering uses the fully rendered content. Do not add manual
  coordinates or transform-based centering. Profile detail waits for initial
  data before mounting its dialog.
- Catalog View mode uses native Text for field values and ObjectStatus for
  lifecycle status. Mount editors only after Edit, preserving the same draft,
  validity and aggregate Save behavior. Independently saved Local rows start
  in View and expose their own permission-checked Edit action.
- The governance hub uses a simple Title without a hero avatar or repeated
  introductory copy or a Back button. Card descriptions belong in native Text in the Card body:
  CardHeader in UI5 2.18 limits subtitle lines and has no public wrapping option.
  Do not override its shadow styles or fix card heights to force wrapping.
  Equalize the launcher rows with grid-auto-rows: 1fr and stretch each Card to
  its cell height, letting the longest content determine the shared height.
  The full Card navigates on click; keep its interactive CardHeader for native
  keyboard access. Do not add a separate arrow/footer action strip.
  Decorative Card body content passes pointer events to the Card so native Text
  does not show a text caret or intercept the full-card navigation area.
  Account Groups uses the accounting-document-verification icon.
- Initialize one authorized profile before authenticated business pages mount.
  Preserve the active scope per tab in sessionStorage, and remember the last
  selection per user in localStorage for later logins. An invalid remembered ID
  falls back to the first authorized profile; no authorized profile means no data access.
- Live profile changes still pass the unsaved-changes router guard and a full
  navigation to discard the previous scope's client stores.
- Catalog breadcrumbs follow Home / Governance and Control / Catalog, including
  nested catalog URLs. Parent items navigate through the SPA router; the final
  item is the current page. Do not derive this hierarchy from flat URL segments.
- Login and setup share `PublicAuthLayout`, using native `Card` and `Grid`.
  Setup uses the compact variant and retains its four native form groups.
- Login inputs explicitly request the enclosing HTML form's submission on Enter:
  UI5 2.18 only submits implicitly for a single Input. Keep the shared submit
  validation, prevent concurrent requests, and ignore composition/repeat Enter
  and key events from the nested password-visibility button.
- The three `digi-grc-reference-*` images were extracted from the user-provided
  HTML reference. They are branding assets, not replacements for UI5 controls.

------------------------------------------------------------------------

# Component Decision Matrix

  -----------------------------------------------------------------------
  Business Need           UI5 Component           GRCPC Usage
  ----------------------- ----------------------- -----------------------
  Business status         ObjectStatus            Organization, Process,
                                                  Control, Regulation
                                                  status

  Semantic label          Tag                     Categories and small
                                                  semantic labels

  Read-only navigation    Link                    Open object view modal

  Row operations          ActionSheet / Menu      Edit, Delete, Activate,
                                                  Deactivate, Restore

  Primary actions         Button                  Save, Cancel, Confirm

  Text input              Input                   Forms

  Selection               Select / MultiComboBox  Master data selection
                          / Checkbox              

  Data collection         Table / List            Master data lists

  Grouped selection list  List + List Item Group  Control selection by
                                                  group

  Modal                   Dialog                  View/Edit dialogs

  Confirmation            Dialog pattern          Destructive actions

  Date input              DatePicker              Validity dates

  Layout                  FlexBox / Grid /        Responsive layouts
                          Toolbar                 
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# GRCPC Mandatory Patterns

## Status

Use ObjectStatus.

Examples: - فعال - غیرفعال - پیش نویس - تایید شده

Do not use: - colored span - custom badge - CSS status indicator

------------------------------------------------------------------------

## Navigation

Use UI5 Link.

Examples: - Control name in Subprocess Control Scope table -
Organization reference

Do not use: - clickable text with onClick - custom anchor components

------------------------------------------------------------------------

## Row Actions

Use ActionSheet or Menu.

Examples: - Edit - Delete - Activate - Deactivate - Restore

Do not place many action buttons in every row.

------------------------------------------------------------------------

## Selection

Use UI5 selection components.

Examples: - Control selection dialog - Organization selection

Preferred: - List - Checkbox - MultiComboBox

Do not create custom checkbox lists.

------------------------------------------------------------------------

# Master Data Examples

## Central Subprocess - Control Scope

Required components:

-   Control name: Link
-   Status: ObjectStatus
-   Operations: ActionSheet
-   Selection dialog: List + Checkbox + List Item Group
-   Validity dates: DatePicker

------------------------------------------------------------------------

## Object Page / FCL

Use existing project patterns:

-   Flexible Column Layout
-   Object Page patterns
-   Existing Organization/Process implementation

Do not introduce new page architecture.

------------------------------------------------------------------------

# RTL and i18n Rules

Always:

-   support Persian RTL
-   use existing i18n resources
-   avoid hardcoded user-facing text

------------------------------------------------------------------------

# UI Review Checklist

Before completing UI work verify:

-   UI5 component exists and is used where applicable.
-   No custom replacement exists for UI5 components.
-   Status uses semantic UI5 state.
-   Actions use UI5 action patterns.
-   Links use UI5 Link.
-   RTL is preserved.
-   Accessibility comes from UI5 components.
