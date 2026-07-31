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
import { DocumentManager, type DocumentLinkTargetType } from "@/features/document";
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
        riskCategory: t("risk.nodeType.riskCategory", { defaultValue: "Ø·Ø¨Ù‚Ù‡ Ø±ÛŒØ³Ú©" }),
        riskTemplate: t("risk.nodeType.riskTemplate", { defaultValue: "Ø§Ù„Ú¯ÙˆÛŒ Ø±ÛŒØ³Ú©" }),
    };

    return labels[nodeType];
}

function resolveStatusLabel(
    status: RiskStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
        : t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" });
}

function resolveRiskTypeLabel(
    riskType: RiskTemplateType | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!riskType) {
        return "-";
    }

    const labels: Record<RiskTemplateType, string> = {
        operational: t("risk.riskType.operational", { defaultValue: "Ø¹Ù…Ù„ÛŒØ§ØªÛŒ" }),
        financial: t("risk.riskType.financial", { defaultValue: "Ù…Ø§Ù„ÛŒ" }),
        strategic: t("risk.riskType.strategic", { defaultValue: "Ø§Ø³ØªØ±Ø§ØªÚ˜ÛŒÚ©" }),
        compliance: t("risk.riskType.compliance", { defaultValue: "Ø§Ù†Ø·Ø¨Ø§Ù‚" }),
        technology: t("risk.riskType.technology", { defaultValue: "ÙÙ†Ø§ÙˆØ±ÛŒ" }),
        reputation: t("risk.riskType.reputation", { defaultValue: "Ø´Ù‡Ø±Øª" }),
        safety: t("risk.riskType.safety", { defaultValue: "Ø§ÛŒÙ…Ù†ÛŒ" }),
        other: t("risk.riskType.other", { defaultValue: "Ø³Ø§ÛŒØ±" }),
    };

    return labels[riskType];
}

