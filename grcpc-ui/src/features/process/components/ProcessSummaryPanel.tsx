import {useMemo, useState, type CSSProperties, type ReactNode, Fragment} from "react";
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
    ControlAutomation,
    ControlImportance,
    ProcessCategory,
    ProcessNode,
    ProcessNodeType,
    ProcessStatus,
} from "../domain/process.model";
import { formatPersianDate } from "@/shared/utils/date.utils";

export interface ProcessSummaryPanelProps {
    value?: ProcessNode | null;
    busy?: boolean;
    error?: string | null;
    onEdit?: (id: string) => void;
    onCancel?: () => void;
}

type ProcessDetailTabKey =
    | "general"
    | "controlObjectives"
    | "accountGroups"
    | "regulations"
    | "risks";

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
    const labels: Record<ProcessNodeType, string> = {
        process: t("process.nodeType.process", { defaultValue: "فرآیند" }),
        subProcess: t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
        control: t("process.nodeType.control", { defaultValue: "کنترل" }),
    };

    return labels[nodeType];
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

function resolveAutomationLabel(
    automation: ControlAutomation | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!automation) {
        return "-";
    }

    const labels: Record<ControlAutomation, string> = {
        manual: t("process.controlAutomation.manual", { defaultValue: "دستی" }),
        automated: t("process.controlAutomation.automated", { defaultValue: "سیستمی" }),
        semiAutomated: t("process.controlAutomation.semiAutomated", {
            defaultValue: "نیمه سیستمی",
        }),
    };

    return labels[automation];
}

function resolveImportanceLabel(
    importance: ControlImportance | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!importance) {
        return "-";
    }

    const labels: Record<ControlImportance, string> = {
        low: t("process.importance.low", { defaultValue: "کم" }),
        medium: t("process.importance.medium", { defaultValue: "متوسط" }),
        high: t("process.importance.high", { defaultValue: "زیاد" }),
        critical: t("process.importance.critical", { defaultValue: "بحرانی" }),
    };

    return labels[importance];
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

function getTabs(
    nodeType: ProcessNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): DetailTabDefinition[] {
    if (nodeType === "control") {
        return [
            {
                key: "general",
                label: t("process.tabs.general", { defaultValue: "اطلاعات کلی" }),
            },
            {
                key: "regulations",
                label: t("process.tabs.regulations", { defaultValue: "الزامات" }),
            },
            {
                key: "risks",
                label: t("process.tabs.risks", { defaultValue: "ریسک" }),
            },
        ];
    }

    if (nodeType === "subProcess") {
        return [
            {
                key: "general",
                label: t("process.tabs.general", { defaultValue: "اطلاعات کلی" }),
            },
            {
                key: "controlObjectives",
                label: t("process.tabs.controlObjectives", {
                    defaultValue: "اهداف کنترلی",
                }),
            },
            {
                key: "accountGroups",
                label: t("process.tabs.accountGroups", { defaultValue: "گروه حساب" }),
            },
            {
                key: "risks",
                label: t("process.tabs.risks", { defaultValue: "ریسک" }),
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
        <TabContainer
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
        </TabContainer>
    );
}

function GeneralTab({ value }: { value: ProcessNode }) {
    const { t } = useTranslation();

    if (value.nodeType === "control") {
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
                    label={t("process.fields.controlAutomation", {
                        defaultValue: "کنترل سیستمی",
                    })}
                    value={resolveAutomationLabel(value.controlAutomation, t)}
                />
                <DetailRow
                    label={t("process.fields.operationCycle", { defaultValue: "دوره عملیاتی" })}
                    value={value.operationCycle}
                />
                <DetailRow
                    label={t("process.fields.objective", { defaultValue: "هدف" })}
                    value={value.objective}
                />
                <DetailRow
                    label={t("process.fields.importance", { defaultValue: "اهمیت" })}
                    value={resolveImportanceLabel(value.importance, t)}
                />
                <DetailRow
                    label={t("process.fields.controlClassification", {
                        defaultValue: "طبقه بندی کنترل",
                    })}
                    value={value.controlClassification}
                />
                <DetailRow
                    label={t("process.fields.controlOwner", { defaultValue: "مالک" })}
                    value={value.controlOwner}
                />
                <DetailRow
                    label={t("process.fields.testDirection", { defaultValue: "جهت آزمون" })}
                    value={value.testDirection}
                />
                <DetailRow
                    label={t("process.fields.testType", { defaultValue: "نوع آزمون" })}
                    value={value.testType}
                />
                <DetailRow
                    label={t("process.fields.testProgram", { defaultValue: "برنامه آزمون" })}
                    value={value.testProgram}
                />
                <DetailRow
                    label={t("process.fields.documents", { defaultValue: "مستندات" })}
                    value={String(value.documentsCount ?? 0)}
                />
            </div>
        );
    }

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

    if (activeTab === "controlObjectives") {
        return (
            <SimpleTable
                columns={[
                    t("process.fields.name", { defaultValue: "نام" }),
                    t("process.fields.description", { defaultValue: "شرح" }),
                ]}
            />
        );
    }

    if (activeTab === "accountGroups") {
        return (
            <SimpleTable
                columns={[
                    t("process.fields.name", { defaultValue: "نام" }),
                    t("process.fields.description", { defaultValue: "شرح" }),
                ]}
            />
        );
    }

    if (activeTab === "regulations") {
        return (
            <SimpleTable
                columns={[
                    t("process.fields.requirement", { defaultValue: "الزامات" }),
                    t("process.fields.description", { defaultValue: "شرح" }),
                    t("process.fields.regulationName", { defaultValue: "نام قانون" }),
                    t("process.fields.createdAt", { defaultValue: "تاریخ ایجاد" }),
                    t("process.fields.effectiveDate", { defaultValue: "تاریخ اعتبار" }),
                ]}
            />
        );
    }

    return (
        <SimpleTable
            columns={[
                t("process.fields.name", { defaultValue: "نام" }),
                t("process.fields.description", { defaultValue: "شرح" }),
                t("process.fields.source", { defaultValue: "منبع" }),
            ]}
        />
    );
}

export default function ProcessSummaryPanel({
                                                value,
                                                busy = false,
                                                error,
                                                onEdit,
                                                onCancel,
                                            }: ProcessSummaryPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ProcessDetailTabKey>("general");
    const summaryTitle = value?.title
        ? `${resolveNodeTypeLabel(value.nodeType, t)} ${value.title}`
        : t("process.object.summaryTitle", {
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
                    <MessageStrip design="Negative" hideCloseButton>
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
