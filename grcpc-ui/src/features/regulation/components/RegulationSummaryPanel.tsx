import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
import {
    Bar,
    Button,
    Label,
    MessageStrip,
    Tab,
    TabContainer,
    TabSeparator,
    Title,
} from "@ui5/webcomponents-react";

import type {
    RegulationNode,
    RegulationNodeType,
    RegulationStatus,
} from "../domain/regulation.model";
import { formatPersianDate } from "@/shared/utils/date.utils";

export interface RegulationSummaryPanelProps {
    value?: RegulationNode | null;
    allItems?: RegulationNode[];
    busy?: boolean;
    error?: string | null;
    onEdit?: (id: string) => void;
    onCancel?: () => void;
}

type RegulationDetailTabKey = "general" | "requirements" | "documents";

interface DetailTabDefinition {
    key: RegulationDetailTabKey;
    label: string;
}

const REGULATION_SUMMARY_TAB_CLASS = "regulationSummaryTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${REGULATION_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${REGULATION_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${REGULATION_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${REGULATION_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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
    overflowWrap: "anywhere",
};

const TABLE_CELL_STYLE: CSSProperties = {
    minHeight: "2rem",
    padding: "0.35rem 0.5rem",
    borderInlineEnd: "1px solid var(--sapList_BorderColor)",
    borderBlockEnd: "1px solid var(--sapList_BorderColor)",
    background: "var(--sapList_Background)",
    boxSizing: "border-box",
    overflowWrap: "anywhere",
};

function readSelectedTabKey(event: unknown): RegulationDetailTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return selectedTab?.getAttribute("data-tab-key") as RegulationDetailTabKey | null;
}

function resolveNodeTypeLabel(
    nodeType: RegulationNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<RegulationNodeType, string> = {
        lawGroup: t("regulation.nodeType.lawGroup", { defaultValue: "گروه قانون" }),
        law: t("regulation.nodeType.law", { defaultValue: "قانون" }),
        lawRequirement: t("regulation.nodeType.lawRequirement", {
            defaultValue: "الزامات قانون",
        }),
    };

    return labels[nodeType];
}

function resolveStatusLabel(
    status: RegulationStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
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
    data,
    rows = 3,
}: {
    columns: string[];
    data?: ReactNode[][];
    rows?: number;
}) {
    const tableData = data ?? [];

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

                {tableData.length > 0
                    ? tableData.flatMap((row, rowIndex) =>
                          row.map((cell, columnIndex) => (
                              <div
                                  key={`${rowIndex}-${columnIndex}`}
                                  role="cell"
                                  style={TABLE_CELL_STYLE}
                              >
                                  {cell || "-"}
                              </div>
                          )),
                      )
                    : (
                        <EmptyRows columns={columns.length} rows={rows} />
                    )}
            </div>
        </div>
    );
}

function getTabs(
    nodeType: RegulationNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): DetailTabDefinition[] {
    const tabs: DetailTabDefinition[] = [
        {
            key: "general",
            label: t("regulation.tabs.general", { defaultValue: "اطلاعات کلی" }),
        },
    ];

    if (nodeType === "law") {
        tabs.push({
            key: "requirements",
            label: t("regulation.tabs.requirements", { defaultValue: "الزامات" }),
        });
    }

    tabs.push({
        key: "documents",
        label: t("regulation.tabs.documents", { defaultValue: "مستندات" }),
    });

    return tabs;
}

function RegulationTabs({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: DetailTabDefinition[];
    activeTab: RegulationDetailTabKey;
    onChange: (tab: RegulationDetailTabKey) => void;
}) {
    const handleTabSelect = (event: unknown) => {
        const key = readSelectedTabKey(event);

        if (key) {
            onChange(key);
        }
    };

    return (
        <TabContainer
            className={REGULATION_SUMMARY_TAB_CLASS}
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
        </TabContainer>
    );
}

