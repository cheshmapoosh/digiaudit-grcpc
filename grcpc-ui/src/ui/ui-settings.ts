import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme.js";
import { setLanguage } from "@ui5/webcomponents-base/dist/config/Language.js";

export type UiTheme = "sap_horizon" | "sap_horizon_dark";
export type UiLang = "fa" | "en";
export type UiDir = "rtl" | "ltr";

export type UiSettings = {
    theme: UiTheme;
    lang: UiLang;
    dir: UiDir;
};

const UI5_FA_LOCALE = "fa-IR-u-ca-persian-nu-arabext";

export const defaultSettings: UiSettings = {
    theme: "sap_horizon_dark",
    lang: "fa",
    dir: "rtl",
};

let currentSettings: UiSettings = defaultSettings;

export function loadSettings(): UiSettings {
    return currentSettings;
}

export function saveSettings(s: UiSettings) {
    currentSettings = s;
}

export function applySettings(s: UiSettings) {
    // UI5 runtime configs
    setTheme(s.theme);
    void setLanguage(s.lang === "fa" ? UI5_FA_LOCALE : "en");
    applyUiFont()

    // Document level direction + lang
    document.documentElement.setAttribute("dir", s.dir);
    document.documentElement.setAttribute("lang", s.lang);

    // Optional: align body text direction too
    document.body.dir = s.dir;
}

export function applyUiFont() {
    const root = document.documentElement;
    root.style.setProperty(
        "--sapFontFamily",
        '"Vazirmatn", system-ui, -apple-system, "Segoe UI", Arial, sans-serif'
    );
    root.style.setProperty(
        "--sapFontHeaderFamily",
        '"Vazirmatn", system-ui, -apple-system, "Segoe UI", Arial, sans-serif'
    );
    root.style.setProperty(
        "--sapFontBoldFamily",
        '"Vazirmatn", system-ui, -apple-system, "Segoe UI", Arial, sans-serif'
    );
}
