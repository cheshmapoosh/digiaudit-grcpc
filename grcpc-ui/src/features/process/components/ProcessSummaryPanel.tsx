import {useMemo, useState, type CSSProperties, type ReactNode, Fragment} from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
import {
    Bar,
    Button,
    Label,
    MessageStrip,
    Tab,
    TabSeparator,
    Title,
} from "@ui5/webcomponents-react";

import { DetailTabContainer } from "@/shared/components/DetailTabContainer";

import type {
    ProcessCategory,
    ProcessNode,
    ProcessNodeType,
    ProcessStatus,
} from "../domain/process.model";
import ProcessAccountGroupsTab from "./tabs/ProcessAccountGroupsTab";
import ProcessControlsTab from "./tabs/ProcessControlsTab";
import ProcessObjectivesTab from "./tabs/ProcessObjectivesTab";
import ProcessRegulationsTab from "./tabs/ProcessRegulationsTab";
import ProcessRisksTab from "./tabs/ProcessRisksTab";
import { DocumentAttachmentsManager } from "@/features/document";
import { formatPersianDate } from "@/shared/utils/date.utils";

export interface ProcessSummaryPanelProps {
    value?: ProcessNode | null;
    controlsCount?: number;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onClose: () => void;
}

type ProcessDetailTabKey =
    | "general"
    | "rules"
    | "controls"
    | "objectives"
    | "accountGroups"
    | "risks"
    | "documents";

interface DetailTabDefinition {
    key: ProcessDetailTabKey;
    label: string;
}

