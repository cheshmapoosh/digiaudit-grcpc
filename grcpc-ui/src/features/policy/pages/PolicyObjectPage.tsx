import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
import {
    Button,
    Input,
    Label,
    MessageStrip,
    Option,
    Select,
    Tab,
    TabContainer,
    TabSeparator,
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import type {
    PolicyCategory,
    PolicyCommunicationMethod,
    PolicyKind,
    PolicyNode,
    PolicyNodeCreate,
    PolicyNodeType,
    PolicyNodeUpdate,
    PolicyStatus,
} from "../domain/policy.model";

export type PolicyObjectMode = "create" | "edit" | "view";

type PolicyTabKey =
    | "general"
    | "documents"
    | "scope"
    | "risks"
    | "controls"
    | "sources"
    | "roles"
    | "reviewApproval";

interface PolicyFormState {
    code: string;
    title: string;
    nodeType: PolicyNodeType;
    parentId: string | null;
    status: PolicyStatus;
    sortOrder: string;
    description: string;
    policyCategory: PolicyCategory;
    policyKind: PolicyKind;
    ownerName: string;
    ownerOrganization: string;
    creatorName: string;
    documentsCount: string;
    version: string;
    validFrom: string;
    validTo: string;
    nextReviewDate: string;
    communicationMethod: PolicyCommunicationMethod;
    communicationLanguage: string;
    objective: string;
    note: string;
    evaluationConfirmed: boolean;
}

export interface PolicyObjectPageProps {
    mode: PolicyObjectMode;
    allItems: PolicyNode[];
    value: PolicyNode | null;
    parent?: PolicyNode | null;
    requestedNodeType?: PolicyNodeType;
    busy?: boolean;
    error?: string | null;
    onSubmit: (payload: PolicyNodeCreate | PolicyNodeUpdate) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
}

const ROOT_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
    background: "var(--sapBackgroundColor)",
};

const HEADER_STYLE: CSSProperties = {
    border: "1px solid var(--sapGroup_ContentBorderColor)",
    borderBottom: "none",
    background: "var(--sapGroup_ContentBackground)",
};

const HEADER_TITLE_STYLE: CSSProperties = {
    padding: "0.5rem 1rem",
    borderBottom: "1px solid var(--sapGroup_ContentBorderColor)",
    background: "var(--sapList_HeaderBackground)",
    fontWeight: 700,
};

const HEADER_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.35rem 1rem",
    padding: "0.75rem 1rem",
    minHeight: "4.5rem",
};

const HEADER_ROW_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "7rem minmax(0, 1fr)",
    gap: "0.5rem",
    alignItems: "center",
};

