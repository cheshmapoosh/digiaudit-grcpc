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

const STORAGE_KEY = "grcpc.ui.settings.v1";

export const defaultSettings: UiSettings = {
    theme: "sap_horizon_dark",
    lang: "fa",
    dir: "rtl",
};

export function loadSettings(): UiSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultSettings;
        const parsed = JSON.parse(raw) as Partial<UiSettings>;

        return {
            theme: parsed.theme === "sap_horizon_dark" ? "sap_horizon_dark" : "sap_horizon",
            lang: parsed.lang === "en" ? "en" : "fa",
            dir: parsed.dir === "ltr" ? "ltr" : "rtl",
        };
    } catch {
        return defaultSettings;
    }
}

export function saveSettings(s: UiSettings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function applySettings(s: UiSettings) {
    // UI5 runtime configs
    setTheme(s.theme);
    setLanguage(s.lang);
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