const PROCESS_SUMMARY_TAB_CLASS = "processSummaryTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${PROCESS_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${PROCESS_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${PROCESS_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${PROCESS_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
    content: none;
    display: none;
    border: 0;
}`,
);

const ACTION_BUTTON_STYLE: CSSProperties = {
    minWidth: "8rem",
};

const TAB_CONTAINER_STYLE: CSSProperties = {
    borderInline: "1px solid var(--sapGroup_ContentBorderColor)",
    borderTop: "1px solid var(--sapGroup_ContentBorderColor)",
    background: "var(--sapBackgroundColor)",
};

const TAB_BODY_STYLE: CSSProperties = {
    minHeight: "18rem",
    padding: "1rem",
    borderInline: "1px solid var(--sapGroup_ContentBorderColor)",
    borderBottom: "1px solid var(--sapGroup_ContentBorderColor)",
    background: "var(--sapGroup_ContentBackground)",
};

const FIELD_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(6rem, max-content) minmax(0, 1fr)",
    gap: "0.5rem",
    alignItems: "start",
    minWidth: 0,
};

function readSelectedTabKey(event: unknown): ProcessDetailTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return selectedTab?.getAttribute("data-tab-key") as ProcessDetailTabKey | null;
}

function resolveStatusLabel(
    status: ProcessStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function resolveCategoryLabel(
    category: ProcessCategory | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!category) {
        return "-";
    }

    const labels: Record<ProcessCategory, string> = {
        operational: t("process.category.operational", { defaultValue: "عملیاتی" }),
        support: t("process.category.support", { defaultValue: "پشتیبانی" }),
        strategic: t("process.category.strategic", { defaultValue: "استراتژیک" }),
        financial: t("process.category.financial", { defaultValue: "مالی" }),
        compliance: t("process.category.compliance", { defaultValue: "انطباق" }),
        it: t("process.category.it", { defaultValue: "فناوری اطلاعات" }),
        other: t("process.category.other", { defaultValue: "سایر" }),
    };

    return labels[category];
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
    return (
        <div style={FIELD_GRID_STYLE}>
            <Label showColon wrappingType="None">{label}</Label>
            <span
                style={{
                    minWidth: 0,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: 1.7,
                }}
            >
                {value || "-"}
            </span>
        </div>
    );
}

function getTabs(
    nodeType: ProcessNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): DetailTabDefinition[] {
    if (nodeType === "subProcess") {
        return [
            {
                key: "general",
                label: t("process.tabs.general", { defaultValue: "اطلاعات کلی" }),
            },
            {
                key: "rules",
                label: t("process.tabs.rules", { defaultValue: "قوانین" }),
            },
            {
                key: "controls",
                label: t("process.tabs.controls", { defaultValue: "کنترل‌ها" }),
            },
            {
                key: "objectives",
                label: t("process.tabs.objectives", { defaultValue: "اهداف" }),
            },
            {
                key: "accountGroups",
                label: t("process.tabs.accountGroups", { defaultValue: "گروه حساب" }),
            },
            {
                key: "risks",
                label: t("process.tabs.risks", { defaultValue: "ریسک‌ها" }),
            },
            {
                key: "documents",
                label: t("process.tabs.documents", { defaultValue: "مستندات" }),
            },
        ];
    }

    return [
        {
            key: "general",
            label: t("process.tabs.general", { defaultValue: "اطلاعات کلی" }),
        },
    ];
}

function ProcessTabs({
                         tabs,
                         activeTab,
                         onChange,
                     }: {
    tabs: DetailTabDefinition[];
    activeTab: ProcessDetailTabKey;
    onChange: (tab: ProcessDetailTabKey) => void;
}) {
    const handleTabSelect = (event: unknown) => {
        const key = readSelectedTabKey(event);

        if (key) {
            onChange(key);
        }
    };

    return (
        <DetailTabContainer
            className={PROCESS_SUMMARY_TAB_CLASS}
            onTabSelect={handleTabSelect}
            style={TAB_CONTAINER_STYLE}
        >
            {tabs.map((tab, index) => (
                <Fragment key={tab.key}>
                    {index === 1 ? <TabSeparator /> : null}
                    <Tab
                        text={tab.label}
                        selected={activeTab === tab.key}
                        data-tab-key={tab.key}
                    />
                </Fragment>
            ))}
        </DetailTabContainer>
    );
}

function GeneralTab({
                        value,
                        controlsCount,
                    }: {
    value: ProcessNode;
    controlsCount?: number;
}) {
    const { t } = useTranslation();

    return (
        <div style={{ display: "grid", gap: "0.75rem" }}>
            <DetailRow
                label={t("process.fields.code", { defaultValue: "کد" })}
                value={value.code}
            />
            <DetailRow
                label={t("process.fields.description", { defaultValue: "شرح" })}
                value={value.description}
            />
            <DetailRow
                label={t("process.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                value={formatPersianDate(value.createdAt)}
            />
            <DetailRow
                label={t("process.fields.processCategory", { defaultValue: "نوع" })}
                value={resolveCategoryLabel(value.processCategory, t)}
            />
            <DetailRow
                label={t("process.fields.status", { defaultValue: "وضعیت" })}
                value={resolveStatusLabel(value.status, t)}
            />
            <DetailRow
                label={t("process.fields.owner", { defaultValue: "مالک" })}
                value={value.ownerName}
            />
            <DetailRow
                label={t("process.fields.documents", { defaultValue: "مستندات" })}
                value={String(value.documentsCount ?? 0)}
            />
            {value.nodeType === "subProcess" ? (
                <DetailRow
                    label={t("control.fields.controlsCount", { defaultValue: "تعداد کنترل‌ها" })}
                    value={String(controlsCount ?? 0)}
                />
            ) : null}
        </div>
    );
}

function TabBody({
                     value,
                     activeTab,
                     controlsCount,
                 }: {
    value: ProcessNode;
    activeTab: ProcessDetailTabKey;
    controlsCount?: number;
}) {
    const { t } = useTranslation();

    if (activeTab === "general") {
        return <GeneralTab value={value} controlsCount={controlsCount} />;
    }

    if (activeTab === "rules") {
        return (
            <ProcessRegulationsTab
                key={`${value.id}:regulations`}
                processId={value.id}
                nodeType={value.nodeType}
                readOnly
                showActions={false}
            />
        );
    }

    if (activeTab === "controls") {
        return (
            <ProcessControlsTab
                key={`${value.id}:controls`}
                subProcessId={value.id}
                subProcessTitle={value.title}
                readOnly
                showActions={false}
            />
        );
    }

    if (activeTab === "objectives") {
        return (
            <ProcessObjectivesTab
                key={`${value.id}:objectives`}
                processId={value.id}
                readOnly
                showActions={false}
            />
        );
    }

    if (activeTab === "accountGroups") {
        return (
            <ProcessAccountGroupsTab
                key={`${value.id}:account-groups`}
                processId={value.id}
                readOnly
                showActions={false}
            />
        );
    }

    if (activeTab === "risks") {
        return (
            <ProcessRisksTab
                key={`${value.id}:risks`}
                processId={value.id}
                nodeType={value.nodeType}
                readOnly
                showActions={false}
            />
        );
    }

    return (
        <DocumentAttachmentsManager
            key={`${value.id}:documents`}
            targetType="PROCESS_NODE"
            targetId={value.id}
            readOnly
            showActions={false}
            title={t("process.tabs.documents", {
                defaultValue: "مستندات",
            })}
            viewHint={t("process.documents.viewHint", {
                defaultValue: "مستندات ثبت‌شده برای این زیر فرآیند",
            })}
        />
    );
}

export default function ProcessSummaryPanel({
                                                 value,
                                                 controlsCount,
                                                 error,
                                                 onErrorClose,
                                                 onClose,
                                             }: ProcessSummaryPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ProcessDetailTabKey>("general");
    const summaryTitle = value?.title ?? t("process.object.summaryTitle", {
        defaultValue: "جزئیات فرآیند",
    });

    const tabs = useMemo(
        () => (value ? getTabs(value.nodeType, t) : []),
        [t, value],
    );

    const effectiveActiveTab = tabs.some((tab) => tab.key === activeTab)
        ? activeTab
        : tabs[0]?.key ?? "general";

    return (
        <div
            style={{
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                minHeight: "100%",
                gap: "1rem",
                minWidth: 0,
            }}
        >
            <Bar
                startContent={
                    <Title level="H4">
                        {summaryTitle}
                    </Title>
                }
            />

            <div style={{ display: "grid", gap: "1rem", alignContent: "start", minWidth: 0 }}>
                {error ? (
                    <MessageStrip design="Negative" onClose={onErrorClose}>
                        {error}
                    </MessageStrip>
                ) : null}

                {value ? (
                    <div>
                        <ProcessTabs
                            tabs={tabs}
                            activeTab={effectiveActiveTab}
                            onChange={setActiveTab}
                        />

                        <div style={{ ...TAB_BODY_STYLE, minWidth: 0, overflowX: "auto" }}>
                            <TabBody
                                value={value}
                                activeTab={effectiveActiveTab}
                                controlsCount={controlsCount}
                            />
                        </div>
                    </div>
                ) : (
                    <MessageStrip design="Information" hideCloseButton>
                        {t("process.object.selectPrompt", {
                            defaultValue: "برای مشاهده جزئیات، یک آیتم فرآیندی را انتخاب کنید.",
                        })}
                    </MessageStrip>
                )}
            </div>

            <Bar
                endContent={
                    <Button
                        design="Transparent"
                        style={ACTION_BUTTON_STYLE}
                        onClick={onClose}
                    >
                        {t("common.close", {
                            defaultValue: "بستن",
                        })}
                    </Button>
                }
            />
        </div>
    );
}
