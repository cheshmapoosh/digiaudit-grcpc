import React from "react";



import ReactDOM from "react-dom/client";

import { ThemeProvider } from "@ui5/webcomponents-react";

// UI5 Assets
import "@ui5/webcomponents/dist/Assets.js";
import "@ui5/webcomponents-fiori/dist/Assets.js";

// (اختیاری) All icons
import "@ui5/webcomponents-icons/dist/AllIcons.js";
import "@ui5/webcomponents-icons-tnt/dist/AllIcons.js";
import "@ui5/webcomponents-icons-business-suite/dist/AllIcons.js";

import "./index.css";
import "./ui/ui5-custom-css";


import App from "./app/App";
import { applySettings, loadSettings } from "./ui/ui-settings";
import { initI18n } from "./i18n/i18n";

// 1) load settings
const settings = loadSettings();

// 2) apply UI5 theme/dir/lang
applySettings(settings);

// 3) init resource bundle language
initI18n(settings.lang);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </React.StrictMode>
);
