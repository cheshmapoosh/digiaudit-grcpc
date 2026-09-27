import { Button, Icon } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "./dashboard-hero.css";

const sections = [
    { key: "nav.governance", icon: "building", path: "/master-data" },
    { key: "nav.riskManagement", icon: "alert", path: "/coming-soon/risk-management" },
    { key: "nav.internalAudit", icon: "search", path: "/coming-soon/internal-audit" },
    { key: "nav.compliance", icon: "shield", path: "/coming-soon/compliance" },
] as const;

export default function DashboardHero() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isFa = i18n.language.startsWith("fa");
    const date = new Intl.DateTimeFormat(isFa ? "fa-IR-u-ca-persian" : "en-US", {
        year: "numeric", month: "long", day: "numeric",
    }).format(new Date());

    return (
        <div className="dashboardHeroRow">
            <section className={`dashboardHero ${isFa ? "dashboardHero--fa" : "dashboardHero--en"}`} aria-label={t("dashboard.hero.sectionLabel")}>
                <div className="dashboardHeroCopy" dir={isFa ? "rtl" : "ltr"}>
                    <h1>{t("dashboard.hero.welcome")}</h1>
                    <p className="dashboardHeroSubtitle">{t("dashboard.hero.subtitle")}</p>
                    <p className="dashboardHeroDescription">{t("dashboard.hero.description")}</p>
                </div>
                <img className="dashboardHeroArt" src="/images/digi-audit-dashboard-shield.png" alt="" aria-hidden="true" />
                <nav className="dashboardHeroNav" aria-label={t("dashboard.hero.navigationLabel")} dir={isFa ? "rtl" : "ltr"}>
                    {sections.map((section) => (
                        <Button
                            key={section.key}
                            className="dashboardHeroNavButton"
                            design="Transparent"
                            icon={section.icon}
                            onClick={() => navigate(section.path)}
                        >
                            {t(section.key)}
                        </Button>
                    ))}
                </nav>
            </section>
            <aside className="dashboardToday" dir={isFa ? "rtl" : "ltr"}>
                <Icon name="calendar" accessibleName={t("dashboard.hero.today")} />
                <div><span>{t("dashboard.hero.today")}</span><strong>{date}</strong></div>
            </aside>
        </div>
    );
}
