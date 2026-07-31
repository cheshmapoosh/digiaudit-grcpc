import {
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
import {
    Button,
    CheckBox,
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
    RiskNode,
    RiskNodeCreate,
    RiskNodeType,
    RiskNodeUpdate,
    RiskStatus,
    RiskTemplateType,
} from "../domain/risk.model";
import {
    formatPersianDate,
    toEnglishDigits,
} from "@/shared/utils/date.utils";
import { DocumentManager, type DocumentLinkTargetType } from "@/features/document";

export type RiskObjectMode = "create" | "edit" | "view";

type RiskTabKey =
    | "general"
    | "riskSummary"
    | "kriTemplate"
    | "documents"
    | "impacts"
    | "existingRisks"
    | "responsePattern"
    | "controlCenter";

interface RiskFormState {
    code: string;
    title: string;
    nodeType: RiskNodeType;
    parentId: string | null;
    status: RiskStatus;
    sortOrder: string;
    description: string;
    validFrom: string;
    validTo: string;
    allowReference: boolean;
    analysisProfile: string;
    ownerName: string;
    companyOperation: string;
    riskType: RiskTemplateType;
    causes: string;
}

export interface RiskObjectPageProps {
    mode: RiskObjectMode;
    allItems: RiskNode[];
    value: RiskNode | null;
    parent?: RiskNode | null;
    requestedNodeType?: RiskNodeType;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onSubmit: (payload: RiskNodeCreate | RiskNodeUpdate) => Promise<void> | void;
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
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.35rem 2rem",
    padding: "0.75rem 1rem",
    minHeight: "4.5rem",
};

const HEADER_ROW_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "8rem minmax(0, 1fr)",
    gap: "0.5rem",
    alignItems: "center",
};

const RISK_TAB_CONTAINER_CLASS = "riskObjectTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${RISK_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${RISK_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${RISK_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${RISK_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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
    gap: "2rem",
    padding: "1rem 0 0",
};

const ACTION_BUTTON_STYLE: CSSProperties = {
    minWidth: "6rem",
};

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "d MMMM y";

const TABLE_PANEL_STYLE: CSSProperties = {
    minHeight: "15rem",
    background: "var(--sapGroup_ContentBackground)",
    border: "1px solid var(--sapList_BorderColor)",
    padding: "1rem",
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
    value: RiskNode | null,
    parent: RiskNode | null | undefined,
    requestedNodeType: RiskNodeType | undefined,
): RiskFormState {
    return {
        code: value?.code ?? "",
        title: value?.title ?? "",
        nodeType: value?.nodeType ?? requestedNodeType ?? "riskCategory",
        parentId: value?.parentId ?? parent?.id ?? null,
        status: value?.status ?? "active",
        sortOrder: value?.sortOrder?.toString() ?? "",
        description: value?.description ?? "",
        validFrom: toEnglishDigits(value?.validFrom ?? ""),
        validTo: toEnglishDigits(value?.validTo ?? ""),
        allowReference: value?.allowReference ?? true,
        analysisProfile: value?.analysisProfile ?? "",
        ownerName: value?.ownerName ?? "",
        companyOperation: value?.companyOperation ?? "",
        riskType: value?.riskType ?? "operational",
        causes: value?.causes ?? "",
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

function readSelectedTabKey(event: unknown): RiskTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as RiskTabKey | null) ?? null;
}

function readCheckBoxChecked(event: unknown): boolean {
    return Boolean((event as { target?: { checked?: boolean } }).target?.checked);
}

