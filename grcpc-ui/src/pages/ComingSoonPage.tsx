import { MessageStrip, Title } from "@ui5/webcomponents-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SECTION_KEYS: Record<string, string> = {
    "risk-management": "nav.riskManagement",
    "internal-audit": "nav.internalAudit",
    compliance: "nav.compliance",
    reports: "nav.reports",
    settings: "nav.settings",
};

export default function ComingSoonPage() {
    const { section } = useParams();
    const { t } = useTranslation();
    const key = SECTION_KEYS[section ?? ""] ?? "nav.settings";
    return <div className="page"><Title level="H2">{t(key)}</Title><MessageStrip design="Information" hideCloseButton>{t("nav.comingSoon")}</MessageStrip></div>;
}
