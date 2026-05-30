import { useMemo, useState, type CSSProperties, type ReactNode, Fragment } from "react";
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
    PolicyCategory,
    PolicyCommunicationMethod,
    PolicyKind,
    PolicyNode,
    PolicyNodeType,
    PolicyStatus,
} from "../domain/policy.model";
import { formatPersianDate } from "@/shared/utils/date.utils";

export interface PolicySummaryPanelProps {
    value?: PolicyNode | null;
    busy?: boolean;
    error?: string | null;
    onEdit?: (id: string) => void;
    onCancel?: () => void;
}

type PolicyDetailTabKey =
    | "general"
    | "documents"
    | "scope"
    | "risks"
    | "controls"
    | "sources"
    | "roles"
    | "reviewApproval";

interface DetailTabDefinition {
    key: PolicyDetailTabKey;
    label: string;
}

const POLICY_SUMMARY_TAB_CLASS = "policySummaryTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${POLICY_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${POLICY_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${POLICY_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${POLICY_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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

function readSelectedTabKey(event: unknown): PolicyDetailTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return selectedTab?.getAttribute("data-tab-key") as PolicyDetailTabKey | null;
}

function resolveNodeTypeLabel(
    nodeType: PolicyNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<PolicyNodeType, string> = {
        policyGroup: t("policy.nodeType.policyGroup", { defaultValue: "گروه سیاست" }),
        policy: t("policy.nodeType.policy", { defaultValue: "سیاست" }),
    };

    return labels[nodeType];
}

function resolveStatusLabel(
    status: PolicyStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<PolicyStatus, string> = {
        draft: t("policy.status.draft", { defaultValue: "پیش‌نویس" }),
        underReview: t("policy.status.underReview", { defaultValue: "در حال بررسی" }),
        pendingApproval: t("policy.status.pendingApproval", { defaultValue: "در انتظار تأیید" }),
        approved: t("policy.status.approved", { defaultValue: "تأیید شده" }),
        inactive: t("common.inactive", { defaultValue: "غیرفعال" }),
    };

    return labels[status];
}

function resolveCategoryLabel(
    category: PolicyCategory | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!category) {
        return "-";
    }

    const labels: Record<PolicyCategory, string> = {
        hr: t("policy.category.hr", { defaultValue: "منابع انسانی" }),
        accounting: t("policy.category.accounting", { defaultValue: "حسابداری" }),
        purchase: t("policy.category.purchase", { defaultValue: "خرید" }),
        it: t("policy.category.it", { defaultValue: "فناوری اطلاعات" }),
        finance: t("policy.category.finance", { defaultValue: "مالی" }),
        compliance: t("policy.category.compliance", { defaultValue: "انطباق" }),
        other: t("policy.category.other", { defaultValue: "سایر" }),
    };

    return labels[category];
}

function resolvePolicyKindLabel(
    kind: PolicyKind | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!kind) {
        return "-";
    }

    const labels: Record<PolicyKind, string> = {
        policy: t("policy.kind.policy", { defaultValue: "سیاست" }),
        procedure: t("policy.kind.procedure", { defaultValue: "دستورالعمل" }),
        announcement: t("policy.kind.announcement", { defaultValue: "اطلاعیه" }),
        workInstruction: t("policy.kind.workInstruction", { defaultValue: "روش اجرایی" }),
    };

    return labels[kind];
}

function resolveCommunicationMethodLabel(
    method: PolicyCommunicationMethod | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (!method) {
        return "-";
    }

    const labels: Record<PolicyCommunicationMethod, string> = {
        announcement: t("policy.communication.announcement", { defaultValue: "اطلاعیه" }),
        questionnaire: t("policy.communication.questionnaire", { defaultValue: "پرسشنامه" }),
        survey: t("policy.communication.survey", { defaultValue: "نظرسنجی" }),
    };

    return labels[method];
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

            <EmptyRows columns={columns.length} rows={rows} />
        </div>
    );
}

function getTabs(
    nodeType: PolicyNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): DetailTabDefinition[] {
    if (nodeType === "policyGroup") {
        return [
            {
                key: "general",
                label: t("policy.tabs.general", { defaultValue: "اطلاعات کلی" }),
            },
            {
                key: "documents",
                label: t("policy.tabs.documents", { defaultValue: "مستندات" }),
            },
        ];
    }

    return [
        {
            key: "general",
            label: t("policy.tabs.general", { defaultValue: "اطلاعات کلی" }),
        },
        {
            key: "documents",
            label: t("policy.tabs.documents", { defaultValue: "مستند سیاست" }),
        },
        {
            key: "scope",
            label: t("policy.tabs.scope", { defaultValue: "دامنه سیاست" }),
        },
        {
            key: "risks",
            label: t("policy.tabs.risks", { defaultValue: "ریسک‌ها" }),
        },
        {
            key: "controls",
            label: t("policy.tabs.controls", { defaultValue: "کنترل‌ها" }),
        },
        {
            key: "sources",
            label: t("policy.tabs.sources", { defaultValue: "منابع سیاست" }),
        },
        {
            key: "roles",
            label: t("policy.tabs.roles", { defaultValue: "نقش‌ها" }),
        },
        {
            key: "reviewApproval",
            label: t("policy.tabs.reviewApproval", { defaultValue: "بازنگری و تصویب" }),
        },
    ];
}

