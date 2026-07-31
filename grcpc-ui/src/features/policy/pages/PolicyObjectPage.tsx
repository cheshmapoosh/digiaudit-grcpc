import {
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import {addCustomCSS} from "@ui5/webcomponents-base/dist/Theming.js";
import {useTranslation} from "react-i18next";
import {
    Button,
    DatePicker,
    Input,
    Label,
    MessageStrip,
    Option,
    Select,
    Tab,
    TabSeparator,
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import { DetailTabContainer } from "@/shared/components/DetailTabContainer";

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
import {
    formatPersianDate,
    toEnglishDigits,
} from "@/shared/utils/date.utils";
import { DocumentIntegrationDeferredMessage } from "@/features/document";

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
    onErrorClose?: () => void;
    onSubmit: (payload: PolicyNodeCreate | PolicyNodeUpdate) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
}

const ROOT_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
    minWidth: 0,
    maxWidth: "100%",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "0.35rem 1rem",
    padding: "0.75rem 1rem",
    minHeight: "4.5rem",
};

const HEADER_ROW_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(6.5rem, 40%) minmax(0, 1fr)",
    gap: "0.5rem",
    alignItems: "center",
    minWidth: 0,
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
    minWidth: 0,
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

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "d MMMM y";

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
        validFrom: toEnglishDigits(value?.validFrom ?? ""),
        validTo: toEnglishDigits(value?.validTo ?? ""),
        nextReviewDate: toEnglishDigits(value?.nextReviewDate ?? ""),
        communicationMethod: value?.communicationMethod ?? "announcement",
        communicationLanguage: value?.communicationLanguage ?? "ÙØ§Ø±Ø³ÛŒ",
        objective: value?.objective ?? "",
        note: value?.note ?? "",
        evaluationConfirmed: value?.evaluationConfirmed ?? false,
    };
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

