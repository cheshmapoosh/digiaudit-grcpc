import { useMemo, useState, type CSSProperties, type ReactNode, Fragment } from "react";
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
    RiskNode,
    RiskNodeType,
    RiskStatus,
    RiskTemplateType,
} from "../domain/risk.model";
import { DocumentAttachmentsManager } from "@/features/document";
import { formatPersianDate } from "@/shared/utils/date.utils";

export interface RiskSummaryPanelProps {
    value?: RiskNode | null;
    busy?: boolean;
    error?: string | null;
    onEdit?: (id: string) => void;
    onCancel?: () => void;
}

type RiskDetailTabKey =
    | "general"
    | "riskSummary"
    | "kriTemplate"
    | "documents"
    | "impacts"
    | "existingRisks"
    | "responsePattern"
    | "controlCenter";

interface DetailTabDefinition {
    key: RiskDetailTabKey;
    label: string;
}

const RISK_SUMMARY_TAB_CLASS = "riskSummaryTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${RISK_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${RISK_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${RISK_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${RISK_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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

const TABLE_STYLE: CSSProperties = {
    display: "grid",
    borderInlineStart: "1px solid var(--sapList_BorderColor)",
    borderBlockStart: "1px solid var(--sapList_BorderColor)",
    background: "var(--sapList_Background)",
    minWidth: "28rem",
};

const TABLE_HEADER_CELL_STYLE: CSSProperties = {
    minHeight: "2rem",
    padding: "0.35rem 0.5rem",
    borderInlineEnd: "1px solid var(--sapList_BorderColor)",
    borderBlockEnd: "1px solid var(--sapList_BorderColor)",
    background: "var(--sapList_HeaderBackground)",
    fontWeight: 700,
    boxSizing: "border-box",
};

const TABLE_CELL_STYLE: CSSProperties = {
    minHeight: "2rem",
    padding: "0.35rem 0.5rem",
    borderInlineEnd: "1px solid var(--sapList_BorderColor)",
    borderBlockEnd: "1px solid var(--sapList_BorderColor)",
    background: "var(--sapList_Background)",
    boxSizing: "border-box",
};

function readSelectedTabKey(event: unknown): RiskDetailTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return selectedTab?.getAttribute("data-tab-key") as RiskDetailTabKey | null;
}

function resolveNodeTypeLabel(
    nodeType: RiskNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<RiskNodeType, string> = {
        riskCategory: t("risk.nodeType.riskCategory", { defaultValue: "طبقه ریسک" }),
        riskTemplate: t("risk.nodeType.riskTemplate", { defaultValue: "الگوی ریسک" }),
    };

    return labels[nodeType];
}

function resolveStatusLabel(
    status: RiskStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function resolveRiskTypeLabel(
    riskType: RiskTemplateType | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!riskType) {
        return "-";
    }

    const labels: Record<RiskTemplateType, string> = {
        operational: t("risk.riskType.operational", { defaultValue: "عملیاتی" }),
        financial: t("risk.riskType.financial", { defaultValue: "مالی" }),
        strategic: t("risk.riskType.strategic", { defaultValue: "استراتژیک" }),
        compliance: t("risk.riskType.compliance", { defaultValue: "انطباق" }),
        technology: t("risk.riskType.technology", { defaultValue: "فناوری" }),
        reputation: t("risk.riskType.reputation", { defaultValue: "شهرت" }),
        safety: t("risk.riskType.safety", { defaultValue: "ایمنی" }),
        other: t("risk.riskType.other", { defaultValue: "سایر" }),
    };

    return labels[riskType];
}

