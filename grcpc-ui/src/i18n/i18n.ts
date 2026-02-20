import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import fa from "./locales/fa.json";
import en from "./locales/en.json";

export const resources = {
    fa: { translation: fa },
    en: { translation: en }
} as const;

export function initI18n(lang: "fa" | "en") {
    if (!i18n.isInitialized) {
        i18n.use(initReactI18next).init({
            resources,
            lng: lang,
            fallbackLng: "en",
            interpolation: { escapeValue: false }
        });
    } else {
        i18n.changeLanguage(lang);
    }

    return i18n;
}

export default i18n;
