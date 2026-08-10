import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import faProcess from "../features/process/i18n/fa.process.json";
import enProcess from "../features/process/i18n/en.process.json";
import faDocument from "../features/document/i18n/fa.document.json";
import enDocument from "../features/document/i18n/en.document.json";
import faOrganization from "../features/organization/i18n/fa.organization.json";
import enOrganization from "../features/organization/i18n/en.organization.json";
import faControl from "../features/control/i18n/fa.control.json";
import enControl from "../features/control/i18n/en.control.json";
import faControlObjective from "../features/control-objective/i18n/fa.control-objective.json";
import enControlObjective from "../features/control-objective/i18n/en.control-objective.json";
import faRisk from "../features/risk/i18n/fa.risk.json";
import enRisk from "../features/risk/i18n/en.risk.json";
import faAccountGroup from "../features/account-group/i18n/fa.account-group.json";
import enAccountGroup from "../features/account-group/i18n/en.account-group.json";
import faCentralCatalog from "../features/central-catalog/i18n/fa.central-catalog.json";
import enCentralCatalog from "../features/central-catalog/i18n/en.central-catalog.json";
import faMasterData from "../features/master-data/i18n/fa.master-data.json";
import enMasterData from "../features/master-data/i18n/en.master-data.json";
import fa from "./locales/fa.json";
import en from "./locales/en.json";

export const resources = {
    fa: { translation: { ...fa, ...faProcess, ...faDocument, ...faOrganization, ...faControl, ...faControlObjective, ...faRisk, ...faAccountGroup, ...faCentralCatalog, ...faMasterData } },
    en: { translation: { ...en, ...enProcess, ...enDocument, ...enOrganization, ...enControl, ...enControlObjective, ...enRisk, ...enAccountGroup, ...enCentralCatalog, ...enMasterData } }
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
