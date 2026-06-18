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

import type {
    AccountGroupImportance,
    AccountGroupNode,
    AccountGroupStatus,
} from "../domain/accountGroup.model";
import { formatPersianDate } from "@/shared/utils/date.utils";

export interface AccountGroupSummaryPanelProps {
    value?: AccountGroupNode | null;
    busy?: boolean;
    error?: string | null;
    onEdit?: (id: string) => void;
    onCancel?: () => void;
}

type AccountGroupDetailTabKey = "general" | "objectives" | "accounts" | "risks";

interface DetailTabDefinition {
    key: AccountGroupDetailTabKey;
    label: string;
}

const ACCOUNT_GROUP_SUMMARY_TAB_CLASS = "accountGroupSummaryTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${ACCOUNT_GROUP_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${ACCOUNT_GROUP_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${ACCOUNT_GROUP_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${ACCOUNT_GROUP_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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

function readSelectedTabKey(event: unknown): AccountGroupDetailTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return selectedTab?.getAttribute("data-tab-key") as AccountGroupDetailTabKey | null;
}

function resolveStatusLabel(
    status: AccountGroupStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function resolveImportanceLabel(
    importance: AccountGroupImportance | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!importance) {
        return "-";
    }

    const labels: Record<AccountGroupImportance, string> = {
        low: t("accountGroup.importance.low", { defaultValue: "کم" }),
        medium: t("accountGroup.importance.medium", { defaultValue: "متوسط" }),
        high: t("accountGroup.importance.high", { defaultValue: "زیاد" }),
        critical: t("accountGroup.importance.critical", { defaultValue: "بحرانی" }),
    };

    return labels[importance];
}

function resolveBooleanLabel(
    value: boolean | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (value === undefined) {
        return "-";
    }

    return value
        ? t("common.yes", { defaultValue: "بله" })
        : t("common.no", { defaultValue: "خیر" });
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
    return (
        <div style={FIELD_GRID_STYLE}>
            <Label showColon>{label}</Label>
            <span
                style={{
                    minWidth: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    lineHeight: 1.7,
                }}
            >
                {value || "-"}
            </span>
        </div>
    );
}

function GridTable({
    columns,
    rows,
    emptyRows = 3,
}: {
    columns: string[];
    rows: ReactNode[][];
    emptyRows?: number;
}) {
    const rowsToRender = rows.length > 0 ? rows : Array.from({ length: emptyRows }, () => []);

    return (
        <div
            role="table"
            style={{
                ...TABLE_STYLE,
                gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
            }}
        >
            {columns.map((column) => (
                <div key={column} role="columnheader" style={TABLE_HEADER_CELL_STYLE}>
                    {column}
                </div>
            ))}

            {rowsToRender.map((row, rowIndex) => (
                <Fragment key={rowIndex}>
                    {columns.map((column, columnIndex) => (
                        <div
                            key={`${column}-${rowIndex}-${columnIndex}`}
                            role="cell"
                            style={TABLE_CELL_STYLE}
                        >
                            {row[columnIndex] ?? ""}
                        </div>
                    ))}
                </Fragment>
            ))}
        </div>
    );
}

function getTabs(t: ReturnType<typeof useTranslation>["t"]): DetailTabDefinition[] {
    return [
        {
            key: "general",
            label: t("accountGroup.tabs.general", { defaultValue: "اطلاعات کلی" }),
        },
        {
            key: "objectives",
            label: t("accountGroup.tabs.objectives", { defaultValue: "اهداف" }),
        },
        {
            key: "accounts",
            label: t("accountGroup.tabs.accounts", { defaultValue: "حساب‌های معین" }),
        },
        {
            key: "risks",
            label: t("accountGroup.tabs.risks", { defaultValue: "ریسک‌ها" }),
        },
    ];
}

