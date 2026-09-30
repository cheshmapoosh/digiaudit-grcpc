import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Card, CardHeader, Icon } from "@ui5/webcomponents-react";
import { useAuthState } from "@/features/auth/state/auth.state";
import { areaForPath, canAccessMasterData } from "../security/masterDataAccess";
import "./master-data.css";

type MasterDataItem = {
    key: string;
    icon: string;
    iconTone: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    route: string;
    access?: "users";
};

// The order follows the RTL launcher in the supplied governance layout.
const MASTER_DATA_ITEMS: MasterDataItem[] = [
    { key: "organizations", icon: "org-chart", iconTone: 6, route: "/organizations" },
    { key: "processes", icon: "process", iconTone: 8, route: "/processes" },
    { key: "controls", icon: "shield", iconTone: 2, route: "/controls" },
    { key: "risks", icon: "alert", iconTone: 1, route: "/risks" },
    { key: "accounts", icon: "employee", iconTone: 7, route: "/access-control/users", access: "users" },
    { key: "regulations", icon: "official-service", iconTone: 5, route: "/regulations" },
    { key: "globalControls", icon: "checklist", iconTone: 4, route: "/global-controls" },
    { key: "businessObjectives", icon: "flag", iconTone: 3, route: "/objectives" },
    { key: "objectives", icon: "target-group", iconTone: 8, route: "/control-objectives" },
    { key: "accountGroups", icon: "group", iconTone: 7, route: "/account-groups" },
    { key: "policies", icon: "document-text", iconTone: 4, route: "/policies" },
];

export default function MasterDataFeaturePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const masterDataSearch = new URLSearchParams(location.search).get("q") ?? "";
    const me = useAuthState((state) => state.me);

    const items = useMemo(() => MASTER_DATA_ITEMS.filter((item) => {
        if (item.access === "users") {
            return Boolean(me?.rootUser || me?.authorities.includes("USER_VIEW"));
        }
        const area = areaForPath(item.route);
        return Boolean(area && canAccessMasterData(me, area));
    }).map((item) => ({
        ...item,
        title: t(`masterData.items.${item.key}`),
        description: t(`masterData.items.${item.key}.description`),
    })).filter((item) => `${item.title} ${item.description}`.toLocaleLowerCase().includes(masterDataSearch.trim().toLocaleLowerCase())), [me, masterDataSearch, t]);

    return (
        <section className="masterDataPage" aria-labelledby="master-data-page-title">
            <nav className="masterDataBreadcrumb" aria-label={t("masterData.breadcrumbLabel")}>
                <h1 id="master-data-page-title">{t("nav.governance")}</h1>
            </nav>

            <div className="masterDataTileGrid">
                {items.map((item) => (
                    <Card key={item.key} className="masterDataTileCard" header={
                        <CardHeader
                            dir="ltr"
                            interactive
                            titleText={item.title}
                            subtitleText={item.description}
                            onClick={() => navigate(item.route)}
                            avatar={<span className={`masterDataTileIcon masterDataTileIconTone${item.iconTone}`} aria-hidden="true"><Icon name={item.icon} /></span>}
                        />
                    }>
                        <Button
                            className="masterDataTileArrow"
                            dir="ltr"
                            icon="navigation-right-arrow"
                            design="Transparent"
                            accessibleName={t("masterData.openItem", { item: item.title })}
                            onClick={() => navigate(item.route)}
                        />
                    </Card>
                ))}
            </div>
        </section>
    );
}
