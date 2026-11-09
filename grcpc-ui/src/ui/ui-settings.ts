import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme.js";
import { setLanguage } from "@ui5/webcomponents-base/dist/config/Language.js";

export type UiLang = "fa" | "en";
export type UiDir = "rtl" | "ltr";

export type UiSettings = {
    lang: UiLang;
    dir: UiDir;
};

const UI_SETTINGS_STORAGE_KEY = "grcpc.ui.settings";
const UI5_FA_LOCALE = "fa-IR-u-ca-persian-nu-arabext";
const UI_FONT_FAMILY = '"Vazirmatn", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
const UI_HEADING_FONT_FAMILY = `"Vazirmatn Heading", ${UI_FONT_FAMILY}`;
const UI_FONT_TOKENS = [
    "--sapFontFamily",
    "--sapFontLightFamily",
    "--sapFontBoldFamily",
    "--sapFontSemiboldFamily",
    "--sapFontSemiboldDuplexFamily",
    "--sapFontBlackFamily",
    "--sapButton_FontFamily",
    "--sapButton_Emphasized_FontFamily",
    "--sapShell_FontFamily",
] as const;
const UI_HEADING_FONT_TOKENS = ["--sapFontHeaderFamily", "--sapObjectHeader_Title_FontFamily", "--sapShell_FontHeaderFamily"] as const;

export const defaultSettings: UiSettings = {
    lang: "fa",
    dir: "rtl",
};

let currentSettings: UiSettings = defaultSettings;

function isUiLang(value: unknown): value is UiLang {
    return value === "fa" || value === "en";
}

function isUiDir(value: unknown): value is UiDir {
    return value === "rtl" || value === "ltr";
}

function canUseLocalStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeSettings(value: unknown): UiSettings {
    if (!value || typeof value !== "object") {
        return defaultSettings;
    }

    const partial = value as Partial<Record<keyof UiSettings, unknown>>;

    return {
        lang: isUiLang(partial.lang) ? partial.lang : defaultSettings.lang,
        dir: isUiDir(partial.dir) ? partial.dir : defaultSettings.dir,
    };
}

export function loadSettings(): UiSettings {
    if (!canUseLocalStorage()) {
        return currentSettings;
    }

    try {
        const raw = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
        if (!raw) {
            currentSettings = defaultSettings;
            return currentSettings;
        }

        currentSettings = normalizeSettings(JSON.parse(raw));
        return currentSettings;
    } catch {
        currentSettings = defaultSettings;
        return currentSettings;
    }
}

export function saveSettings(settings: UiSettings) {
    currentSettings = normalizeSettings(settings);

    if (!canUseLocalStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(
            UI_SETTINGS_STORAGE_KEY,
            JSON.stringify(currentSettings),
        );
    } catch {
        // Settings persistence must never break the application startup or menu actions.
    }
}

export function applySettings(settings: UiSettings) {
    const normalizedSettings = normalizeSettings(settings);

    currentSettings = normalizedSettings;

    // UI5 runtime configs
    void setTheme("sap_fiori_3");
    void setLanguage(normalizedSettings.lang === "fa" ? UI5_FA_LOCALE : "en");
    // Typography is the sole authorized customization of the standard theme.
    for (const token of UI_FONT_TOKENS) {
        document.documentElement.style.setProperty(token, UI_FONT_FAMILY);
    }
    for (const token of UI_HEADING_FONT_TOKENS) {
        document.documentElement.style.setProperty(token, UI_HEADING_FONT_FAMILY);
    }

    // Document level direction + lang
    document.documentElement.setAttribute("dir", normalizedSettings.dir);
    document.documentElement.setAttribute("lang", normalizedSettings.lang);

    // Optional: align body text direction too
    document.body.dir = normalizedSettings.dir;
}
