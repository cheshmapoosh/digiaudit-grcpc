import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
import { DocumentIntegrationDeferredMessage, DocumentManager } from "@/features/document";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type { DocumentLinkTargetType } from "@/features/document";
import type { ProcessNode, ProcessNodeType, ProcessStatus } from "../domain/process.model";

export interface ProcessSummaryPanelProps {
    value?: ProcessNode | null;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onEdit?: (id: string) => void;
    onClose: () => void;
}

type ProcessDetailTabKey =
    | "general"
    | "rules"
    | "controls"
    | "objectives"
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

function resolveNodeTypeLabel(
    nodeType: ProcessNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return nodeType === "PROCESS"
        ? t("process.nodeType.process", { defaultValue: "فرآیند" })
        : t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" });
}

function resolveStatusLabel(
    status: ProcessStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (status === "ACTIVE") {
        return t("common.active", { defaultValue: "فعال" });
    }

    if (status === "INACTIVE") {
        return t("common.inactive", { defaultValue: "غیرفعال" });
    }

    return t("common.deleted", { defaultValue: "حذف‌شده" });
}

function resolveDocumentTargetType(nodeType: ProcessNodeType): DocumentLinkTargetType {
    return nodeType === "PROCESS" ? "CENTRAL_PROCESS" : "CENTRAL_SUBPROCESS";
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

function getTabs(t: ReturnType<typeof useTranslation>["t"]): DetailTabDefinition[] {
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
            key: "risks",
            label: t("process.tabs.risks", { defaultValue: "ریسک‌ها" }),
        },
        {
            key: "documents",
            label: t("process.tabs.documents", { defaultValue: "مستندات" }),
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

function GeneralTab({ value }: { value: ProcessNode }) {
    const { t } = useTranslation();

    return (
        <div style={{ display: "grid", gap: "0.75rem" }}>
            <DetailRow
                label={t("process.fields.code", { defaultValue: "کد" })}
                value={value.code}
            />
            <DetailRow
                label={t("process.fields.name", { defaultValue: "نام" })}
                value={value.title}
            />
            <DetailRow
                label={t("process.fields.nodeType", { defaultValue: "نوع آیتم" })}
                value={resolveNodeTypeLabel(value.nodeType, t)}
            />
            <DetailRow
                label={t("process.fields.parentProcess", { defaultValue: "والد فرآیند" })}
                value={value.parentId ?? "-"}
            />
            <DetailRow
                label={t("process.fields.sortOrder", { defaultValue: "ترتیب نمایش" })}
                value={String(value.sortOrder)}
            />
            <DetailRow
                label={t("process.fields.status", { defaultValue: "وضعیت" })}
                value={resolveStatusLabel(value.status, t)}
            />
            <DetailRow
                label={t("process.fields.validity", { defaultValue: "اعتبار" })}
                value={`${formatPersianDate(value.validFrom)} - ${formatPersianDate(
                    value.validTo,
                )}`}
            />
            <DetailRow
                label={t("process.fields.description", { defaultValue: "شرح" })}
                value={value.description}
            />
            <DetailRow
                label={t("process.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                value={formatPersianDateTime(value.createdAt)}
            />
        </div>
    );
}

function TabBody({
    value,
    activeTab,
}: {
    value: ProcessNode;
    activeTab: ProcessDetailTabKey;
}) {
    const { t } = useTranslation();

    if (activeTab === "general") {
        return <GeneralTab value={value} />;
    }

    if (activeTab === "documents") {
        return (
            <DocumentManager
                title={t("process.tabs.documents", { defaultValue: "مستندات" })}
                targetType={resolveDocumentTargetType(value.nodeType)}
                targetId={value.id}
                readOnly
                showActions={false}
            />
        );
    }

    return (
        <DocumentIntegrationDeferredMessage
            title={t(`process.tabs.${activeTab}`, { defaultValue: activeTab })}
        />
    );
}

export default function ProcessSummaryPanel({
    value,
    error,
    onErrorClose,
    onEdit,
    onClose,
}: ProcessSummaryPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ProcessDetailTabKey>("general");
    const summaryTitle = value?.title ?? t("process.object.summaryTitle", {
        defaultValue: "جزئیات فرآیند",
    });

    const tabs = useMemo(() => getTabs(t), [t]);

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
            <Bar startContent={<Title level="H4">{summaryTitle}</Title>} />

            <div style={{ display: "grid", gap: "1rem", alignContent: "start", minWidth: 0 }}>
                {error ? (
                    <MessageStrip design="Negative" onClose={onErrorClose}>
                        {error}
                    </MessageStrip>
                ) : null}

                {value ? (
                    <div style={{ minWidth: 0, maxWidth: "100%" }}>
                        <ProcessTabs
                            tabs={tabs}
                            activeTab={effectiveActiveTab}
                            onChange={setActiveTab}
                        />

                        <div style={{ ...TAB_BODY_STYLE, minWidth: 0, overflowX: "auto" }}>
                            <TabBody value={value} activeTab={effectiveActiveTab} />
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
                    <>
                        <Button
                            design="Emphasized"
                            disabled={!value}
                            style={ACTION_BUTTON_STYLE}
                            onClick={() => value && onEdit?.(value.id)}
                        >
                            {t("common.edit", { defaultValue: "ویرایش" })}
                        </Button>
                        <Button
                            design="Transparent"
                            style={ACTION_BUTTON_STYLE}
                            onClick={onClose}
                        >
                            {t("common.close", { defaultValue: "بستن" })}
                        </Button>
                    </>
                }
            />
        </div>
    );
}
