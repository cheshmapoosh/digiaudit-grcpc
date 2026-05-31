import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import faProcess from "../features/process/i18n/fa.process.json";
import enProcess from "../features/process/i18n/en.process.json";
import fa from "./locales/fa.json";
import en from "./locales/en.json";

const faProcessTranslation = {
    process: {
        controls: faProcess.process.controls
    }
};

const enProcessTranslation = {
    process: {
        controls: enProcess.process.controls
    }
};

export const resources = {
    fa: { translation: { ...fa, ...faProcessTranslation } },
    en: { translation: { ...en, ...enProcessTranslation } }
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