function PolicyTabs({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: DetailTabDefinition[];
    activeTab: PolicyDetailTabKey;
    onChange: (tab: PolicyDetailTabKey) => void;
}) {
    const handleTabSelect = (event: unknown) => {
        const key = readSelectedTabKey(event);

        if (key) {
            onChange(key);
        }
    };

    return (
        <TabContainer
            className={POLICY_SUMMARY_TAB_CLASS}
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

function GeneralTab({ value }: { value: PolicyNode }) {
    const { t } = useTranslation();

    if (value.nodeType === "policyGroup") {
        return (
            <div style={{ display: "grid", gap: "0.75rem" }}>
                <DetailRow
                    label={t("policy.fields.description", { defaultValue: "شرح" })}
                    value={value.description}
                />
                <DetailRow
                    label={t("policy.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                    value={formatPersianDate(value.createdAt)}
                />
                <DetailRow
                    label={t("policy.fields.validTo", { defaultValue: "تاریخ اعتبار" })}
                    value={formatPersianDate(value.validTo)}
                />
                <DetailRow
                    label={t("policy.fields.policyCategory", { defaultValue: "دسته‌بندی" })}
                    value={resolveCategoryLabel(value.policyCategory, t)}
                />
                <DetailRow
                    label={t("policy.fields.status", { defaultValue: "وضعیت" })}
                    value={resolveStatusLabel(value.status, t)}
                />
                <DetailRow
                    label={t("policy.fields.evaluationConfirmed", {
                        defaultValue: "تأیید ارزیابی",
                    })}
                    value={
                        value.evaluationConfirmed
                            ? t("common.yes", { defaultValue: "بله" })
                            : t("common.no", { defaultValue: "خیر" })
                    }
                />
                <DetailRow
                    label={t("policy.fields.documents", { defaultValue: "مستندات" })}
                    value={String(value.documentsCount ?? 0)}
                />
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: "0.75rem" }}>
            <DetailRow
                label={t("policy.fields.description", { defaultValue: "شرح" })}
                value={value.description}
            />
            <DetailRow
                label={t("policy.fields.policyKind", { defaultValue: "نوع سیاست" })}
                value={resolvePolicyKindLabel(value.policyKind, t)}
            />
            <DetailRow
                label={t("policy.fields.policyCategory", { defaultValue: "دسته‌بندی" })}
                value={resolveCategoryLabel(value.policyCategory, t)}
            />
            <DetailRow
                label={t("policy.fields.ownerOrganization", { defaultValue: "سازمان مسئول" })}
                value={value.ownerOrganization}
            />
            <DetailRow
                label={t("policy.fields.creatorName", { defaultValue: "ایجاد کننده" })}
                value={value.creatorName}
            />
            <DetailRow
                label={t("policy.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                value={formatPersianDate(value.createdAt)}
            />
            <DetailRow
                label={t("policy.fields.validFrom", { defaultValue: "تاریخ شروع اعتبار" })}
                value={formatPersianDate(value.validFrom)}
            />
            <DetailRow
                label={t("policy.fields.validTo", { defaultValue: "تاریخ پایان اعتبار" })}
                value={formatPersianDate(value.validTo)}
            />
            <DetailRow
                label={t("policy.fields.communicationMethod", { defaultValue: "روش اطلاع‌رسانی" })}
                value={resolveCommunicationMethodLabel(value.communicationMethod, t)}
            />
            <DetailRow
                label={t("policy.fields.communicationLanguage", { defaultValue: "زبان اطلاع‌رسانی" })}
                value={value.communicationLanguage}
            />
            <DetailRow
                label={t("policy.fields.nextReviewDate", { defaultValue: "تاریخ بازنگری بعدی" })}
                value={formatPersianDate(value.nextReviewDate)}
            />
            <DetailRow
                label={t("policy.fields.objective", { defaultValue: "هدف" })}
                value={value.objective}
            />
            <DetailRow
                label={t("policy.fields.note", { defaultValue: "یادداشت" })}
                value={value.note}
            />
        </div>
    );
}

function TabBody({
    value,
    activeTab,
}: {
    value: PolicyNode;
    activeTab: PolicyDetailTabKey;
}) {
    const { t } = useTranslation();

    if (activeTab === "general") {
        return <GeneralTab value={value} />;
    }

    if (activeTab === "documents") {
        return (
            <SimpleTable
                columns={[
                    t("policy.fields.documentType", { defaultValue: "نوع" }),
                    t("policy.fields.title", { defaultValue: "عنوان" }),
                    t("policy.fields.version", { defaultValue: "نسخه" }),
                    t("policy.fields.fileSize", { defaultValue: "اندازه فایل" }),
                    t("policy.fields.fileType", { defaultValue: "نوع فایل" }),
                    t("policy.fields.createdAt", { defaultValue: "تاریخ ایجاد" }),
                ]}
            />
        );
    }

    if (activeTab === "scope") {
        return (
            <SimpleTable
                columns={[
                    t("policy.fields.process", { defaultValue: "فرآیندها" }),
                    t("policy.fields.type", { defaultValue: "نوع" }),
                    t("policy.fields.description", { defaultValue: "شرح" }),
                    t("policy.fields.organization", { defaultValue: "سازمان" }),
                    t("policy.fields.owner", { defaultValue: "مالک" }),
                ]}
            />
        );
    }

    if (activeTab === "risks") {
        return (
            <SimpleTable
                columns={[
                    t("policy.fields.risk", { defaultValue: "ریسک" }),
                    t("policy.fields.organization", { defaultValue: "سازمان" }),
                    t("policy.fields.owner", { defaultValue: "مالک" }),
                    t("policy.fields.classification", { defaultValue: "طبقه‌بندی" }),
                ]}
            />
        );
    }

    if (activeTab === "controls") {
        return (
            <SimpleTable
                columns={[
                    t("policy.fields.name", { defaultValue: "نام" }),
                    t("policy.fields.subProcess", { defaultValue: "زیر فرآیند" }),
                    t("policy.fields.organization", { defaultValue: "سازمان" }),
                    t("policy.fields.owner", { defaultValue: "مالک" }),
                    t("policy.fields.effectivenessTest", { defaultValue: "آزمون اثربخشی" }),
                    t("policy.fields.controlDesignAssessment", {
                        defaultValue: "ارزیابی طراحی کنترل",
                    }),
                ]}
            />
        );
    }

    if (activeTab === "sources") {
        return (
            <SimpleTable
                columns={[
                    t("policy.fields.policySource", { defaultValue: "منابع سیاست" }),
                    t("policy.fields.type", { defaultValue: "نوع" }),
                ]}
            />
        );
    }

    if (activeTab === "roles") {
        return (
            <SimpleTable
                columns={[
                    t("policy.fields.roles", { defaultValue: "نقش‌ها" }),
                    t("policy.fields.type", { defaultValue: "نوع" }),
                ]}
            />
        );
    }

    return (
        <SimpleTable
            columns={[
                t("policy.fields.reviewerApprover", {
                    defaultValue: "بازنگری کنندگان / تصویب کنندگان",
                }),
                t("policy.fields.name", { defaultValue: "نام" }),
                t("policy.fields.identifier", { defaultValue: "شناسه" }),
            ]}
        />
    );
}

export default function PolicySummaryPanel({
    value,
    busy = false,
    error,
    onEdit,
    onCancel,
}: PolicySummaryPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<PolicyDetailTabKey>("general");

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
            }}
        >
            <Bar
                startContent={
                    <Title level="H4">
                        {value?.title
                            ? `${value.code} - ${value.title}`
                            : t("policy.object.summaryTitle", {
                                  defaultValue: "جزئیات سیاست",
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
                    <div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
                                gap: "0.75rem",
                                padding: "0.75rem 1rem",
                                border: "1px solid var(--sapGroup_ContentBorderColor)",
                                borderBottom: "none",
                                background: "var(--sapGroup_ContentBackground)",
                            }}
                        >
                            <DetailRow
                                label={t("policy.fields.name", { defaultValue: "نام" })}
                                value={value.title}
                            />
                            <DetailRow
                                label={t("policy.fields.code", { defaultValue: "کد" })}
                                value={value.code}
                            />
                            <DetailRow
                                label={t("policy.fields.type", { defaultValue: "نوع" })}
                                value={resolveNodeTypeLabel(value.nodeType, t)}
                            />
                            <DetailRow
                                label={t("policy.fields.status", { defaultValue: "وضعیت" })}
                                value={resolveStatusLabel(value.status, t)}
                            />
                        </div>

                        <PolicyTabs
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
                        {t("policy.object.selectPrompt", {
                            defaultValue: "برای مشاهده جزئیات، یک آیتم سیاست را انتخاب کنید.",
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
