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
