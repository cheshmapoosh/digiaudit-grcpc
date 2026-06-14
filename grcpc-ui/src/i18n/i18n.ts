import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import faProcess from "../features/process/i18n/fa.process.json";
import enProcess from "../features/process/i18n/en.process.json";
import faControl from "../features/control/i18n/fa.control.json";
import enControl from "../features/control/i18n/en.control.json";
import faDocument from "../features/document/i18n/fa.document.json";
import enDocument from "../features/document/i18n/en.document.json";
import fa from "./locales/fa.json";
import en from "./locales/en.json";

export const resources = {
    fa: { translation: { ...fa, ...faProcess, ...faControl, ...faDocument } },
    en: { translation: { ...en, ...enProcess, ...enControl, ...enDocument } }
} as const;

export function initI18n(lang: "fa" | "en") {
    if (!i18n.isInitialized) {
        i18n.use(initReactI18next).init({
            resources,
            lng: lang,
            fallbackLng: "fa",
            interpolation: { escapeValue: false }
        });
    } else {
        i18n.changeLanguage(lang);
    }

    return i18n;
}

export default i18n;