function GeneralTab({ value }: { value: RegulationNode }) {
    const { t } = useTranslation();

    return (
        <div style={{ display: "grid", gap: "0.75rem" }}>
            <DetailRow
                label={t("regulation.fields.description", { defaultValue: "شرح" })}
                value={value.description}
            />
            <DetailRow
                label={t("regulation.fields.effectiveDate", { defaultValue: "تاریخ ایجاد" })}
                value={formatPersianDate(value.effectiveDate)}
            />
            <DetailRow
                label={t("regulation.fields.validTo", { defaultValue: "تاریخ اعتبار" })}
                value={formatPersianDate(value.validTo)}
            />
            <DetailRow
                label={t("regulation.fields.status", { defaultValue: "وضعیت" })}
                value={resolveStatusLabel(value.status, t)}
            />
            <DetailRow
                label={t("regulation.fields.issuer", { defaultValue: "مرجع صادرکننده" })}
                value={value.issuer}
            />
            <DetailRow
                label={t("regulation.fields.documents", { defaultValue: "مستندات" })}
                value={String(value.documentsCount ?? 0)}
            />
        </div>
    );
}

function TabBody({
    value,
    allItems,
    activeTab,
}: {
    value: RegulationNode;
    allItems: RegulationNode[];
    activeTab: RegulationDetailTabKey;
}) {
    const { t } = useTranslation();

    if (activeTab === "general") {
        return <GeneralTab value={value} />;
    }

    if (activeTab === "requirements") {
        const requirements = allItems.filter(
            (item) => item.parentId === value.id && item.nodeType === "lawRequirement",
        );

        return (
            <SimpleTable
                columns={[
                    t("regulation.fields.requirement", { defaultValue: "الزامات" }),
                    t("regulation.fields.description", { defaultValue: "شرح" }),
                    t("regulation.fields.lawName", { defaultValue: "نام قانون" }),
                    t("regulation.fields.effectiveDate", { defaultValue: "تاریخ ایجاد" }),
                    t("regulation.fields.validTo", { defaultValue: "تاریخ اعتبار" }),
                ]}
                data={requirements.map((requirement) => [
                    requirement.title,
                    requirement.description,
                    value.title,
                    formatPersianDate(requirement.effectiveDate),
                    formatPersianDate(requirement.validTo),
                ])}
            />
        );
    }

    return (
        <SimpleTable
            columns={[
                t("regulation.fields.name", { defaultValue: "نام" }),
                t("regulation.fields.type", { defaultValue: "نوع" }),
                t("regulation.fields.effectiveDate", { defaultValue: "تاریخ ایجاد" }),
            ]}
        />
    );
}

export default function RegulationSummaryPanel({
    value,
    allItems = [],
    busy = false,
    error,
    onEdit,
    onCancel,
}: RegulationSummaryPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<RegulationDetailTabKey>("general");

    const tabs = useMemo(() => (value ? getTabs(value.nodeType, t) : []), [t, value]);

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
                            ? `${resolveNodeTypeLabel(value.nodeType, t)}: ${value.title}`
                            : t("regulation.object.summaryTitle", {
                                  defaultValue: "جزئیات قانون",
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
                                label={t("regulation.fields.name", { defaultValue: "نام" })}
                                value={value.title}
                            />
                            <DetailRow
                                label={t("regulation.fields.code", { defaultValue: "کد" })}
                                value={value.code}
                            />
                            <DetailRow
                                label={t("regulation.fields.type", { defaultValue: "نوع" })}
                                value={resolveNodeTypeLabel(value.nodeType, t)}
                            />
                        </div>

                        <RegulationTabs
                            tabs={tabs}
                            activeTab={effectiveActiveTab}
                            onChange={setActiveTab}
                        />

                        <div style={{ ...TAB_BODY_STYLE, minWidth: 0, overflowX: "auto" }}>
                            <TabBody
                                value={value}
                                allItems={allItems}
                                activeTab={effectiveActiveTab}
                            />
                        </div>
                    </div>
                ) : (
                    <MessageStrip design="Information" hideCloseButton>
                        {t("regulation.object.selectPrompt", {
                            defaultValue: "برای مشاهده جزئیات، یک آیتم قانون را انتخاب کنید.",
                        })}
                    </MessageStrip>
                )}
            </div>

            <Bar
                endContent={
                    <>
                        <Button
                            design="Emphasized"
                            disabled={!value || busy}
                            style={ACTION_BUTTON_STYLE}
                            onClick={() => value && onEdit?.(value.id)}
                        >
                            {t("common.edit", { defaultValue: "ویرایش" })}
                        </Button>

                        <Button
                            design="Transparent"
                            disabled={busy}
                            style={ACTION_BUTTON_STYLE}
                            onClick={onCancel}
                        >
                            {t("common.cancel", { defaultValue: "انصراف" })}
                        </Button>
                    </>
                }
            />
        </div>
    );
}