function normalizeOptionalText(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function parseSortOrder(value: string): number | undefined {
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
    nodeType: RiskNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<RiskNodeType, string> = {
        riskCategory: t("risk.nodeType.riskCategory", { defaultValue: "Ø·Ø¨Ù‚Ù‡ Ø±ÛŒØ³Ú©" }),
        riskTemplate: t("risk.nodeType.riskTemplate", { defaultValue: "Ø§Ù„Ú¯ÙˆÛŒ Ø±ÛŒØ³Ú©" }),
    };

    return map[nodeType];
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
    riskType: RiskTemplateType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<RiskTemplateType, string> = {
        operational: t("risk.riskType.operational", { defaultValue: "Ø¹Ù…Ù„ÛŒØ§ØªÛŒ" }),
        financial: t("risk.riskType.financial", { defaultValue: "Ù…Ø§Ù„ÛŒ" }),
        strategic: t("risk.riskType.strategic", { defaultValue: "Ø§Ø³ØªØ±Ø§ØªÚ˜ÛŒÚ©" }),
        compliance: t("risk.riskType.compliance", { defaultValue: "Ø§Ù†Ø·Ø¨Ø§Ù‚" }),
        technology: t("risk.riskType.technology", { defaultValue: "ÙÙ†Ø§ÙˆØ±ÛŒ" }),
        reputation: t("risk.riskType.reputation", { defaultValue: "Ø´Ù‡Ø±Øª" }),
        safety: t("risk.riskType.safety", { defaultValue: "Ø§ÛŒÙ…Ù†ÛŒ" }),
        other: t("risk.riskType.other", { defaultValue: "Ø³Ø§ÛŒØ±" }),
    };

    return map[riskType];
}

function defaultTabs(nodeType: RiskNodeType): RiskTabKey[] {
    if (nodeType === "riskTemplate") {
        return [
            "general",
            "impacts",
            "existingRisks",
            "responsePattern",
            "controlCenter",
            "documents",
        ];
    }

    return ["general", "riskSummary", "kriTemplate", "documents"];
}

function resolveDocumentTargetType(nodeType: RiskNodeType): DocumentLinkTargetType {
    return nodeType === "riskTemplate" ? "CENTRAL_RISK_TEMPLATE" : "CENTRAL_RISK_CATEGORY";
}

function resolveTabLabel(tab: RiskTabKey, t: ReturnType<typeof useTranslation>["t"]): string {
    const labels: Record<RiskTabKey, string> = {
        general: t("risk.tabs.general", { defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ" }),
        riskSummary: t("risk.tabs.riskSummary", { defaultValue: "Ø®Ù„Ø§ØµÙ‡ Ø±ÛŒØ³Ú©" }),
        kriTemplate: t("risk.tabs.kriTemplate", { defaultValue: "Ù‚Ø§Ù„Ø¨ KRI" }),
        documents: t("risk.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" }),
        impacts: t("risk.tabs.impacts", { defaultValue: "Ù…Ø­Ø±Ú©â€ŒÙ‡Ø§ Ùˆ Ø§Ø«Ø±Ø§Øª" }),
        existingRisks: t("risk.tabs.existingRisks", { defaultValue: "Ø±ÛŒØ³Ú© Ù…ÙˆØ¬ÙˆØ¯" }),
        responsePattern: t("risk.tabs.responsePattern", { defaultValue: "Ø§Ù„Ú¯ÙˆÛŒ Ù¾Ø§Ø³Ø®" }),
        controlCenter: t("risk.tabs.controlCenter", { defaultValue: "Ù…Ø±Ú©Ø² Ú©Ù†ØªØ±Ù„" }),
    };

    return labels[tab];
}

function RiskTabs({
                      tabs,
                      activeTab,
                      onChange,
                  }: {
    tabs: RiskTabKey[];
    activeTab: RiskTabKey;
    onChange: (tab: RiskTabKey) => void;
}) {
    const { t } = useTranslation();

    return (
        <DetailTabContainer
            className={RISK_TAB_CONTAINER_CLASS}
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
        </DetailTabContainer>
    );
}

function TablePlaceholder({
                              title,
                              columns,
                          }: {
    title: string;
    columns: string[];
}) {
    return (
        <div style={TABLE_PANEL_STYLE}>
            <Title level="H5">{title}</Title>

            <div style={{ height: "0.75rem" }} />

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

export default function RiskObjectPage({
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
                                       }: RiskObjectPageProps) {
    const { t } = useTranslation();
    const readOnly = mode === "view";

    const [form, setForm] = useState<RiskFormState>(() =>
        toFormState(value, parent, requestedNodeType),
    );

    const [validationError, setValidationError] = useState<string | null>(null);
    const tabs = useMemo(() => defaultTabs(form.nodeType), [form.nodeType]);
    const [activeTab, setActiveTab] = useState<RiskTabKey>("general");

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? parent ?? null
        : null;

    const headerTitle = form.title || value?.title || "";
    const headerParent = selectedParent
        ? `${selectedParent.code} - ${selectedParent.title}`
        : t("common.none", { defaultValue: "Ù†Ø¯Ø§Ø±Ø¯" });
    const headerType = resolveNodeTypeLabel(form.nodeType, t);
    const headerStatus = resolveStatusLabel(form.status, t);
    const currentRiskId = value?.id ?? null;

    const handleChange = <K extends keyof RiskFormState>(
        key: K,
        nextValue: RiskFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const validate = (): boolean => {
        if (!form.code.trim()) {
            setValidationError(
                t("risk.validation.codeRequired", { defaultValue: "Ú©Ø¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª" }),
            );
            return false;
        }

        if (!form.title.trim()) {
            setValidationError(
                t("risk.validation.titleRequired", { defaultValue: "Ù†Ø§Ù… Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª" }),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseSortOrder(form.sortOrder) === undefined) {
            setValidationError(
                t("risk.validation.sortOrderInvalid", {
                    defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´ Ø¨Ø§ÛŒØ¯ Ø¹Ø¯Ø¯ ØµØ­ÛŒØ­ Ù†Ø§Ù…Ù†ÙÛŒ Ø¨Ø§Ø´Ø¯",
                }),
            );
            return false;
        }

        setValidationError(null);
        return true;
    };

    const handleSubmit = async () => {
        if (readOnly || !validate()) {
            return;
        }

        const basePayload: RiskNodeCreate | RiskNodeUpdate = {
            code: form.code.trim(),
            title: form.title.trim(),
            nodeType: form.nodeType,
            parentId: form.parentId,
            status: form.status,
            sortOrder: parseSortOrder(form.sortOrder),
            description: normalizeOptionalText(form.description),
            validFrom: normalizeOptionalText(form.validFrom),
            validTo: normalizeOptionalText(form.validTo),
            allowReference: form.allowReference,
            analysisProfile: normalizeOptionalText(form.analysisProfile),
            ownerName: normalizeOptionalText(form.ownerName),
        };

        const payload: RiskNodeCreate | RiskNodeUpdate =
            form.nodeType === "riskTemplate"
                ? {
                      ...basePayload,
                      companyOperation: normalizeOptionalText(form.companyOperation),
                      riskType: form.riskType,
                      causes: normalizeOptionalText(form.causes),
                  }
                : basePayload;

        await onSubmit(payload);
    };

    const renderGeneralTab = () => (
        <>
            <div style={FORM_GRID_STYLE}>
                <FormField label={t("risk.fields.code", { defaultValue: "Ø´Ù†Ø§Ø³Ù‡" })} required>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" })} required>
                    <Input
                        value={form.title}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("title", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("risk.fields.parent", { defaultValue: "ÙˆØ§Ù„Ø¯" })}>
                    <Input value={headerParent} readonly />
                </FormField>

                <FormField label={t("risk.fields.type", { defaultValue: "Ù†ÙˆØ¹" })}>
                    <Input value={headerType} readonly />
                </FormField>

                <FormField label={t("risk.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}>
                    <Select
                        disabled={readOnly || busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.status);
                            handleChange("status", nextValue as RiskStatus);
                        }}
                    >
                        <Option data-value="active" selected={form.status === "active"}>
                            {t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })}
                        </Option>
                        <Option data-value="inactive" selected={form.status === "inactive"}>
                            {t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" })}
                        </Option>
                    </Select>
                </FormField>

                <FormField
                    label={t("risk.fields.sortOrder", { defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´" })}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("risk.fields.validFrom", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" })}>
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

                <FormField label={t("risk.fields.validTo", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" })}>
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

                <FormField
                    label={t("risk.fields.allowReference", { defaultValue: "Ù…Ø¬ÙˆØ² Ø§Ø±Ø¬Ø§Ø¹" })}
                >
                    <CheckBox
                        checked={form.allowReference}
                        disabled={readOnly || busy}
                        text={form.allowReference ? t("common.yes", { defaultValue: "Ø¨Ù„Ù‡" }) : t("common.no", { defaultValue: "Ø®ÛŒØ±" })}
                        onChange={(event) => handleChange("allowReference", readCheckBoxChecked(event))}
                    />
                </FormField>

                <FormField
                    label={t("risk.fields.analysisProfile", { defaultValue: "Ù¾Ø±ÙˆÙØ§ÛŒÙ„ ØªØ­Ù„ÛŒÙ„" })}
                >
                    <Input
                        value={form.analysisProfile}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("analysisProfile", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("risk.fields.owner", { defaultValue: "Ù…Ø§Ù„Ú©" })}>
                    <Input
                        value={form.ownerName}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("ownerName", readInputValue(event))}
                    />
                </FormField>

                {form.nodeType === "riskTemplate" ? (
                    <>
                        <FormField
                            label={t("risk.fields.companyOperation", {
                                defaultValue: "Ø´Ø±Ú©Øª / Ø¹Ù…Ù„ÛŒØ§Øª",
                            })}
                        >
                            <Input
                                value={form.companyOperation}
                                disabled={readOnly || busy}
                                onInput={(event) =>
                                    handleChange("companyOperation", readInputValue(event))
                                }
                            />
                        </FormField>

                        <FormField label={t("risk.fields.riskType", { defaultValue: "Ù†ÙˆØ¹ Ø±ÛŒØ³Ú©" })}>
                            <Select
                                disabled={readOnly || busy}
                                onChange={(event) => {
                                    const nextValue = readSelectedDataValue(event, form.riskType);
                                    handleChange("riskType", nextValue as RiskTemplateType);
                                }}
                            >
                                {([
                                    "operational",
                                    "financial",
                                    "strategic",
                                    "compliance",
                                    "technology",
                                    "reputation",
                                    "safety",
                                    "other",
                                ] as RiskTemplateType[]).map((riskType) => (
                                    <Option
                                        key={riskType}
                                        data-value={riskType}
                                        selected={form.riskType === riskType}
                                    >
                                        {resolveRiskTypeLabel(riskType, t)}
                                    </Option>
                                ))}
                            </Select>
                        </FormField>

                        <FormField
                            label={t("risk.fields.causes", { defaultValue: "Ù…Ø­Ø±Ú©â€ŒÙ‡Ø§ Ùˆ Ø§Ø«Ø±Ø§Øª" })}
                            fullWidth
                        >
                            <TextArea
                                rows={3}
                                value={form.causes}
                                disabled={readOnly || busy}
                                onInput={(event) => handleChange("causes", readInputValue(event))}
                            />
                        </FormField>
                    </>
                ) : null}

                <FormField
                    label={t("risk.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
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

    const renderFooterActions = () => (
        <div style={FOOTER_STYLE}>
            {mode === "view" ? (
                <Button
                    design="Emphasized"
                    disabled={busy || !onEdit}
                    style={ACTION_BUTTON_STYLE}
                    onClick={onEdit}
                >
                    {t("common.edit", { defaultValue: "ÙˆÛŒØ±Ø§ÛŒØ´" })}
                </Button>
            ) : (
                <Button
                    design="Emphasized"
                    disabled={busy}
                    style={ACTION_BUTTON_STYLE}
                    onClick={handleSubmit}
                >
                    {t("common.save", { defaultValue: "Ø°Ø®ÛŒØ±Ù‡" })}
                </Button>
            )}

            <Button
                design="Transparent"
                disabled={busy}
                style={ACTION_BUTTON_STYLE}
                onClick={onCancel}
            >
                {mode === "view"
                    ? t("common.close", { defaultValue: "Ø¨Ø³ØªÙ†" })
                    : t("common.cancel", { defaultValue: "Ø§Ù†ØµØ±Ø§Ù" })}
            </Button>
        </div>
    );

    const renderTabContent = (tab: RiskTabKey) => {
        if (tab === "general") {
            return renderGeneralTab();
        }

        if (tab === "impacts") {
            return (
                <TablePlaceholder
                    title={t("risk.tabs.impacts", { defaultValue: "Ù…Ø­Ø±Ú©â€ŒÙ‡Ø§ Ùˆ Ø§Ø«Ø±Ø§Øª" })}
                    columns={[
                        t("risk.fields.effect", { defaultValue: "Ø§Ø«Ø±" }),
                        t("risk.fields.effectCategory", { defaultValue: "Ø·Ø¨Ù‚Ù‡ Ø§Ø«Ø±" }),
                        t("risk.fields.effectCategoryDescription", { defaultValue: "Ø´Ø±Ø­ Ø·Ø¨Ù‚Ù‡ Ø§Ø«Ø±" }),
                    ]}
                />
            );
        }

        if (tab === "existingRisks") {
            return (
                <TablePlaceholder
                    title={t("risk.tabs.existingRisks", { defaultValue: "Ø±ÛŒØ³Ú© Ù…ÙˆØ¬ÙˆØ¯" })}
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

        if (tab === "responsePattern") {
            return (
                <TablePlaceholder
                    title={t("risk.tabs.responsePattern", { defaultValue: "Ø§Ù„Ú¯ÙˆÛŒ Ù¾Ø§Ø³Ø®" })}
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

        if (tab === "controlCenter") {
            return (
                <TablePlaceholder
                    title={t("risk.tabs.controlCenter", { defaultValue: "Ù…Ø±Ú©Ø² Ú©Ù†ØªØ±Ù„" })}
                    columns={[
                        t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" }),
                        t("risk.fields.owner", { defaultValue: "Ù…Ø§Ù„Ú©" }),
                        t("risk.fields.description", { defaultValue: "Ø´Ø±Ø­" }),
                    ]}
                />
            );
        }

        if (tab === "riskSummary") {
            return (
                <TablePlaceholder
                    title={t("risk.tabs.riskSummary", { defaultValue: "Ø®Ù„Ø§ØµÙ‡ Ø±ÛŒØ³Ú©" })}
                    columns={[
                        t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" }),
                        t("risk.fields.description", { defaultValue: "Ø´Ø±Ø­" }),
                    ]}
                />
            );
        }

        if (tab === "kriTemplate") {
            return (
                <TablePlaceholder
                    title={t("risk.tabs.kriTemplate", { defaultValue: "Ù‚Ø§Ù„Ø¨ KRI" })}
                    columns={[
                        t("risk.fields.name", { defaultValue: "Ù†Ø§Ù…" }),
                        t("risk.fields.type", { defaultValue: "Ù†ÙˆØ¹" }),
                        t("risk.fields.description", { defaultValue: "Ø´Ø±Ø­" }),
                    ]}
                />
            );
        }

        return (
            <DocumentManager
                key={currentRiskId ?? "unsaved-risk-documents"}
                title={t("risk.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" })}
                targetType={resolveDocumentTargetType(form.nodeType)}
                targetId={currentRiskId}
                busy={busy}
                readOnly={readOnly}
                saveFirstMessage={t("risk.documents.saveFirst", {
                    defaultValue:
                        "Ø§Ø¨ØªØ¯Ø§ Ø¢ÛŒØªÙ… Ø±ÛŒØ³Ú© Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯ØŒ Ø³Ù¾Ø³ Ù…Ø³ØªÙ†Ø¯Ø§Øª Ø±Ø§ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ú©Ù†ÛŒØ¯.",
                })}
            />
        );
    };

    const resolvedActiveTab = tabs.includes(activeTab) ? activeTab : "general";

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {mode === "create"
                            ? t("risk.object.createModalTitle", { defaultValue: "Ø§ÛŒØ¬Ø§Ø¯" })
                            : headerTitle ||
                              t("risk.object.modalTitle", {
                                  defaultValue: "Ù…Ø±Ú©Ø² Ø±ÛŒØ³Ú©",
                              })}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("risk.fields.parentRiskCategory", {
                            defaultValue: "ÙˆØ§Ù„Ø¯ Ø·Ø¨Ù‚Ù‡",
                        })}
                        value={headerParent}
                    />
                    <HeaderItem
                        label={t("risk.fields.identifier", { defaultValue: "Ø´Ù†Ø§Ø³Ù‡" })}
                        value={form.code || value?.id}
                    />
                    <HeaderItem
                        label={t("risk.fields.createdAt", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" })}
                        value={formatPersianDate(value?.createdAt)}
                    />
                    <HeaderItem
                        label={t("risk.fields.validTo", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" })}
                        value={formatPersianDate(form.validTo)}
                    />
                    <HeaderItem
                        label={t("risk.fields.nodeType", { defaultValue: "Ù†ÙˆØ¹ Ø¢ÛŒØªÙ…" })}
                        value={headerType}
                    />
                    <HeaderItem
                        label={t("risk.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}
                        value={headerStatus}
                    />
                </div>
            </div>

            <RiskTabs
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

            {renderFooterActions()}
        </div>
    );
}
