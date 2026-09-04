# Codex UI5 Prompt Template

Use this template at the beginning of UI implementation prompts.

``` text
Before implementation:

1. Read and follow:
   - grcpc-ui/AGENTS.md
   - grcpc-ui/UI5_COMPONENT_GUIDE.md

2. Use SAP UI5 Web Components React whenever an equivalent exists.

3. Do not create custom HTML/CSS UI components when UI5 provides a suitable component.

4. Follow these mappings:
   - Status -> ObjectStatus
   - Navigation -> Link
   - Row operations -> ActionSheet/Menu
   - Selection -> Checkbox/List/Table
   - Dialog -> Dialog
   - Dates -> DatePicker

5. If a custom component is required, explain the UI5 limitation first.

6. Preserve:
   - RTL behavior
   - i18n conventions
   - existing GRCPC UI patterns
```
