import { Fragment, useMemo, useState, type CSSProperties } from "react";
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

import { DocumentManager } from "@/features/document";
import type { ObjectiveNode, ObjectiveStatus, ObjectiveType } from "../domain/objective.model";
import { formatPersianDate } from "@/shared/utils/date.utils";

export interface ObjectiveSummaryPanelProps {
    value?: ObjectiveNode | null;
    busy?: boolean;
    error?: string | null;
    onClose: () => void;
}

type ObjectiveDetailTabKey = "general" | "relatedOrganizations" | "documents";

interface DetailTabDefinition {
    key: ObjectiveDetailTabKey;
    label: string;
}

const OBJECTIVE_SUMMARY_TAB_CLASS = "objectiveSummaryTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${OBJECTIVE_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${OBJECTIVE_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${OBJECTIVE_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${OBJECTIVE_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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
    gridTemplateColumns: "9rem minmax(0, 1fr)",
    gap: "0.75rem",
    alignItems: "start",
};

const TABLE_STYLE: CSSProperties = {
    display: "grid",
    borderInlineStart: "1px solid var(--sapList_BorderColor)",
    borderBlockStart: "1px solid var(--sapList_BorderColor)",
    background: "var(--sapList_Background)",
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

function readSelectedTabKey(event: unknown): ObjectiveDetailTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return selectedTab?.getAttribute("data-tab-key") as ObjectiveDetailTabKey | null;
}

function resolveStatusLabel(
    status: ObjectiveStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
        : t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" });
}