const POLICY_TAB_CONTAINER_CLASS = "policyObjectTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${POLICY_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${POLICY_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${POLICY_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${POLICY_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
    content: none;
    display: none;
    border: 0;
}`,
);

const TAB_CONTAINER_STYLE: CSSProperties = {
    borderInline: "1px solid var(--sapGroup_ContentBorderColor)",
    borderTop: "1px solid var(--sapGroup_ContentBorderColor)",
    background: "var(--sapBackgroundColor)",
};

const BODY_STYLE: CSSProperties = {
    borderInline: "1px solid var(--sapGroup_ContentBorderColor)",
    borderBottom: "1px solid var(--sapGroup_ContentBorderColor)",
    background: "var(--sapBackgroundColor)",
    minHeight: "22rem",
    padding: "1rem",
};

const FORM_GRID_STYLE: CSSProperties = {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};

const FIELD_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.35rem",
};

const FULL_WIDTH_STYLE: CSSProperties = {
    gridColumn: "1 / -1",
};

const FOOTER_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    flexWrap: "wrap",
    padding: "1rem 0 0",
};

const ACTION_BUTTON_STYLE: CSSProperties = {
    minWidth: "8rem",
};

const TABLE_PANEL_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
    minHeight: "15rem",
    background: "var(--sapGroup_ContentBackground)",
    border: "1px solid var(--sapList_BorderColor)",
    padding: "1rem",
};

const TABLE_ACTIONS_STYLE: CSSProperties = {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "flex-start",
    flexWrap: "wrap",
};

const TABLE_STYLE: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    background: "var(--sapList_Background)",
};

const TABLE_HEADER_STYLE: CSSProperties = {
    background: "var(--sapList_HeaderBackground)",
    border: "1px solid var(--sapList_BorderColor)",
    padding: "0.5rem",
    fontWeight: 700,
};

const TABLE_CELL_STYLE: CSSProperties = {
    border: "1px solid var(--sapList_BorderColor)",
    padding: "0.5rem",
    height: "2rem",
};

function toFormState(
    value: PolicyNode | null,
    parent: PolicyNode | null | undefined,
    requestedNodeType: PolicyNodeType | undefined,
): PolicyFormState {
    return {
        code: value?.code ?? "",
        title: value?.title ?? "",
        nodeType: value?.nodeType ?? requestedNodeType ?? "policyGroup",
        parentId: value?.parentId ?? parent?.id ?? null,
        status: value?.status ?? "draft",
        sortOrder: value?.sortOrder?.toString() ?? "",
        description: value?.description ?? "",
        policyCategory: value?.policyCategory ?? "it",
        policyKind: value?.policyKind ?? "policy",
        ownerName: value?.ownerName ?? "",
        ownerOrganization: value?.ownerOrganization ?? "",
        creatorName: value?.creatorName ?? "",
        documentsCount: value?.documentsCount?.toString() ?? "",
        version: value?.version ?? "01",
        validFrom: value?.validFrom ?? "",
        validTo: value?.validTo ?? "",
        nextReviewDate: value?.nextReviewDate ?? "",
        communicationMethod: value?.communicationMethod ?? "announcement",
        communicationLanguage: value?.communicationLanguage ?? "فارسی",
        objective: value?.objective ?? "",
        note: value?.note ?? "",
        evaluationConfirmed: value?.evaluationConfirmed ?? false,
    };
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

function readSelectedDataValue(event: unknown, fallback: string): string {
    const selectedOption = (event as {
        detail?: {
            selectedOption?: {
                getAttribute?: (name: string) => string | null;
            };
        };
    }).detail?.selectedOption;

    return selectedOption?.getAttribute?.("data-value") ?? fallback;
}

function readSelectedTabKey(event: unknown): PolicyTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as PolicyTabKey | null) ?? null;
}

function normalizeOptionalText(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function parseOptionalInteger(value: string): number | undefined {
    if (!value.trim()) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function HeaderItem({ label, value }: { label: string; value?: string | null }) {
    return (
        <div style={HEADER_ROW_STYLE}>
            <strong>{label}:</strong>
            <span style={{ minWidth: 0, wordBreak: "break-word" }}>
                {value?.trim() ? value : "-"}
            </span>
        </div>
    );
}

function FormField({
    label,
    required = false,
    fullWidth = false,
    children,
}: {
    label: string;
    required?: boolean;
    fullWidth?: boolean;
    children: ReactNode;
}) {
    return (
        <div style={{ ...FIELD_STYLE, ...(fullWidth ? FULL_WIDTH_STYLE : undefined) }}>
            <Label showColon required={required}>
                {label}
            </Label>
            {children}
        </div>
    );
}

function resolveNodeTypeLabel(
    nodeType: PolicyNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<PolicyNodeType, string> = {
        policyGroup: t("policy.nodeType.policyGroup", { defaultValue: "گروه سیاست" }),
        policy: t("policy.nodeType.policy", { defaultValue: "سیاست" }),
    };

    return map[nodeType];
}

function resolveStatusLabel(
    status: PolicyStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<PolicyStatus, string> = {
        draft: t("policy.status.draft", { defaultValue: "پیش‌نویس" }),
        underReview: t("policy.status.underReview", { defaultValue: "در حال بررسی" }),
        pendingApproval: t("policy.status.pendingApproval", { defaultValue: "در انتظار تأیید" }),
        approved: t("policy.status.approved", { defaultValue: "تأیید شده" }),
        inactive: t("common.inactive", { defaultValue: "غیرفعال" }),
    };

    return map[status];
}

function resolveCategoryLabel(
    category: PolicyCategory,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<PolicyCategory, string> = {
        hr: t("policy.category.hr", { defaultValue: "منابع انسانی" }),
        accounting: t("policy.category.accounting", { defaultValue: "حسابداری" }),
        purchase: t("policy.category.purchase", { defaultValue: "خرید" }),
        it: t("policy.category.it", { defaultValue: "فناوری اطلاعات" }),
        finance: t("policy.category.finance", { defaultValue: "مالی" }),
        compliance: t("policy.category.compliance", { defaultValue: "انطباق" }),
        other: t("policy.category.other", { defaultValue: "سایر" }),
    };

    return map[category];
}

function resolvePolicyKindLabel(
    kind: PolicyKind,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<PolicyKind, string> = {
        policy: t("policy.kind.policy", { defaultValue: "سیاست" }),
        procedure: t("policy.kind.procedure", { defaultValue: "دستورالعمل" }),
        announcement: t("policy.kind.announcement", { defaultValue: "اطلاعیه" }),
        workInstruction: t("policy.kind.workInstruction", { defaultValue: "روش اجرایی" }),
    };

    return map[kind];
}

function resolveCommunicationMethodLabel(
    method: PolicyCommunicationMethod,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<PolicyCommunicationMethod, string> = {
        announcement: t("policy.communication.announcement", { defaultValue: "اطلاعیه" }),
        questionnaire: t("policy.communication.questionnaire", { defaultValue: "پرسشنامه" }),
        survey: t("policy.communication.survey", { defaultValue: "نظرسنجی" }),
    };

    return map[method];
}

function defaultTabs(nodeType: PolicyNodeType): PolicyTabKey[] {
    if (nodeType === "policyGroup") {
        return ["general", "documents"];
    }

    return [
        "general",
        "documents",
        "scope",
        "risks",
        "controls",
        "sources",
        "roles",
        "reviewApproval",
    ];
}

function resolveTabLabel(tab: PolicyTabKey, t: ReturnType<typeof useTranslation>["t"]): string {
    const labels: Record<PolicyTabKey, string> = {
        general: t("policy.tabs.general", { defaultValue: "اطلاعات کلی" }),
        documents: t("policy.tabs.documents", { defaultValue: "مستند سیاست" }),
        scope: t("policy.tabs.scope", { defaultValue: "دامنه سیاست" }),
        risks: t("policy.tabs.risks", { defaultValue: "ریسک‌ها" }),
        controls: t("policy.tabs.controls", { defaultValue: "کنترل‌ها" }),
        sources: t("policy.tabs.sources", { defaultValue: "منابع سیاست" }),
        roles: t("policy.tabs.roles", { defaultValue: "نقش‌ها" }),
        reviewApproval: t("policy.tabs.reviewApproval", { defaultValue: "بازنگری و تصویب" }),
    };

    return labels[tab];
}

function PolicyTabs({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: PolicyTabKey[];
    activeTab: PolicyTabKey;
    onChange: (tab: PolicyTabKey) => void;
}) {
    const { t } = useTranslation();

    return (
        <TabContainer
            className={POLICY_TAB_CONTAINER_CLASS}
            onTabSelect={(event) => {
                const nextTab = readSelectedTabKey(event);
                if (nextTab) {
                    onChange(nextTab);
                }
            }}
            style={TAB_CONTAINER_STYLE}
        >
            {tabs.flatMap((tab, index) => {
                const item = (
                    <Tab
                        key={tab}
                        text={resolveTabLabel(tab, t)}
                        selected={activeTab === tab}
                        data-tab-key={tab}
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
        </TabContainer>
    );
}

function TablePlaceholder({
    title,
    columns,
    actions,
}: {
    title: string;
    columns: string[];
    actions?: ReactNode;
}) {
    return (
        <div style={TABLE_PANEL_STYLE}>
            <Title level="H5">{title}</Title>

            {actions ? <div style={TABLE_ACTIONS_STYLE}>{actions}</div> : null}

            <table style={TABLE_STYLE}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column} style={TABLE_HEADER_STYLE}>
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {[0, 1, 2].map((row) => (
                        <tr key={row}>
                            {columns.map((column) => (
                                <td key={column} style={TABLE_CELL_STYLE}>
                                    &nbsp;
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function PolicyObjectPage({
    mode,
    allItems,
    value,
    parent,
    requestedNodeType,
    busy = false,
    error,
    onSubmit,
    onCancel,
    onEdit,
}: PolicyObjectPageProps) {
    const { t } = useTranslation();
    const readOnly = mode === "view";

    const [form, setForm] = useState<PolicyFormState>(() =>
        toFormState(value, parent, requestedNodeType),
    );

    const [validationError, setValidationError] = useState<string | null>(null);
    const tabs = useMemo(() => defaultTabs(form.nodeType), [form.nodeType]);
    const [activeTab, setActiveTab] = useState<PolicyTabKey>("general");

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? parent ?? null
        : null;

    const headerTitle = form.title || value?.title || "";
    const headerParent = selectedParent
        ? `${selectedParent.code} - ${selectedParent.title}`
        : t("common.none", { defaultValue: "ندارد" });
    const headerType = resolveNodeTypeLabel(form.nodeType, t);
    const headerStatus = resolveStatusLabel(form.status, t);
    const headerCategory = resolveCategoryLabel(form.policyCategory, t);
    const headerCommunication = resolveCommunicationMethodLabel(form.communicationMethod, t);

    const handleChange = <K extends keyof PolicyFormState>(
        key: K,
        nextValue: PolicyFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const validate = (): boolean => {
        if (!form.code.trim()) {
            setValidationError(
                t("policy.validation.codeRequired", { defaultValue: "کد الزامی است" }),
            );
            return false;
        }

        if (!form.title.trim()) {
            setValidationError(
                t("policy.validation.titleRequired", { defaultValue: "نام الزامی است" }),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseOptionalInteger(form.sortOrder) === undefined) {
            setValidationError(
                t("policy.validation.sortOrderInvalid", {
                    defaultValue: "ترتیب نمایش باید عدد صحیح نامنفی باشد",
                }),
            );
            return false;
        }

        if (
            form.documentsCount.trim() &&
            parseOptionalInteger(form.documentsCount) === undefined
        ) {
            setValidationError(
                t("policy.validation.documentsCountInvalid", {
                    defaultValue: "تعداد مستندات باید عدد صحیح نامنفی باشد",
                }),
            );
            return false;
        }

        setValidationError(null);
        return true;
    };

    const buildPayload = (statusOverride?: PolicyStatus): PolicyNodeCreate | PolicyNodeUpdate => {
        const basePayload: PolicyNodeCreate | PolicyNodeUpdate = {
            code: form.code.trim(),
            title: form.title.trim(),
            nodeType: form.nodeType,
            parentId: form.parentId,
            status: statusOverride ?? form.status,
            sortOrder: parseOptionalInteger(form.sortOrder),
            description: normalizeOptionalText(form.description),
            policyCategory: form.policyCategory,
            ownerName: normalizeOptionalText(form.ownerName),
            ownerOrganization: normalizeOptionalText(form.ownerOrganization),
            documentsCount: parseOptionalInteger(form.documentsCount),
            validFrom: normalizeOptionalText(form.validFrom),
            validTo: normalizeOptionalText(form.validTo),
            evaluationConfirmed: form.evaluationConfirmed,
        };

        if (form.nodeType === "policyGroup") {
            return basePayload;
        }

        return {
            ...basePayload,
            policyKind: form.policyKind,
            creatorName: normalizeOptionalText(form.creatorName),
            version: normalizeOptionalText(form.version),
            nextReviewDate: normalizeOptionalText(form.nextReviewDate),
            communicationMethod: form.communicationMethod,
            communicationLanguage: normalizeOptionalText(form.communicationLanguage),
            objective: normalizeOptionalText(form.objective),
            note: normalizeOptionalText(form.note),
        };
    };

    const handleSubmit = async (statusOverride?: PolicyStatus) => {
        if (readOnly || !validate()) {
            return;
        }

        await onSubmit(buildPayload(statusOverride));
    };

    const renderStatusSelect = () => (
        <Select
            disabled={readOnly || busy}
            onChange={(event) => {
                const nextValue = readSelectedDataValue(event, form.status);
                handleChange("status", nextValue as PolicyStatus);
            }}
        >
            <Option data-value="draft" selected={form.status === "draft"}>
                {resolveStatusLabel("draft", t)}
            </Option>
            <Option data-value="underReview" selected={form.status === "underReview"}>
                {resolveStatusLabel("underReview", t)}
            </Option>
            <Option data-value="pendingApproval" selected={form.status === "pendingApproval"}>
                {resolveStatusLabel("pendingApproval", t)}
            </Option>
            <Option data-value="approved" selected={form.status === "approved"}>
                {resolveStatusLabel("approved", t)}
            </Option>
            <Option data-value="inactive" selected={form.status === "inactive"}>
                {resolveStatusLabel("inactive", t)}
            </Option>
        </Select>
    );

    const renderGeneralTab = () => (
        <>
            <div style={FORM_GRID_STYLE}>
                <FormField label={t("policy.fields.code", { defaultValue: "شناسه" })} required>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("policy.fields.name", { defaultValue: "نام" })} required>
                    <Input
                        value={form.title}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("title", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("policy.fields.parent", { defaultValue: "والد" })}>
                    <Input value={headerParent} readonly />
                </FormField>

                <FormField label={t("policy.fields.type", { defaultValue: "نوع" })}>
                    <Input value={headerType} readonly />
                </FormField>

                {form.nodeType === "policy" ? (
                    <FormField label={t("policy.fields.policyKind", { defaultValue: "نوع سیاست" })}>
                        <Select
                            disabled={readOnly || busy}
                            onChange={(event) => {
                                const nextValue = readSelectedDataValue(event, form.policyKind);
                                handleChange("policyKind", nextValue as PolicyKind);
                            }}
                        >
                            <Option data-value="policy" selected={form.policyKind === "policy"}>
                                {resolvePolicyKindLabel("policy", t)}
                            </Option>
                            <Option
                                data-value="procedure"
                                selected={form.policyKind === "procedure"}
                            >
                                {resolvePolicyKindLabel("procedure", t)}
                            </Option>
                            <Option
                                data-value="announcement"
                                selected={form.policyKind === "announcement"}
                            >
                                {resolvePolicyKindLabel("announcement", t)}
                            </Option>
                            <Option
                                data-value="workInstruction"
                                selected={form.policyKind === "workInstruction"}
                            >
                                {resolvePolicyKindLabel("workInstruction", t)}
                            </Option>
                        </Select>
                    </FormField>
                ) : null}

                <FormField
                    label={t("policy.fields.policyCategory", {
                        defaultValue: "دسته‌بندی سیاست",
                    })}
                >
                    <Select
                        disabled={readOnly || busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.policyCategory);
                            handleChange("policyCategory", nextValue as PolicyCategory);
                        }}
                    >
                        <Option data-value="hr" selected={form.policyCategory === "hr"}>
                            {resolveCategoryLabel("hr", t)}
                        </Option>
                        <Option
                            data-value="accounting"
                            selected={form.policyCategory === "accounting"}
                        >
                            {resolveCategoryLabel("accounting", t)}
                        </Option>
                        <Option
                            data-value="purchase"
                            selected={form.policyCategory === "purchase"}
                        >
                            {resolveCategoryLabel("purchase", t)}
                        </Option>
                        <Option data-value="it" selected={form.policyCategory === "it"}>
                            {resolveCategoryLabel("it", t)}
                        </Option>
                        <Option
                            data-value="finance"
                            selected={form.policyCategory === "finance"}
                        >
                            {resolveCategoryLabel("finance", t)}
                        </Option>
                        <Option
                            data-value="compliance"
                            selected={form.policyCategory === "compliance"}
                        >
                            {resolveCategoryLabel("compliance", t)}
                        </Option>
                        <Option data-value="other" selected={form.policyCategory === "other"}>
                            {resolveCategoryLabel("other", t)}
                        </Option>
                    </Select>
                </FormField>

                <FormField label={t("policy.fields.status", { defaultValue: "وضعیت" })}>
                    {renderStatusSelect()}
                </FormField>

                <FormField
                    label={t("policy.fields.sortOrder", { defaultValue: "ترتیب نمایش" })}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("policy.fields.owner", { defaultValue: "مالک" })}>
                    <Input
                        value={form.ownerName}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("ownerName", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("policy.fields.ownerOrganization", {
                        defaultValue: "سازمان مسئول",
                    })}
                >
                    <Input
                        value={form.ownerOrganization}
                        disabled={readOnly || busy}
                        onInput={(event) =>
                            handleChange("ownerOrganization", readInputValue(event))
                        }
                    />
                </FormField>

                {form.nodeType === "policy" ? (
                    <>
                        <FormField
                            label={t("policy.fields.creatorName", {
                                defaultValue: "ایجاد کننده",
                            })}
                        >
                            <Input
                                value={form.creatorName}
                                disabled={readOnly || busy}
                                onInput={(event) =>
                                    handleChange("creatorName", readInputValue(event))
                                }
                            />
                        </FormField>

                        <FormField label={t("policy.fields.version", { defaultValue: "نسخه" })}>
                            <Input
                                value={form.version}
                                disabled={readOnly || busy}
                                onInput={(event) => handleChange("version", readInputValue(event))}
                            />
                        </FormField>
                    </>
                ) : null}

                <FormField
                    label={t("policy.fields.validFrom", { defaultValue: "تاریخ شروع اعتبار" })}
                >
                    <Input
                        value={form.validFrom}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("validFrom", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("policy.fields.validTo", { defaultValue: "تاریخ پایان اعتبار" })}
                >
                    <Input
                        value={form.validTo}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("validTo", readInputValue(event))}
                    />
                </FormField>

                {form.nodeType === "policy" ? (
                    <>
                        <FormField
                            label={t("policy.fields.communicationMethod", {
                                defaultValue: "روش اطلاع‌رسانی",
                            })}
                        >
                            <Select
                                disabled={readOnly || busy}
                                onChange={(event) => {
                                    const nextValue = readSelectedDataValue(
                                        event,
                                        form.communicationMethod,
                                    );
                                    handleChange(
                                        "communicationMethod",
                                        nextValue as PolicyCommunicationMethod,
                                    );
                                }}
                            >
                                <Option
                                    data-value="announcement"
                                    selected={form.communicationMethod === "announcement"}
                                >
                                    {resolveCommunicationMethodLabel("announcement", t)}
                                </Option>
                                <Option
                                    data-value="questionnaire"
                                    selected={form.communicationMethod === "questionnaire"}
                                >
                                    {resolveCommunicationMethodLabel("questionnaire", t)}
                                </Option>
                                <Option
                                    data-value="survey"
                                    selected={form.communicationMethod === "survey"}
                                >
                                    {resolveCommunicationMethodLabel("survey", t)}
                                </Option>
                            </Select>
                        </FormField>

                        <FormField
                            label={t("policy.fields.communicationLanguage", {
                                defaultValue: "زبان اطلاع‌رسانی",
                            })}
                        >
                            <Input
                                value={form.communicationLanguage}
                                disabled={readOnly || busy}
                                onInput={(event) =>
                                    handleChange("communicationLanguage", readInputValue(event))
                                }
                            />
                        </FormField>

                        <FormField
                            label={t("policy.fields.nextReviewDate", {
                                defaultValue: "تاریخ بازنگری بعدی",
                            })}
                        >
                            <Input
                                value={form.nextReviewDate}
                                disabled={readOnly || busy}
                                onInput={(event) =>
                                    handleChange("nextReviewDate", readInputValue(event))
                                }
                            />
                        </FormField>
                    </>
                ) : (
                    <FormField
                        label={t("policy.fields.evaluationConfirmed", {
                            defaultValue: "تأیید ارزیابی",
                        })}
                    >
                        <Select
                            disabled={readOnly || busy}
                            onChange={(event) => {
                                const nextValue = readSelectedDataValue(
                                    event,
                                    form.evaluationConfirmed ? "true" : "false",
                                );
                                handleChange("evaluationConfirmed", nextValue === "true");
                            }}
                        >
                            <Option data-value="false" selected={!form.evaluationConfirmed}>
                                {t("common.no", { defaultValue: "خیر" })}
                            </Option>
                            <Option data-value="true" selected={form.evaluationConfirmed}>
                                {t("common.yes", { defaultValue: "بله" })}
                            </Option>
                        </Select>
                    </FormField>
                )}

                {form.nodeType === "policy" ? (
                    <>
                        <FormField label={t("policy.fields.objective", { defaultValue: "هدف" })} fullWidth>
                            <TextArea
                                rows={3}
                                value={form.objective}
                                disabled={readOnly || busy}
                                onInput={(event) =>
                                    handleChange("objective", readInputValue(event))
                                }
                            />
                        </FormField>

                        <FormField label={t("policy.fields.note", { defaultValue: "یادداشت" })} fullWidth>
                            <TextArea
                                rows={3}
                                value={form.note}
                                disabled={readOnly || busy}
                                onInput={(event) => handleChange("note", readInputValue(event))}
                            />
                        </FormField>
                    </>
                ) : null}

                <FormField
                    label={t("policy.fields.description", { defaultValue: "شرح" })}
                    fullWidth
                >
                    <TextArea
                        rows={5}
                        value={form.description}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("description", readInputValue(event))}
                    />
                </FormField>
            </div>

            <div style={FOOTER_STYLE}>{renderFooterActions()}</div>
        </>
    );

    function renderFooterActions() {
        if (mode === "view") {
            return (
                <>
                    <Button
                        design="Emphasized"
                        disabled={busy || !onEdit}
                        style={ACTION_BUTTON_STYLE}
                        onClick={onEdit}
                    >
                        {t("common.edit", { defaultValue: "ویرایش" })}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={onCancel}
                    >
                        {t("common.close", { defaultValue: "بستن" })}
                    </Button>
                </>
            );
        }

        if (form.nodeType === "policy") {
            return (
                <>
                    <Button
                        design="Emphasized"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={() => void handleSubmit("draft")}
                    >
                        {t("common.save", { defaultValue: "ذخیره" })}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={() => void handleSubmit("underReview")}
                    >
                        {t("policy.actions.sendForReview", { defaultValue: "ارسال برای بررسی" })}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={() => void handleSubmit("pendingApproval")}
                    >
                        {t("policy.actions.submitForApproval", { defaultValue: "ثبت برای تأیید" })}
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
            );
        }

        return (
            <>
                <Button
                    design="Emphasized"
                    disabled={busy}
                    style={ACTION_BUTTON_STYLE}
                    onClick={() => void handleSubmit()}
                >
                    {t("common.save", { defaultValue: "ثبت" })}
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
        );
    }

    const tableActionButtons = (createText = t("common.create", { defaultValue: "ایجاد" })) => (
        <>
            <Button design="Emphasized" disabled={busy || readOnly}>
                {createText}
            </Button>
            <Button design="Negative" disabled={busy || readOnly}>
                {t("common.delete", { defaultValue: "حذف" })}
            </Button>
        </>
    );

    const renderTabContent = () => {
        if (activeTab === "general") {
            return renderGeneralTab();
        }

        if (activeTab === "documents") {
            return (
                <TablePlaceholder
                    title={t("policy.tabs.documents", { defaultValue: "مستند سیاست" })}
                    actions={tableActionButtons()}
                    columns={[
                        t("policy.fields.documentType", { defaultValue: "نوع" }),
                        t("policy.fields.title", { defaultValue: "عنوان" }),
                        t("policy.fields.version", { defaultValue: "نسخه" }),
                        t("policy.fields.fileSize", { defaultValue: "اندازه فایل" }),
                        t("policy.fields.fileType", { defaultValue: "نوع فایل" }),
                        t("policy.fields.createdAt", { defaultValue: "تاریخ ایجاد" }),
                        t("policy.fields.creatorName", { defaultValue: "ایجاد کننده" }),
                    ]}
                />
            );
        }

        if (activeTab === "scope") {
            return (
                <TablePlaceholder
                    title={t("policy.tabs.scope", { defaultValue: "دامنه سیاست" })}
                    actions={tableActionButtons()}
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
                <TablePlaceholder
                    title={t("policy.tabs.risks", { defaultValue: "ریسک‌ها" })}
                    actions={tableActionButtons(t("policy.actions.assign", { defaultValue: "تخصیص" }))}
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
                <TablePlaceholder
                    title={t("policy.tabs.controls", { defaultValue: "کنترل‌ها" })}
                    actions={tableActionButtons(t("policy.actions.assign", { defaultValue: "تخصیص" }))}
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
                <TablePlaceholder
                    title={t("policy.tabs.sources", { defaultValue: "منابع سیاست" })}
                    actions={tableActionButtons(
                        t("policy.actions.addSources", { defaultValue: "اضافه نمودن منابع" }),
                    )}
                    columns={[
                        t("policy.fields.policySource", { defaultValue: "منابع سیاست" }),
                        t("policy.fields.type", { defaultValue: "نوع" }),
                    ]}
                />
            );
        }

        if (activeTab === "roles") {
            return (
                <TablePlaceholder
                    title={t("policy.tabs.roles", { defaultValue: "نقش‌ها" })}
                    actions={tableActionButtons(t("policy.actions.select", { defaultValue: "انتخاب" }))}
                    columns={[
                        t("policy.fields.roles", { defaultValue: "نقش‌ها" }),
                        t("policy.fields.type", { defaultValue: "نوع" }),
                    ]}
                />
            );
        }

        return (
            <TablePlaceholder
                title={t("policy.tabs.reviewApproval", { defaultValue: "بازنگری و تصویب" })}
                actions={tableActionButtons(t("policy.actions.assign", { defaultValue: "تخصیص" }))}
                columns={[
                    t("policy.fields.reviewerApprover", {
                        defaultValue: "بازنگری کنندگان / تصویب کنندگان",
                    }),
                    t("policy.fields.name", { defaultValue: "نام" }),
                    t("policy.fields.identifier", { defaultValue: "شناسه" }),
                ]}
            />
        );
    };

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {mode === "create"
                            ? t("policy.object.createModalTitle", { defaultValue: "ایجاد" })
                            : headerTitle ||
                              t("policy.object.modalTitle", {
                                  defaultValue: "مرکز سیاست",
                              })}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("policy.fields.policyGroup", {
                            defaultValue: "گروه سیاست",
                        })}
                        value={headerParent}
                    />
                    <HeaderItem
                        label={t("policy.fields.policyCategory", {
                            defaultValue: "دسته‌بندی",
                        })}
                        value={headerCategory}
                    />
                    <HeaderItem
                        label={t("policy.fields.communicationMethod", {
                            defaultValue: "روش اطلاع‌رسانی",
                        })}
                        value={form.nodeType === "policy" ? headerCommunication : "-"}
                    />
                    <HeaderItem
                        label={t("policy.fields.status", { defaultValue: "وضعیت" })}
                        value={headerStatus}
                    />
                    <HeaderItem
                        label={t("policy.fields.identifier", { defaultValue: "شناسه" })}
                        value={form.code || value?.id}
                    />
                    <HeaderItem
                        label={t("policy.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                        value={value?.createdAt}
                    />
                    <HeaderItem
                        label={t("policy.fields.validTo", { defaultValue: "تاریخ اعتبار" })}
                        value={form.validTo || value?.validTo}
                    />
                    <HeaderItem
                        label={t("policy.fields.version", { defaultValue: "نسخه" })}
                        value={form.nodeType === "policy" ? form.version : "-"}
                    />
                </div>
            </div>

            <PolicyTabs
                tabs={tabs}
                activeTab={tabs.includes(activeTab) ? activeTab : "general"}
                onChange={setActiveTab}
            />

            {error ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {error}
                </MessageStrip>
            ) : null}

            {validationError ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {validationError}
                </MessageStrip>
            ) : null}

            <div style={BODY_STYLE}>{renderTabContent()}</div>
        </div>
    );
}
