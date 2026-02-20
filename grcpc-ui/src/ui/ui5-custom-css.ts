import { addCustomCSS } from "@ui5/webcomponents-base/dist/theming/CustomStyle.js";

const FONT =
    '"Vazirmatn", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

const FONT_CSS = `
  :host, :host * {
    font-family: ${FONT} !important;
  }
`;

// Apply font to UI5 components (Shadow DOM safe)
const UI5_TAGS = [
    // Layout / Shell
    "ui5-shellbar",
    "ui5-shellbar-item",

    // Navigation
    "ui5-side-navigation",
    "ui5-side-navigation-item",
    "ui5-side-navigation-sub-item",

    // Containers
    "ui5-page",
    "ui5-card",
    "ui5-panel",
    "ui5-dialog",
    "ui5-popover",
    "ui5-responsive-popover",

    // Actions / Inputs
    "ui5-button",
    "ui5-toggle-button",
    "ui5-input",
    "ui5-textarea",
    "ui5-select",
    "ui5-option",
    "ui5-checkbox",
    "ui5-radio-button",
    "ui5-switch",

    // Lists / Tables
    "ui5-list",
    "ui5-li",
    "ui5-table",
    "ui5-table-row",
    "ui5-table-cell",

    // Text / Labels
    "ui5-title",
    "ui5-label",
    "ui5-text",
    "ui5-link",

    // Misc
    "ui5-breadcrumbs",
    "ui5-busy-indicator",
    "ui5-message-strip",
    "ui5-toast"
];

for (const tag of UI5_TAGS) {
    addCustomCSS(tag, FONT_CSS);
}

// UI5 ListItem focus ring tweaks (optional)
addCustomCSS(
    "ui5-li",
    `
  :host(:focus),
  :host([focused]) {
    outline: none !important;
    box-shadow: none !important;
  }
`
);