function boolLabel(value: boolean | undefined, t: ReturnType<typeof useTranslation>["t"]): string {
    if (value === undefined) {
        return "-";
    }

    return value ? t("common.yes", { defaultValue: "Ø¨Ù„Ù‡" }) : t("common.no", { defaultValue: "Ø®ÛŒØ±" });
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
        t("risk.fields.effect", { defaultValue: "Ø§Ø«Ø±" }),
        t("risk.fields.effectCategory", { defaultValue: "Ø·Ø¨Ù‚Ù‡ Ø§Ø«Ø±" }),
        t("risk.fields.effectCategoryDescription", { defaultValue: "Ø´Ø±Ø­ Ø·Ø¨Ù‚Ù‡ Ø§Ø«Ø±" }),
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
            { key: "general", label: t("risk.tabs.general", { defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ" }) },
            { key: "impacts", label: t("risk.tabs.impacts", { defaultValue: "Ù…Ø­Ø±Ú©â€ŒÙ‡Ø§ Ùˆ Ø§Ø«Ø±Ø§Øª" }) },
            { key: "existingRisks", label: t("risk.tabs.existingRisks", { defaultValue: "Ø±ÛŒØ³Ú© Ù…ÙˆØ¬ÙˆØ¯" }) },
            { key: "responsePattern", label: t("risk.tabs.responsePattern", { defaultValue: "Ø§Ù„Ú¯ÙˆÛŒ Ù¾Ø§Ø³Ø®" }) },
            { key: "controlCenter", label: t("risk.tabs.controlCenter", { defaultValue: "Ù…Ø±Ú©Ø² Ú©Ù†ØªØ±Ù„" }) },
            { key: "documents", label: t("risk.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" }) },
        ];
    }

    return [
        { key: "general", label: t("risk.tabs.general", { defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ" }) },
        { key: "riskSummary", label: t("risk.tabs.riskSummary", { defaultValue: "Ø®Ù„Ø§ØµÙ‡ Ø±ÛŒØ³Ú©" }) },
        { key: "kriTemplate", label: t("risk.tabs.kriTemplate", { defaultValue: "Ù‚Ø§Ù„Ø¨ KRI" }) },
        { key: "documents", label: t("risk.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" }) },
    ];
}

function resolveDocumentTargetType(nodeType: RiskNodeType): DocumentLinkTargetType {
    return nodeType === "riskTemplate" ? "CENTRAL_RISK_TEMPLATE" : "CENTRAL_RISK_CATEGORY";
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
                label={t("risk.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
                value={value.description}
            />
            <DetailRow
                label={t("risk.fields.createdAt", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" })}
                value={formatPersianDate(value.createdAt)}
            />
            <DetailRow
                label={t("risk.fields.validFrom", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø´Ø±ÙˆØ¹ Ø§Ø¹ØªØ¨Ø§Ø±" })}
                value={formatPersianDate(value.validFrom)}
            />
            <DetailRow
                label={t("risk.fields.validTo", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" })}
                value={formatPersianDate(value.validTo)}
            />
            <DetailRow
                label={t("risk.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}
                value={resolveStatusLabel(value.status, t)}
            />
            <DetailRow
                label={t("risk.fields.allowReference", { defaultValue: "Ù…Ø¬ÙˆØ² Ø§Ø±Ø¬Ø§Ø¹" })}
                value={boolLabel(value.allowReference, t)}
            />
            <DetailRow
                label={t("risk.fields.analysisProfile", { defaultValue: "Ù¾Ø±ÙˆÙØ§ÛŒÙ„ ØªØ­Ù„ÛŒÙ„" })}
                value={value.analysisProfile}
            />
            {value.nodeType === "riskTemplate" ? (
                <>
                    <DetailRow
                        label={t("risk.fields.companyOperation", { defaultValue: "Ø´Ø±Ú©Øª / Ø¹Ù…Ù„ÛŒØ§Øª" })}
                        value={value.companyOperation}
                    />
                    <DetailRow
                        label={t("risk.fields.riskType", { defaultValue: "Ù†ÙˆØ¹ Ø±ÛŒØ³Ú©" })}
                        value={resolveRiskTypeLabel(value.riskType, t)}
                    />
                    <DetailRow
                        label={t("risk.fields.causes", { defaultValue: "Ù…Ø­Ø±Ú©â€ŒÙ‡Ø§" })}
                        value={value.causes}
                    />
                </>
            ) : null}
            <DetailRow
                label={t("risk.fields.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" })}
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
            <DocumentManager
                key={value.id}
                title={t("risk.tabs.documents", { defaultValue: "مستندات" })}
                targetType={resolveDocumentTargetType(value.nodeType)}
                targetId={value.id}
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
                    t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" }),
                    t("risk.fields.orgUnit", { defaultValue: "ÙˆØ§Ø­Ø¯ Ø³Ø§Ø²Ù…Ø§Ù†ÛŒ" }),
                    t("risk.fields.activity", { defaultValue: "ÙØ¹Ø§Ù„ÛŒØª" }),
                    t("risk.fields.createdAt", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" }),
                    t("risk.fields.validTo", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" }),
                    t("risk.fields.publishMethod", { defaultValue: "Ø±ÙˆØ´ Ø§Ù†ØªØ´Ø§Ø±" }),
                ]}
            />
        );
    }

    if (activeTab === "responsePattern") {
        return (
            <SimpleTable
                columns={[
                    t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" }),
                    t("risk.fields.type", { defaultValue: "Ù†ÙˆØ¹" }),
                    t("risk.fields.objective", { defaultValue: "Ù‡Ø¯Ù" }),
                    t("risk.fields.createdAt", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" }),
                    t("risk.fields.validTo", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" }),
                ]}
            />
        );
    }

    if (activeTab === "controlCenter") {
        return (
            <SimpleTable
                columns={[
                    t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" }),
                    t("risk.fields.owner", { defaultValue: "Ù…Ø§Ù„Ú©" }),
                    t("risk.fields.description", { defaultValue: "Ø´Ø±Ø­" }),
                ]}
            />
        );
    }

    if (activeTab === "riskSummary") {
        return (
            <SimpleTable
                columns={[
                    t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" }),
                    t("risk.fields.description", { defaultValue: "Ø´Ø±Ø­" }),
                ]}
            />
        );
    }

    return (
        <SimpleTable
            columns={[
                t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" }),
                t("risk.fields.type", { defaultValue: "Ù†ÙˆØ¹" }),
                t("risk.fields.description", { defaultValue: "Ø´Ø±Ø­" }),
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
                                defaultValue: "Ø¬Ø²Ø¦ÛŒØ§Øª Ø±ÛŒØ³Ú©",
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
                    <div style={{ minWidth: 0, maxWidth: "100%" }}>
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
                                label={t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" })}
                                value={value.title}
                            />
                            <DetailRow
                                label={t("risk.fields.code", { defaultValue: "Ú©Ø¯" })}
                                value={value.code}
                            />
                            <DetailRow
                                label={t("risk.fields.type", { defaultValue: "Ù†ÙˆØ¹" })}
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
                            defaultValue: "Ø¨Ø±Ø§ÛŒ Ù…Ø´Ø§Ù‡Ø¯Ù‡ Ø¬Ø²Ø¦ÛŒØ§ØªØŒ ÛŒÚ© Ø¢ÛŒØªÙ… Ø±ÛŒØ³Ú© Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯.",
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
                        {t("common.close", { defaultValue: "Ø¨Ø³ØªÙ†" })}
                    </Button>
                }
            />
        </div>
    );
}
