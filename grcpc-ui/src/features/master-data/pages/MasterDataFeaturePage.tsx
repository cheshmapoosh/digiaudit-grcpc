import { useMemo, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon, Title } from "@ui5/webcomponents-react";

import "./master-data.css";

type MasterDataItem = {
    key: string;
    titleKey: string;
    defaultTitle: string;
    icon: string;
    route: string;
    desktopColumn: 1 | 2;
    desktopRow: number;
};

const MASTER_DATA_ITEMS: MasterDataItem[] = [
    {
        key: "organizations",
        titleKey: "masterData.items.organizations",
        defaultTitle: "سازمان",
        icon: "org-chart",
        route: "/organizations",
        desktopColumn: 2,
        desktopRow: 1,
    },
    {
        key: "processes",
        titleKey: "masterData.items.processes",
        defaultTitle: "فرآیندها و زیر‌فرآیندها",
        icon: "process",
        route: "/processes",
        desktopColumn: 2,
        desktopRow: 2,
    },
    {
        key: "objectives",
        titleKey: "masterData.items.objectives",
        defaultTitle: "اهداف کنترلی",
        icon: "activity-assigned-to-goal",
        route: "/objectives",
        desktopColumn: 1,
        desktopRow: 1,
    },
    {
        key: "regulations",
        titleKey: "masterData.items.regulations",
        defaultTitle: "قوانین و مقررات",
        icon: "official-service",
        route: "/regulations",
        desktopColumn: 2,
        desktopRow: 3,
    },
    {
        key: "risks",
        titleKey: "masterData.items.risks",
        defaultTitle: "ریسک‌ها",
        icon: "quality-issue",
        route: "/risks",
        desktopColumn: 1,
        desktopRow: 2,
    },
    {
        key: "accountGroups",
        titleKey: "masterData.items.accountGroups",
        defaultTitle: "گروه حساب‌ها",
        icon: "accounting-document-verification",
        route: "/account-groups",
        desktopColumn: 1,
        desktopRow: 3,
    },
    {
        key: "policies",
        titleKey: "masterData.items.policies",
        defaultTitle: "سیاست‌ها",
        icon: "document-text",
        route: "/policies",
        desktopColumn: 2,
        desktopRow: 4,
    },
];

export default function MasterDataFeaturePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const items = useMemo(
        () =>
            MASTER_DATA_ITEMS.map((item) => ({
                ...item,
                title: t(item.titleKey, { defaultValue: item.defaultTitle }),
            })),
        [t],
    );

    return (
        <section className="masterDataPage" aria-labelledby="master-data-page-title">
            <header className="masterDataHeader">
                <Title id="master-data-page-title" level="H4" size="H4">
                    {t("masterData.title", {
                        defaultValue: "اطلاعات پایه",
                    })}
                </Title>
            </header>

            <div className="masterDataGrid" role="list">
                {items.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        className="masterDataTile"
                        role="listitem"
                        style={
                            {
                                "--master-data-column": item.desktopColumn,
                                "--master-data-row": item.desktopRow,
                            } as CSSProperties
                        }
                        onClick={() => navigate(item.route)}
                    >
                        <span className="masterDataTileLabel">{item.title}</span>
                        <span className="masterDataTileIconShell" aria-hidden="true">
                            <Icon name={item.icon} className="masterDataTileIcon" />
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}
