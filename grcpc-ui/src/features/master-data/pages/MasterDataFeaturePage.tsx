import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon, List, ListItemStandard, Title } from "@ui5/webcomponents-react";

import "./master-data.css";

type MasterDataItem = {
    key: string;
    titleKey: string;
    defaultTitle: string;
    descriptionKey: string;
    defaultDescription: string;
    icon: string;
    route: string;
    group: "structure" | "catalog";
};

const MASTER_DATA_ITEMS: MasterDataItem[] = [
    {
        key: "organizations",
        titleKey: "masterData.items.organizations",
        defaultTitle: "سازمان",
        descriptionKey: "masterData.items.organizations.description",
        defaultDescription: "تعریف و نگهداری ساختار سلسله‌مراتبی سازمان",
        icon: "org-chart",
        route: "/organizations",
        group: "structure",
    },
    {
        key: "processes",
        titleKey: "masterData.items.processes",
        defaultTitle: "فرآیندها و زیر‌فرآیندها",
        descriptionKey: "masterData.items.processes.description",
        defaultDescription: "مدیریت ساختار فرآیند و زیر‌فرآیند و زمینهٔ کنترل‌ها",
        icon: "process",
        route: "/processes",
        group: "structure",
    },
    {
        key: "controls",
        titleKey: "masterData.items.controls",
        defaultTitle: "کنترل‌ها",
        descriptionKey: "masterData.items.controls.description",
        defaultDescription: "تعریف و نگهداری کاتالوگ کنترل‌ها و مستندات مرتبط",
        icon: "validate",
        route: "/controls",
        group: "catalog",
    },
    {
        key: "objectives",
        titleKey: "masterData.items.objectives",
        defaultTitle: "اهداف کنترلی",
        descriptionKey: "masterData.items.objectives.description",
        defaultDescription: "تعریف اهداف کنترلی و مستندات مرتبط",
        icon: "activity-assigned-to-goal",
        route: "/control-objectives",
        group: "catalog",
    },
    {
        key: "regulations",
        titleKey: "masterData.items.regulations",
        defaultTitle: "قوانین و مقررات",
        descriptionKey: "masterData.items.regulations.description",
        defaultDescription: "ساختار گروه قانون، قانون و الزام قانونی",
        icon: "official-service",
        route: "/regulations",
        group: "catalog",
    },
    {
        key: "risks",
        titleKey: "masterData.items.risks",
        defaultTitle: "ریسک‌ها",
        descriptionKey: "masterData.items.risks.description",
        defaultDescription: "ساختار طبقات ریسک و الگوهای ریسک",
        icon: "quality-issue",
        route: "/risks",
        group: "catalog",
    },
    {
        key: "accountGroups",
        titleKey: "masterData.items.accountGroups",
        defaultTitle: "گروه حساب‌ها",
        descriptionKey: "masterData.items.accountGroups.description",
        defaultDescription: "تعریف سلسله‌مراتب گروه‌های حساب",
        icon: "accounting-document-verification",
        route: "/account-groups",
        group: "catalog",
    },
    {
        key: "policies",
        titleKey: "masterData.items.policies",
        defaultTitle: "سیاست‌ها",
        descriptionKey: "masterData.items.policies.description",
        defaultDescription: "ساختار گروه سیاست، سیاست و نسخه‌های آن",
        icon: "document-text",
        route: "/policies",
        group: "catalog",
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
                description: t(item.descriptionKey, {
                    defaultValue: item.defaultDescription,
                }),
            })),
        [t],
    );

    const groups = useMemo(
        () => [
            {
                key: "structure" as const,
                title: t("masterData.groups.structure", {
                    defaultValue: "ساختارهای سازمانی و فرآیندی",
                }),
                items: items.filter((item) => item.group === "structure"),
            },
            {
                key: "catalog" as const,
                title: t("masterData.groups.catalog", {
                    defaultValue: "کاتالوگ‌های تخصصی",
                }),
                items: items.filter((item) => item.group === "catalog"),
            },
        ],
        [items, t],
    );

    return (
        <section className="masterDataPage" aria-labelledby="master-data-page-title">
            <header className="masterDataHeader">
                <div>
                    <Title id="master-data-page-title" level="H3" size="H3">
                        {t("masterData.title", { defaultValue: "اطلاعات پایه" })}
                    </Title>
                    <p className="masterDataSubtitle">
                        {t("masterData.subtitle", {
                            defaultValue: "ساختارها و کاتالوگ‌های مرجع سامانه را مدیریت کنید.",
                        })}
                    </p>
                </div>
            </header>

            <div className="masterDataSections">
                {groups.map((group) => (
                    <section key={group.key} className="masterDataSection">
                        <Title level="H4" size="H4">{group.title}</Title>
                        <List className="masterDataList" separators="Inner">
                            {group.items.map((item) => (
                                <ListItemStandard
                                    key={item.key}
                                    type="Active"
                                    description={item.description}
                                    additionalText={t("masterData.open", {
                                        defaultValue: "ورود",
                                    })}
                                    onClick={() => navigate(item.route)}
                                >
                                    <Icon name={item.icon} slot="image" />
                                    {item.title}
                                </ListItemStandard>
                            ))}
                        </List>
                    </section>
                ))}
            </div>
        </section>
    );
}