function readDatePickerValue(event: unknown): string {
    const detailValue = (event as { detail?: { value?: string } }).detail?.value;

    return toEnglishDigits(detailValue ?? readInputValue(event));
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

function HeaderItem({label, value}: { label: string; value?: string | null }) {
    return (
        <div style={HEADER_ROW_STYLE}>
            <strong>{label}:</strong>
            <span style={{minWidth: 0, wordBreak: "break-word"}}>
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
        <div style={{...FIELD_STYLE, ...(fullWidth ? FULL_WIDTH_STYLE : undefined)}}>
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
        policyGroup: t("policy.nodeType.policyGroup", {defaultValue: "Ú¯Ø±ÙˆÙ‡ Ø³ÛŒØ§Ø³Øª"}),
        policy: t("policy.nodeType.policy", {defaultValue: "Ø³ÛŒØ§Ø³Øª"}),
    };

    return map[nodeType];
}

function resolveStatusLabel(
    status: PolicyStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<PolicyStatus, string> = {
        draft: t("policy.status.draft", {defaultValue: "Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³"}),
        underReview: t("policy.status.underReview", {defaultValue: "Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø±Ø±Ø³ÛŒ"}),
        pendingApproval: t("policy.status.pendingApproval", {defaultValue: "Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± ØªØ£ÛŒÛŒØ¯"}),
        approved: t("policy.status.approved", {defaultValue: "ØªØ£ÛŒÛŒØ¯ Ø´Ø¯Ù‡"}),
        inactive: t("common.inactive", {defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„"}),
    };

    return map[status];
}

function resolveCategoryLabel(
    category: PolicyCategory,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<PolicyCategory, string> = {
        hr: t("policy.category.hr", {defaultValue: "Ù…Ù†Ø§Ø¨Ø¹ Ø§Ù†Ø³Ø§Ù†ÛŒ"}),
        accounting: t("policy.category.accounting", {defaultValue: "Ø­Ø³Ø§Ø¨Ø¯Ø§Ø±ÛŒ"}),
        purchase: t("policy.category.purchase", {defaultValue: "Ø®Ø±ÛŒØ¯"}),
        it: t("policy.category.it", {defaultValue: "ÙÙ†Ø§ÙˆØ±ÛŒ Ø§Ø·Ù„Ø§Ø¹Ø§Øª"}),
        finance: t("policy.category.finance", {defaultValue: "Ù…Ø§Ù„ÛŒ"}),
        compliance: t("policy.category.compliance", {defaultValue: "Ø§Ù†Ø·Ø¨Ø§Ù‚"}),
        other: t("policy.category.other", {defaultValue: "Ø³Ø§ÛŒØ±"}),
    };

    return map[category];
}

function resolvePolicyKindLabel(
    kind: PolicyKind,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<PolicyKind, string> = {
        policy: t("policy.kind.policy", {defaultValue: "Ø³ÛŒØ§Ø³Øª"}),
        procedure: t("policy.kind.procedure", {defaultValue: "Ø¯Ø³ØªÙˆØ±Ø§Ù„Ø¹Ù…Ù„"}),
        announcement: t("policy.kind.announcement", {defaultValue: "Ø§Ø·Ù„Ø§Ø¹ÛŒÙ‡"}),
        workInstruction: t("policy.kind.workInstruction", {defaultValue: "Ø±ÙˆØ´ Ø§Ø¬Ø±Ø§ÛŒÛŒ"}),
    };

    return map[kind];
}

function resolveCommunicationMethodLabel(
    method: PolicyCommunicationMethod,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<PolicyCommunicationMethod, string> = {
        announcement: t("policy.communication.announcement", {defaultValue: "Ø§Ø·Ù„Ø§Ø¹ÛŒÙ‡"}),
        questionnaire: t("policy.communication.questionnaire", {defaultValue: "Ù¾Ø±Ø³Ø´Ù†Ø§Ù…Ù‡"}),
        survey: t("policy.communication.survey", {defaultValue: "Ù†Ø¸Ø±Ø³Ù†Ø¬ÛŒ"}),
    };

    return map[method];
}

function defaultTabs(nodeType: PolicyNodeType): PolicyTabKey[] {
    if (nodeType === "policyGroup") {
        return ["general", "documents"];
    }

    return [
        "general",
        "scope",
        "risks",
        "controls",
        "sources",
        "roles",
        "reviewApproval",
        "documents",
    ];
}

function resolveTabLabel(tab: PolicyTabKey, t: ReturnType<typeof useTranslation>["t"]): string {
    const labels: Record<PolicyTabKey, string> = {
        general: t("policy.tabs.general", {defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ"}),
        scope: t("policy.tabs.scope", {defaultValue: "Ø¯Ø§Ù…Ù†Ù‡ Ø³ÛŒØ§Ø³Øª"}),
        risks: t("policy.tabs.risks", {defaultValue: "Ø±ÛŒØ³Ú©â€ŒÙ‡Ø§"}),
        controls: t("policy.tabs.controls", {defaultValue: "Ú©Ù†ØªØ±Ù„â€ŒÙ‡Ø§"}),
        sources: t("policy.tabs.sources", {defaultValue: "Ù…Ù†Ø§Ø¨Ø¹ Ø³ÛŒØ§Ø³Øª"}),
        roles: t("policy.tabs.roles", {defaultValue: "Ù†Ù‚Ø´â€ŒÙ‡Ø§"}),
        reviewApproval: t("policy.tabs.reviewApproval", {defaultValue: "Ø¨Ø§Ø²Ù†Ú¯Ø±ÛŒ Ùˆ ØªØµÙˆÛŒØ¨"}),
        documents: t("policy.tabs.documents", {defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª"}),
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
    const {t} = useTranslation();

    return (
        <DetailTabContainer
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
                    return [<TabSeparator key="general-separator"/>, item];
                }

                return [item];
            })}
        </DetailTabContainer>
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
                                             onErrorClose,
                                             onSubmit,
                                             onCancel,
                                             onEdit,
                                         }: PolicyObjectPageProps) {
    const {t} = useTranslation();
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
        : t("common.none", {defaultValue: "Ù†Ø¯Ø§Ø±Ø¯"});
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
                t("policy.validation.codeRequired", {defaultValue: "Ú©Ø¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª"}),
            );
            return false;
        }

        if (!form.title.trim()) {
            setValidationError(
                t("policy.validation.titleRequired", {defaultValue: "Ù†Ø§Ù… Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª"}),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseOptionalInteger(form.sortOrder) === undefined) {
            setValidationError(
                t("policy.validation.sortOrderInvalid", {
                    defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´ Ø¨Ø§ÛŒØ¯ Ø¹Ø¯Ø¯ ØµØ­ÛŒØ­ Ù†Ø§Ù…Ù†ÙÛŒ Ø¨Ø§Ø´Ø¯",
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
                    defaultValue: "ØªØ¹Ø¯Ø§Ø¯ Ù…Ø³ØªÙ†Ø¯Ø§Øª Ø¨Ø§ÛŒØ¯ Ø¹Ø¯Ø¯ ØµØ­ÛŒØ­ Ù†Ø§Ù…Ù†ÙÛŒ Ø¨Ø§Ø´Ø¯",
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
                <FormField label={t("policy.fields.code", {defaultValue: "Ø´Ù†Ø§Ø³Ù‡"})} required>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("policy.fields.name", {defaultValue: "Ù†Ø§Ù…"})} required>
                    <Input
                        value={form.title}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("title", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("policy.fields.parent", {defaultValue: "ÙˆØ§Ù„Ø¯"})}>
                    <Input value={headerParent} readonly/>
                </FormField>

                <FormField label={t("policy.fields.type", {defaultValue: "Ù†ÙˆØ¹"})}>
                    <Input value={headerType} readonly/>
                </FormField>

                {form.nodeType === "policy" ? (
                    <FormField label={t("policy.fields.policyKind", {defaultValue: "Ù†ÙˆØ¹ Ø³ÛŒØ§Ø³Øª"})}>
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
                        defaultValue: "Ø¯Ø³ØªÙ‡â€ŒØ¨Ù†Ø¯ÛŒ Ø³ÛŒØ§Ø³Øª",
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

                <FormField label={t("policy.fields.status", {defaultValue: "ÙˆØ¶Ø¹ÛŒØª"})}>
                    {renderStatusSelect()}
                </FormField>

                <FormField
                    label={t("policy.fields.sortOrder", {defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´"})}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("policy.fields.owner", {defaultValue: "Ù…Ø§Ù„Ú©"})}>
                    <Input
                        value={form.ownerName}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("ownerName", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("policy.fields.ownerOrganization", {
                        defaultValue: "Ø³Ø§Ø²Ù…Ø§Ù† Ù…Ø³Ø¦ÙˆÙ„",
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
                                defaultValue: "Ø§ÛŒØ¬Ø§Ø¯ Ú©Ù†Ù†Ø¯Ù‡",
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

                        <FormField label={t("policy.fields.version", {defaultValue: "Ù†Ø³Ø®Ù‡"})}>
                            <Input
                                value={form.version}
                                disabled={readOnly || busy}
                                onInput={(event) => handleChange("version", readInputValue(event))}
                            />
                        </FormField>
                    </>
                ) : null}

                <FormField
                    label={t("policy.fields.validFrom", {defaultValue: "ØªØ§Ø±ÛŒØ® Ø´Ø±ÙˆØ¹ Ø§Ø¹ØªØ¨Ø§Ø±"})}
                >
                    <DatePicker
                        value={form.validFrom}
                        valueFormat={DATE_VALUE_FORMAT}
                        displayFormat={DATE_DISPLAY_FORMAT}
                        primaryCalendarType="Persian"
                        disabled={readOnly || busy}
                        placeholder={t("organization.fields.datePlaceholder", {
                            defaultValue: "Ø³Ø§Ù„/Ù…Ø§Ù‡/Ø±ÙˆØ²",
                        })}
                        onChange={(event) =>
                            handleChange("validFrom", readDatePickerValue(event))
                        }
                    />
                </FormField>

                <FormField
                    label={t("policy.fields.validTo", {defaultValue: "ØªØ§Ø±ÛŒØ® Ù¾Ø§ÛŒØ§Ù† Ø§Ø¹ØªØ¨Ø§Ø±"})}
                >
                    <DatePicker
                        value={form.validTo}
                        valueFormat={DATE_VALUE_FORMAT}
                        displayFormat={DATE_DISPLAY_FORMAT}
                        primaryCalendarType="Persian"
                        disabled={readOnly || busy}
                        placeholder={t("organization.fields.datePlaceholder", {
                            defaultValue: "Ø³Ø§Ù„/Ù…Ø§Ù‡/Ø±ÙˆØ²",
                        })}
                        onChange={(event) =>
                            handleChange("validTo", readDatePickerValue(event))
                        }
                    />
                </FormField>

                {form.nodeType === "policy" ? (
                    <>
                        <FormField
                            label={t("policy.fields.communicationMethod", {
                                defaultValue: "Ø±ÙˆØ´ Ø§Ø·Ù„Ø§Ø¹â€ŒØ±Ø³Ø§Ù†ÛŒ",
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
                                defaultValue: "Ø²Ø¨Ø§Ù† Ø§Ø·Ù„Ø§Ø¹â€ŒØ±Ø³Ø§Ù†ÛŒ",
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
                                defaultValue: "ØªØ§Ø±ÛŒØ® Ø¨Ø§Ø²Ù†Ú¯Ø±ÛŒ Ø¨Ø¹Ø¯ÛŒ",
                            })}
                        >
                            <DatePicker
                                value={form.nextReviewDate}
                                valueFormat={DATE_VALUE_FORMAT}
                                displayFormat={DATE_DISPLAY_FORMAT}
                                primaryCalendarType="Persian"
                                disabled={readOnly || busy}
                                placeholder={t("organization.fields.datePlaceholder", {
                                    defaultValue: "Ø³Ø§Ù„/Ù…Ø§Ù‡/Ø±ÙˆØ²",
                                })}
                                onChange={(event) =>
                                    handleChange("nextReviewDate", readDatePickerValue(event))
                                }
                            />
                        </FormField>
                    </>
                ) : (
                    <FormField
                        label={t("policy.fields.evaluationConfirmed", {
                            defaultValue: "ØªØ£ÛŒÛŒØ¯ Ø§Ø±Ø²ÛŒØ§Ø¨ÛŒ",
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
                                {t("common.no", {defaultValue: "Ø®ÛŒØ±"})}
                            </Option>
                            <Option data-value="true" selected={form.evaluationConfirmed}>
                                {t("common.yes", {defaultValue: "Ø¨Ù„Ù‡"})}
                            </Option>
                        </Select>
                    </FormField>
                )}

                {form.nodeType === "policy" ? (
                    <>
                        <FormField label={t("policy.fields.objective", {defaultValue: "Ù‡Ø¯Ù"})} fullWidth>
                            <TextArea
                                rows={3}
                                value={form.objective}
                                disabled={readOnly || busy}
                                onInput={(event) =>
                                    handleChange("objective", readInputValue(event))
                                }
                            />
                        </FormField>

                        <FormField label={t("policy.fields.note", {defaultValue: "ÛŒØ§Ø¯Ø¯Ø§Ø´Øª"})} fullWidth>
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
                    label={t("policy.fields.description", {defaultValue: "Ø´Ø±Ø­"})}
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
                        {t("common.edit", {defaultValue: "ÙˆÛŒØ±Ø§ÛŒØ´"})}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={onCancel}
                    >
                        {t("common.close", {defaultValue: "Ø¨Ø³ØªÙ†"})}
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
                        {t("common.save", {defaultValue: "Ø°Ø®ÛŒØ±Ù‡"})}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={() => void handleSubmit("underReview")}
                    >
                        {t("policy.actions.sendForReview", {defaultValue: "Ø§Ø±Ø³Ø§Ù„ Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ø±Ø³ÛŒ"})}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={() => void handleSubmit("pendingApproval")}
                    >
                        {t("policy.actions.submitForApproval", {defaultValue: "Ø«Ø¨Øª Ø¨Ø±Ø§ÛŒ ØªØ£ÛŒÛŒØ¯"})}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={onCancel}
                    >
                        {t("common.cancel", {defaultValue: "Ø§Ù†ØµØ±Ø§Ù"})}
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
                    {t("common.save", {defaultValue: "Ø«Ø¨Øª"})}
                </Button>

                <Button
                    design="Transparent"
                    disabled={busy}
                    style={ACTION_BUTTON_STYLE}
                    onClick={onCancel}
                >
                    {t("common.cancel", {defaultValue: "Ø§Ù†ØµØ±Ø§Ù"})}
                </Button>
            </>
        );
    }

    const tableActionButtons = (createText = t("common.create", {defaultValue: "Ø§ÛŒØ¬Ø§Ø¯"})) => (
        <>
            <Button design="Emphasized" disabled={busy || readOnly}>
                {createText}
            </Button>
            <Button design="Negative" disabled={busy || readOnly}>
                {t("common.delete", {defaultValue: "Ø­Ø°Ù"})}
            </Button>
        </>
    );

    const renderTabContent = (tab: PolicyTabKey) => {
        if (tab === "general") {
            return renderGeneralTab();
        }

        if (tab === "scope") {
            return (
                <TablePlaceholder
                    title={t("policy.tabs.scope", {defaultValue: "Ø¯Ø§Ù…Ù†Ù‡ Ø³ÛŒØ§Ø³Øª"})}
                    actions={tableActionButtons()}
                    columns={[
                        t("policy.fields.process", {defaultValue: "ÙØ±Ø¢ÛŒÙ†Ø¯Ù‡Ø§"}),
                        t("policy.fields.type", {defaultValue: "Ù†ÙˆØ¹"}),
                        t("policy.fields.description", {defaultValue: "Ø´Ø±Ø­"}),
                        t("policy.fields.organization", {defaultValue: "Ø³Ø§Ø²Ù…Ø§Ù†"}),
                        t("policy.fields.owner", {defaultValue: "Ù…Ø§Ù„Ú©"}),
                    ]}
                />
            );
        }

        if (tab === "risks") {
            return (
                <TablePlaceholder
                    title={t("policy.tabs.risks", {defaultValue: "Ø±ÛŒØ³Ú©â€ŒÙ‡Ø§"})}
                    actions={tableActionButtons(t("policy.actions.assign", {defaultValue: "ØªØ®ØµÛŒØµ"}))}
                    columns={[
                        t("policy.fields.risk", {defaultValue: "Ø±ÛŒØ³Ú©"}),
                        t("policy.fields.organization", {defaultValue: "Ø³Ø§Ø²Ù…Ø§Ù†"}),
                        t("policy.fields.owner", {defaultValue: "Ù…Ø§Ù„Ú©"}),
                        t("policy.fields.classification", {defaultValue: "Ø·Ø¨Ù‚Ù‡â€ŒØ¨Ù†Ø¯ÛŒ"}),
                    ]}
                />
            );
        }

        if (tab === "controls") {
            return (
                <TablePlaceholder
                    title={t("policy.tabs.controls", {defaultValue: "Ú©Ù†ØªØ±Ù„â€ŒÙ‡Ø§"})}
                    actions={tableActionButtons(t("policy.actions.assign", {defaultValue: "ØªØ®ØµÛŒØµ"}))}
                    columns={[
                        t("policy.fields.name", {defaultValue: "Ù†Ø§Ù…"}),
                        t("policy.fields.subProcess", {defaultValue: "Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯"}),
                        t("policy.fields.organization", {defaultValue: "Ø³Ø§Ø²Ù…Ø§Ù†"}),
                        t("policy.fields.owner", {defaultValue: "Ù…Ø§Ù„Ú©"}),
                        t("policy.fields.effectivenessTest", {defaultValue: "Ø¢Ø²Ù…ÙˆÙ† Ø§Ø«Ø±Ø¨Ø®Ø´ÛŒ"}),
                        t("policy.fields.controlDesignAssessment", {
                            defaultValue: "Ø§Ø±Ø²ÛŒØ§Ø¨ÛŒ Ø·Ø±Ø§Ø­ÛŒ Ú©Ù†ØªØ±Ù„",
                        }),
                    ]}
                />
            );
        }

        if (tab === "sources") {
            return (
                <TablePlaceholder
                    title={t("policy.tabs.sources", {defaultValue: "Ù…Ù†Ø§Ø¨Ø¹ Ø³ÛŒØ§Ø³Øª"})}
                    actions={tableActionButtons(
                        t("policy.actions.addSources", {defaultValue: "Ø§Ø¶Ø§ÙÙ‡ Ù†Ù…ÙˆØ¯Ù† Ù…Ù†Ø§Ø¨Ø¹"}),
                    )}
                    columns={[
                        t("policy.fields.policySource", {defaultValue: "Ù…Ù†Ø§Ø¨Ø¹ Ø³ÛŒØ§Ø³Øª"}),
                        t("policy.fields.type", {defaultValue: "Ù†ÙˆØ¹"}),
                    ]}
                />
            );
        }

        if (tab === "roles") {
            return (
                <TablePlaceholder
                    title={t("policy.tabs.roles", {defaultValue: "Ù†Ù‚Ø´â€ŒÙ‡Ø§"})}
                    actions={tableActionButtons(t("policy.actions.select", {defaultValue: "Ø§Ù†ØªØ®Ø§Ø¨"}))}
                    columns={[
                        t("policy.fields.roles", {defaultValue: "Ù†Ù‚Ø´â€ŒÙ‡Ø§"}),
                        t("policy.fields.type", {defaultValue: "Ù†ÙˆØ¹"}),
                    ]}
                />
            );
        }
        if (tab === "reviewApproval") {
            return (
                <TablePlaceholder
                    title={t("policy.tabs.reviewApproval", {defaultValue: "Ø¨Ø§Ø²Ù†Ú¯Ø±ÛŒ Ùˆ ØªØµÙˆÛŒØ¨"})}
                    actions={tableActionButtons(t("policy.actions.assign", {defaultValue: "ØªØ®ØµÛŒØµ"}))}
                    columns={[
                        t("policy.fields.reviewerApprover", {
                            defaultValue: "Ø¨Ø§Ø²Ù†Ú¯Ø±ÛŒ Ú©Ù†Ù†Ø¯Ú¯Ø§Ù† / ØªØµÙˆÛŒØ¨ Ú©Ù†Ù†Ø¯Ú¯Ø§Ù†",
                        }),
                        t("policy.fields.name", {defaultValue: "Ù†Ø§Ù…"}),
                        t("policy.fields.identifier", {defaultValue: "Ø´Ù†Ø§Ø³Ù‡"}),
                    ]}
                />
            );
        }

        if (tab === "documents") {
            return (
                <DocumentIntegrationDeferredMessage />
            );
        }
    };

    const resolvedActiveTab = tabs.includes(activeTab) ? activeTab : "general";

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {mode === "create"
                            ? t("policy.object.createModalTitle", {defaultValue: "Ø§ÛŒØ¬Ø§Ø¯"})
                            : headerTitle ||
                            t("policy.object.modalTitle", {
                                defaultValue: "Ù…Ø±Ú©Ø² Ø³ÛŒØ§Ø³Øª",
                            })}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("policy.fields.policyGroup", {
                            defaultValue: "Ú¯Ø±ÙˆÙ‡ Ø³ÛŒØ§Ø³Øª",
                        })}
                        value={headerParent}
                    />
                    <HeaderItem
                        label={t("policy.fields.policyCategory", {
                            defaultValue: "Ø¯Ø³ØªÙ‡â€ŒØ¨Ù†Ø¯ÛŒ",
                        })}
                        value={headerCategory}
                    />
                    <HeaderItem
                        label={t("policy.fields.communicationMethod", {
                            defaultValue: "Ø±ÙˆØ´ Ø§Ø·Ù„Ø§Ø¹â€ŒØ±Ø³Ø§Ù†ÛŒ",
                        })}
                        value={form.nodeType === "policy" ? headerCommunication : "-"}
                    />
                    <HeaderItem
                        label={t("policy.fields.status", {defaultValue: "ÙˆØ¶Ø¹ÛŒØª"})}
                        value={headerStatus}
                    />
                    <HeaderItem
                        label={t("policy.fields.identifier", {defaultValue: "Ø´Ù†Ø§Ø³Ù‡"})}
                        value={form.code || value?.id}
                    />
                    <HeaderItem
                        label={t("policy.fields.createdAt", {defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯"})}
                        value={formatPersianDate(value?.createdAt)}
                    />
                    <HeaderItem
                        label={t("policy.fields.validTo", {defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±"})}
                        value={formatPersianDate(form.validTo || value?.validTo)}
                    />
                    <HeaderItem
                        label={t("policy.fields.version", {defaultValue: "Ù†Ø³Ø®Ù‡"})}
                        value={form.nodeType === "policy" ? form.version : "-"}
                    />
                </div>
            </div>

            <PolicyTabs
                tabs={tabs}
                activeTab={resolvedActiveTab}
                onChange={setActiveTab}
            />

            {error ? (
                <MessageStrip design="Negative" onClose={onErrorClose}>
                    {error}
                </MessageStrip>
            ) : null}

            {validationError ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {validationError}
                </MessageStrip>
            ) : null}

            <div style={BODY_STYLE}>{renderTabContent(resolvedActiveTab)}</div>

            <div style={FOOTER_STYLE}>{renderFooterActions()}</div>
        </div>
    );
}