function boolLabel(value: boolean | undefined, t: ReturnType<typeof useTranslation>["t"]): string {
    if (value === undefined) {
        return "-";
    }

    return value ? t("common.yes", { defaultValue: "بله" }) : t("common.no", { defaultValue: "خیر" });
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

function EmptyRows({ columns, rows = 3 }: { columns: number; rows?: number }) {
    return (
        <>
            {Array.from({ length: rows * columns }).map((_, index) => (
                <div key={index} role="cell" style={TABLE_CELL_STYLE} />
            ))}
        </>
    );
}

function SimpleTable({
                         columns,
                         rows = 3,
                     }: {
    columns: string[];
    rows?: number;
}) {
    return (
        <div style={{ overflowX: "auto", width: "100%" }}>
            <div
                role="table"
                style={{
                    ...TABLE_STYLE,
                    minWidth: `${Math.max(columns.length * 8, 28)}rem`,
                    gridTemplateColumns: `repeat(${columns.length}, minmax(8rem, 1fr))`,
                }}
            >
                {columns.map((column) => (
                    <div key={column} role="columnheader" style={TABLE_HEADER_CELL_STYLE}>
                        {column}
                    </div>
                ))}

                <EmptyRows columns={columns.length} rows={rows} />
            </div>
        </div>
    );
}

function EffectsTable({ value }: { value: RiskNode }) {
    const { t } = useTranslation();
    const columns = [
        t("risk.fields.effect", { defaultValue: "اثر" }),
        t("risk.fields.effectCategory", { defaultValue: "طبقه اثر" }),
        t("risk.fields.effectCategoryDescription", { defaultValue: "شرح طبقه اثر" }),
    ];

    return (
        <div style={{ overflowX: "auto", width: "100%" }}>
            <div
                role="table"
                style={{
                    ...TABLE_STYLE,
                    minWidth: "28rem",
                    gridTemplateColumns: "repeat(3, minmax(8rem, 1fr))",
                }}
            >
                {columns.map((column) => (
                    <div key={column} role="columnheader" style={TABLE_HEADER_CELL_STYLE}>
                        {column}
                    </div>
                ))}

                {value.effects?.length ? (
                    value.effects.flatMap((effect) => [
                        <div key={`${effect.id}-effect`} role="cell" style={TABLE_CELL_STYLE}>
                            {effect.effect}
                        </div>,
                        <div key={`${effect.id}-category`} role="cell" style={TABLE_CELL_STYLE}>
                            {effect.effectCategory}
                        </div>,
                        <div key={`${effect.id}-description`} role="cell" style={TABLE_CELL_STYLE}>
                            {effect.effectCategoryDescription ?? "-"}
                        </div>,
                    ])
                ) : (
                    <EmptyRows columns={3} rows={3} />
                )}
            </div>
        </div>
    );
}

function getTabs(
    nodeType: RiskNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): DetailTabDefinition[] {
    if (nodeType === "riskTemplate") {
        return [
            { key: "general", label: t("risk.tabs.general", { defaultValue: "اطلاعات کلی" }) },
            { key: "impacts", label: t("risk.tabs.impacts", { defaultValue: "محرک‌ها و اثرات" }) },
            { key: "existingRisks", label: t("risk.tabs.existingRisks", { defaultValue: "ریسک موجود" }) },
            { key: "responsePattern", label: t("risk.tabs.responsePattern", { defaultValue: "الگوی پاسخ" }) },
            { key: "controlCenter", label: t("risk.tabs.controlCenter", { defaultValue: "مرکز کنترل" }) },
            { key: "documents", label: t("risk.tabs.documents", { defaultValue: "مستندات" }) },
        ];
    }

    return [
        { key: "general", label: t("risk.tabs.general", { defaultValue: "اطلاعات کلی" }) },
        { key: "riskSummary", label: t("risk.tabs.riskSummary", { defaultValue: "خلاصه ریسک" }) },
        { key: "kriTemplate", label: t("risk.tabs.kriTemplate", { defaultValue: "قالب KRI" }) },
        { key: "documents", label: t("risk.tabs.documents", { defaultValue: "مستندات" }) },
    ];
}

function RiskTabs({
                      tabs,
                      activeTab,
                      onChange,
                  }: {
    tabs: DetailTabDefinition[];
    activeTab: RiskDetailTabKey;
    onChange: (tab: RiskDetailTabKey) => void;
}) {
    const handleTabSelect = (event: unknown) => {
        const key = readSelectedTabKey(event);

        if (key) {
            onChange(key);
        }
    };

    return (
        <DetailTabContainer
            className={RISK_SUMMARY_TAB_CLASS}
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

function GeneralTab({ value }: { value: RiskNode }) {
    const { t } = useTranslation();

    return (
        <div style={{ display: "grid", gap: "0.75rem" }}>
            <DetailRow
                label={t("risk.fields.description", { defaultValue: "شرح" })}
                value={value.description}
            />
            <DetailRow
                label={t("risk.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                value={formatPersianDate(value.createdAt)}
            />
            <DetailRow
                label={t("risk.fields.validFrom", { defaultValue: "تاریخ شروع اعتبار" })}
                value={formatPersianDate(value.validFrom)}
            />
            <DetailRow
                label={t("risk.fields.validTo", { defaultValue: "تاریخ اعتبار" })}
                value={formatPersianDate(value.validTo)}
            />
            <DetailRow
                label={t("risk.fields.status", { defaultValue: "وضعیت" })}
                value={resolveStatusLabel(value.status, t)}
            />
            <DetailRow
                label={t("risk.fields.allowReference", { defaultValue: "مجوز ارجاع" })}
                value={boolLabel(value.allowReference, t)}
            />
            <DetailRow
                label={t("risk.fields.analysisProfile", { defaultValue: "پروفایل تحلیل" })}
                value={value.analysisProfile}
            />
            {value.nodeType === "riskTemplate" ? (
                <>
                    <DetailRow
                        label={t("risk.fields.companyOperation", { defaultValue: "شرکت / عملیات" })}
                        value={value.companyOperation}
                    />
                    <DetailRow
                        label={t("risk.fields.riskType", { defaultValue: "نوع ریسک" })}
                        value={resolveRiskTypeLabel(value.riskType, t)}
                    />
                    <DetailRow
                        label={t("risk.fields.causes", { defaultValue: "محرک‌ها" })}
                        value={value.causes}
                    />
                </>
            ) : null}
            <DetailRow
                label={t("risk.fields.documents", { defaultValue: "مستندات" })}
                value={String(value.documentsCount ?? 0)}
            />
        </div>
    );
}

function TabBody({
                     value,
                     activeTab,
                     busy,
                 }: {
    value: RiskNode;
    activeTab: RiskDetailTabKey;
    busy: boolean;
}) {
    const { t } = useTranslation();

    if (activeTab === "general") {
        return <GeneralTab value={value} />;
    }

    if (activeTab === "documents") {
        return (
            <DocumentAttachmentsManager
                key={value.id}
                title={t("risk.tabs.documents", { defaultValue: "مستندات" })}
                targetType="RISK_NODE"
                targetId={value.id}
                stagingMode="direct"
                busy={busy}
                readOnly
            />
        );
    }

    if (activeTab === "impacts") {
        return <EffectsTable value={value} />;
    }

    if (activeTab === "existingRisks") {
        return (
            <SimpleTable
                columns={[
                    t("risk.fields.name", { defaultValue: "نام" }),
                    t("risk.fields.orgUnit", { defaultValue: "واحد سازمانی" }),
                    t("risk.fields.activity", { defaultValue: "فعالیت" }),
                    t("risk.fields.createdAt", { defaultValue: "تاریخ ایجاد" }),
                    t("risk.fields.validTo", { defaultValue: "تاریخ اعتبار" }),
                    t("risk.fields.publishMethod", { defaultValue: "روش انتشار" }),
                ]}
            />
        );
    }

    if (activeTab === "responsePattern") {
        return (
            <SimpleTable
                columns={[
                    t("risk.fields.name", { defaultValue: "نام" }),
                    t("risk.fields.type", { defaultValue: "نوع" }),
                    t("risk.fields.objective", { defaultValue: "هدف" }),
                    t("risk.fields.createdAt", { defaultValue: "تاریخ ایجاد" }),
                    t("risk.fields.validTo", { defaultValue: "تاریخ اعتبار" }),
                ]}
            />
        );
    }

    if (activeTab === "controlCenter") {
        return (
            <SimpleTable
                columns={[
                    t("risk.fields.name", { defaultValue: "نام" }),
                    t("risk.fields.owner", { defaultValue: "مالک" }),
                    t("risk.fields.description", { defaultValue: "شرح" }),
                ]}
            />
        );
    }

    if (activeTab === "riskSummary") {
        return (
            <SimpleTable
                columns={[
                    t("risk.fields.name", { defaultValue: "نام" }),
                    t("risk.fields.description", { defaultValue: "شرح" }),
                ]}
            />
        );
    }

    return (
        <SimpleTable
            columns={[
                t("risk.fields.name", { defaultValue: "نام" }),
                t("risk.fields.type", { defaultValue: "نوع" }),
                t("risk.fields.description", { defaultValue: "شرح" }),
            ]}
        />
    );
}

export default function RiskSummaryPanel({
                                             value,
                                             busy = false,
                                             error,
                                             onCancel,
                                         }: RiskSummaryPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<RiskDetailTabKey>("general");

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
                        {value?.title
                            ? `${value.code} - ${value.title}`
                            : t("risk.object.summaryTitle", {
                                defaultValue: "جزئیات ریسک",
                            })}
                    </Title>
                }
            />

            <div style={{ display: "grid", gap: "1rem", alignContent: "start", minWidth: 0 }}>
                {error ? (
                    <MessageStrip design="Negative" hideCloseButton>
                        {error}
                    </MessageStrip>
                ) : null}

                {value ? (
                    <div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
                                gap: "0.75rem 1rem",
                                padding: "0.75rem 1rem",
                                border: "1px solid var(--sapGroup_ContentBorderColor)",
                                borderBottom: "none",
                                background: "var(--sapGroup_ContentBackground)",
                            }}
                        >
                            <DetailRow
                                label={t("risk.fields.name", { defaultValue: "نام" })}
                                value={value.title}
                            />
                            <DetailRow
                                label={t("risk.fields.code", { defaultValue: "کد" })}
                                value={value.code}
                            />
                            <DetailRow
                                label={t("risk.fields.type", { defaultValue: "نوع" })}
                                value={resolveNodeTypeLabel(value.nodeType, t)}
                            />
                        </div>

                        <RiskTabs
                            tabs={tabs}
                            activeTab={effectiveActiveTab}
                            onChange={setActiveTab}
                        />

                        <div style={{ ...TAB_BODY_STYLE, minWidth: 0, overflowX: "auto" }}>
                            <TabBody
                                value={value}
                                activeTab={effectiveActiveTab}
                                busy={busy}
                            />
                        </div>
                    </div>
                ) : (
                    <MessageStrip design="Information" hideCloseButton>
                        {t("risk.object.selectPrompt", {
                            defaultValue: "برای مشاهده جزئیات، یک آیتم ریسک را انتخاب کنید.",
                        })}
                    </MessageStrip>
                )}
            </div>

            <Bar
                endContent={
                    <Button
                        design="Transparent"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={onCancel}
                    >
                        {t("common.close", { defaultValue: "بستن" })}
                    </Button>
                }
            />
        </div>
    );
}