function resolveObjectiveTypeLabel(
    objectiveType: ObjectiveType | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!objectiveType) {
        return "-";
    }

    const labels: Record<ObjectiveType, string> = {
        operational: t("objective.type.operational", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø¹Ù…Ù„ÛŒØ§ØªÛŒ" }),
        compliance: t("objective.type.compliance", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø±Ø¹Ø§ÛŒØªÛŒ" }),
        strategic: t("objective.type.strategic", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø§Ø³ØªØ±Ø§ØªÚ˜ÛŒÚ©" }),
        financial: t("objective.type.financial", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ù…Ø§Ù„ÛŒ" }),
        reporting: t("objective.type.reporting", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ú¯Ø²Ø§Ø±Ø´Ú¯Ø±ÛŒ" }),
        market: t("objective.type.market", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø¨Ø§Ø²Ø§Ø±" }),
    };

    return labels[objectiveType];
}

function renderValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <>
            <Label showColon>{label}</Label>
            <span style={{ minWidth: 0, wordBreak: "break-word" }}>{renderValue(value)}</span>
        </>
    );
}

function SimpleTable({
    columns,
    rows,
}: {
    columns: string[];
    rows: Array<Array<string | number | null | undefined>>;
}) {
    const template = `repeat(${columns.length}, minmax(8rem, 1fr))`;
    const visibleRows = rows.length > 0 ? rows : [["", "", "", ""]];

    return (
        <div style={{ ...TABLE_STYLE, gridTemplateColumns: template }}>
            {columns.map((column) => (
                <div key={column} style={TABLE_HEADER_CELL_STYLE}>
                    {column}
                </div>
            ))}

            {visibleRows.map((row, rowIndex) => (
                <Fragment key={rowIndex}>
                    {columns.map((column, columnIndex) => (
                        <div key={`${rowIndex}-${column}`} style={TABLE_CELL_STYLE}>
                            {renderValue(row[columnIndex])}
                        </div>
                    ))}
                </Fragment>
            ))}
        </div>
    );
}

export default function ObjectiveSummaryPanel({
    value,
    busy = false,
    error,
    onClose,
}: ObjectiveSummaryPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ObjectiveDetailTabKey>("general");

    const tabs = useMemo<DetailTabDefinition[]>(
        () => [
            {
                key: "general",
                label: t("objective.tabs.general", { defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ" }),
            },
            {
                key: "relatedOrganizations",
                label: t("objective.tabs.relatedOrganizations"),
            },
            {
                key: "documents",
                label: t("objective.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" }),
            },
        ],
        [t],
    );

    if (!value) {
        return (
            <MessageStrip design="Information" hideCloseButton>
                {t("objective.object.selectPrompt", {
                    defaultValue: "Ø¨Ø±Ø§ÛŒ Ù…Ø´Ø§Ù‡Ø¯Ù‡ Ø¬Ø²Ø¦ÛŒØ§ØªØŒ ÛŒÚ© Ù‡Ø¯Ù Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯.",
                })}
            </MessageStrip>
        );
    }

    const renderGeneral = () => (
        <div style={FIELD_GRID_STYLE}>
            <DetailField label={t("objective.fields.code", { defaultValue: "Ø´Ù†Ø§Ø³Ù‡" })} value={value.code} />
            <DetailField label={t("objective.fields.name", { defaultValue: "Ù†Ø§Ù…" })} value={value.title} />
            <DetailField
                label={t("objective.fields.strategy", { defaultValue: "Ø§Ø³ØªØ±Ø§ØªÚ˜ÛŒ" })}
                value={value.strategy}
            />
            <DetailField
                label={t("objective.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
                value={value.description}
            />
            <DetailField
                label={t("objective.fields.objectiveType", { defaultValue: "Ù†ÙˆØ¹ Ù‡Ø¯Ù" })}
                value={resolveObjectiveTypeLabel(value.objectiveType, t)}
            />
            <DetailField
                label={t("objective.fields.objectiveClass", { defaultValue: "Ø·Ø¨Ù‚Ù‡ Ù‡Ø¯Ù" })}
                value={value.objectiveClass}
            />
            <DetailField
                label={t("objective.fields.createdAt", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" })}
                value={formatPersianDate(value.createdAt)}
            />
            <DetailField
                label={t("objective.fields.validUntil", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" })}
                value={formatPersianDate(value.validUntil)}
            />
            <DetailField
                label={t("objective.fields.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" })}
                value={value.documentsCount ?? 0}
            />
            <DetailField
                label={t("objective.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}
                value={resolveStatusLabel(value.status, t)}
            />
        </div>
    );

    const renderRelatedOrganizations = () => {
        const organizations = value.organizations ?? [];

        return (
            <SimpleTable
                columns={[
                    t("objective.relatedOrganizations.columns.organization"),
                    t("objective.relatedOrganizations.columns.status"),
                ]}
                rows={
                    organizations.length > 0
                        ? organizations.map((organization) => [
                              organization.organizationCode
                                  ? `${organization.organizationCode} - ${organization.organizationName ?? ""}`
                                  : organization.organizationName,
                              organization.organizationStatus
                                  ? resolveStatusLabel(organization.organizationStatus, t)
                                  : "-",
                          ])
                        : [[t("objective.relatedOrganizations.empty"), ""]]
                }
            />
        );
    };

    const renderDocuments = () => (
        <DocumentManager
            title={t("objective.tabs.documents", {
                defaultValue: "مستندات",
            })}
            targetType="CENTRAL_CONTROL_OBJECTIVE_DEF"
            targetId={value.id}
            busy={busy}
            readOnly
            viewHint={t("objective.documents.viewHint", {
                defaultValue: "مستندات ثبت‌شده برای این هدف",
            })}
        />
    );
    const renderActiveTab = () => {
        if (activeTab === "relatedOrganizations") {
            return renderRelatedOrganizations();
        }

        if (activeTab === "documents") {
            return renderDocuments();
        }

        return renderGeneral();
    };

    return (
        <div
            style={{
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                minHeight: "100%",
                gap: "1rem",
            }}
        >
            <Bar
                startContent={
                    <Title level="H4">
                        {t("objective.object.summaryTitle", { defaultValue: "Ø¬Ø²Ø¦ÛŒØ§Øª Ù‡Ø¯Ù" })}
                    </Title>
                }
            />

            <div style={{ display: "grid", gap: "1rem", alignContent: "start", minWidth: 0 }}>
                {error ? (
                    <MessageStrip design="Negative" hideCloseButton>
                        {error}
                    </MessageStrip>
                ) : null}

                <DetailTabContainer
                    className={OBJECTIVE_SUMMARY_TAB_CLASS}
                    style={TAB_CONTAINER_STYLE}
                    onTabSelect={(event) => {
                        const nextTab = readSelectedTabKey(event);
                        if (nextTab) {
                            setActiveTab(nextTab);
                        }
                    }}
                >
                    {tabs.flatMap((tab, index) => {
                        const item = (
                            <Tab
                                key={tab.key}
                                text={tab.label}
                                selected={activeTab === tab.key}
                                data-tab-key={tab.key}
                            />
                        );

                        if (index === 0) {
                            return [item];
                        }

                        if (index === 1) {
                            return [<TabSeparator key="general-separator" />, item];
                        }

                        return [item];
                    })}
                </DetailTabContainer>

                <div style={TAB_BODY_STYLE}>{renderActiveTab()}</div>
            </div>

            <Bar
                endContent={
                    <Button
                        design="Transparent"
                        style={ACTION_BUTTON_STYLE}
                        onClick={onClose}
                    >
                        {t("common.close", {
                            defaultValue: "Ø¨Ø³ØªÙ†",
                        })}
                    </Button>
                }
            />
        </div>
    );
}