function AccountGroupTabs({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: DetailTabDefinition[];
    activeTab: AccountGroupDetailTabKey;
    onChange: (tab: AccountGroupDetailTabKey) => void;
}) {
    const handleTabSelect = (event: unknown) => {
        const key = readSelectedTabKey(event);

        if (key) {
            onChange(key);
        }
    };

    return (
        <DetailTabContainer
            className={ACCOUNT_GROUP_SUMMARY_TAB_CLASS}
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

function GeneralTab({ value }: { value: AccountGroupNode }) {
    const { t } = useTranslation();
    const assertions = value.assertions;

    return (
        <div style={{ display: "grid", gap: "0.75rem" }}>
            <DetailRow
                label={t("accountGroup.fields.description", { defaultValue: "شرح" })}
                value={value.description}
            />
            <DetailRow
                label={t("accountGroup.fields.importance", { defaultValue: "اهمیت" })}
                value={resolveImportanceLabel(value.importance, t)}
            />
            <DetailRow
                label={t("accountGroup.fields.reasonableAssurance", {
                    defaultValue: "اطمینان معقول",
                })}
                value={resolveBooleanLabel(value.reasonableAssurance, t)}
            />
            <DetailRow
                label={t("accountGroup.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                value={formatPersianDate(value.createdAt)}
            />
            <DetailRow
                label={t("accountGroup.fields.effectiveDate", { defaultValue: "تاریخ اعتبار" })}
                value={formatPersianDate(value.effectiveDate)}
            />
            <DetailRow
                label={t("accountGroup.fields.documents", { defaultValue: "مستندات" })}
                value={String(value.documentsCount ?? 0)}
            />
            <Title level="H5">
                {t("accountGroup.sections.assertions", { defaultValue: "ادعاها" })}
            </Title>
            <DetailRow
                label={t("accountGroup.assertions.existence", { defaultValue: "وجود داشتن" })}
                value={resolveBooleanLabel(assertions?.existence, t)}
            />
            <DetailRow
                label={t("accountGroup.assertions.completeness", { defaultValue: "کامل بودن" })}
                value={resolveBooleanLabel(assertions?.completeness, t)}
            />
            <DetailRow
                label={t("accountGroup.assertions.valuation", { defaultValue: "ارزشگذاری" })}
                value={resolveBooleanLabel(assertions?.valuation, t)}
            />
            <DetailRow
                label={t("accountGroup.assertions.disclosure", { defaultValue: "افشا" })}
                value={resolveBooleanLabel(assertions?.disclosure, t)}
            />
        </div>
    );
}

function TabBody({
    value,
    activeTab,
}: {
    value: AccountGroupNode;
    activeTab: AccountGroupDetailTabKey;
}) {
    const { t } = useTranslation();

    if (activeTab === "general") {
        return <GeneralTab value={value} />;
    }

    if (activeTab === "objectives") {
        return (
            <GridTable
                columns={[
                    t("accountGroup.fields.name", { defaultValue: "نام" }),
                    t("accountGroup.fields.description", { defaultValue: "شرح" }),
                ]}
                rows={(value.objectives ?? []).map((objective) => [
                    objective.title,
                    objective.description ?? "",
                ])}
            />
        );
    }

    if (activeTab === "accounts") {
        return (
            <GridTable
                columns={[
                    t("accountGroup.fields.fromAccount", { defaultValue: "از" }),
                    t("accountGroup.fields.toAccount", { defaultValue: "تا" }),
                    t("accountGroup.fields.description", { defaultValue: "شرح" }),
                ]}
                rows={(value.accountRanges ?? []).map((range) => [
                    range.fromAccount,
                    range.toAccount,
                    range.description ?? "",
                ])}
            />
        );
    }

    return (
        <GridTable
            columns={[
                t("accountGroup.fields.name", { defaultValue: "نام" }),
                t("accountGroup.fields.description", { defaultValue: "شرح" }),
                t("accountGroup.fields.source", { defaultValue: "منبع" }),
            ]}
            rows={(value.risks ?? []).map((risk) => [
                risk.name,
                risk.description ?? "",
                risk.source ?? "",
            ])}
        />
    );
}

export default function AccountGroupSummaryPanel({
    value,
    busy = false,
    error,
    onEdit,
    onCancel,
}: AccountGroupSummaryPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<AccountGroupDetailTabKey>("general");

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
            }}
        >
            <Bar
                startContent={
                    <Title level="H4">
                        {value?.title
                            ? `${value.code} - ${value.title}`
                            : t("accountGroup.object.summaryTitle", {
                                  defaultValue: "جزئیات گروه حساب‌ها",
                              })}
                    </Title>
                }
            />

            <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
                {error ? (
                    <MessageStrip design="Negative" hideCloseButton>
                        {error}
                    </MessageStrip>
                ) : null}

                {value ? (
                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                display: "grid",
                                gap: "0.75rem",
                                padding: "1rem",
                                border: "1px solid var(--sapGroup_ContentBorderColor)",
                                borderBottom: "none",
                                background: "var(--sapGroup_ContentBackground)",
                            }}
                        >
                            <DetailRow
                                label={t("accountGroup.fields.name", { defaultValue: "نام" })}
                                value={value.title}
                            />
                            <DetailRow
                                label={t("accountGroup.fields.code", { defaultValue: "کد" })}
                                value={value.code}
                            />
                            <DetailRow
                                label={t("accountGroup.fields.status", { defaultValue: "وضعیت" })}
                                value={resolveStatusLabel(value.status, t)}
                            />
                        </div>

                        <AccountGroupTabs
                            tabs={tabs}
                            activeTab={effectiveActiveTab}
                            onChange={setActiveTab}
                        />

                        <div style={TAB_BODY_STYLE}>
                            <TabBody value={value} activeTab={effectiveActiveTab} />
                        </div>
                    </div>
                ) : (
                    <MessageStrip design="Information" hideCloseButton>
                        {t("accountGroup.object.selectPrompt", {
                            defaultValue: "برای مشاهده جزئیات، یک گروه حساب را انتخاب کنید.",
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
