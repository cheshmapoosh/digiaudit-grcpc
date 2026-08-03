import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
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
    ObjectiveNode,
    ObjectiveNodeCreate,
    ObjectiveNodeType,
    ObjectiveNodeUpdate,
    ObjectiveStatus,
    ObjectiveType,
} from "../domain/objective.model";
import {
    formatPersianDate,
    toEnglishDigits,
} from "@/shared/utils/date.utils";
import { DocumentIntegrationDeferredMessage } from "@/features/document";

export type ObjectiveObjectMode = "create" | "edit" | "view";

type ObjectiveTabKey = "general" | "documents";

interface ObjectiveFormState {
    code: string;
    title: string;
    nodeType: ObjectiveNodeType;
    parentId: string | null;
    status: ObjectiveStatus;
    sortOrder: string;
    description: string;
    strategy: string;
    objectiveType: ObjectiveType;
    objectiveClass: string;
    organizationUnitName: string;
    effectiveFrom: string;
    validUntil: string;
}

export interface ObjectiveObjectPageProps {
    mode: ObjectiveObjectMode;
    allItems: ObjectiveNode[];
    value: ObjectiveNode | null;
    parent?: ObjectiveNode | null;
    requestedNodeType?: ObjectiveNodeType;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onSubmit: (payload: ObjectiveNodeCreate | ObjectiveNodeUpdate) => Promise<void> | void;
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

const OBJECTIVE_TAB_CONTAINER_CLASS = "objectiveObjectTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${OBJECTIVE_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${OBJECTIVE_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${OBJECTIVE_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${OBJECTIVE_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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

function toFormState(
    value: ObjectiveNode | null,
    parent: ObjectiveNode | null | undefined,
    requestedNodeType: ObjectiveNodeType | undefined,
): ObjectiveFormState {
    return {
        code: value?.code ?? "",
        title: value?.title ?? "",
        nodeType: value?.nodeType ?? requestedNodeType ?? "objective",
        parentId: value?.parentId ?? parent?.id ?? null,
        status: value?.status ?? "active",
        sortOrder: value?.sortOrder?.toString() ?? "",
        description: value?.description ?? "",
        strategy: value?.strategy ?? "",
        objectiveType: value?.objectiveType ?? "operational",
        objectiveClass: value?.objectiveClass ?? "",
        organizationUnitName: value?.organizationUnitName ?? "",
        effectiveFrom: toEnglishDigits(value?.effectiveFrom ?? ""),
        validUntil: toEnglishDigits(value?.validUntil ?? ""),
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

function readSelectedTabKey(event: unknown): ObjectiveTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as ObjectiveTabKey | null) ?? null;
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

function resolveStatusLabel(
    status: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (status === "active" || status === "ACTIVE") {
        return t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" });
    }
    if (status === "DELETED") {
        return t("common.deleted", { defaultValue: "Ø­Ø°Ù Ø´Ø¯Ù‡" });
    }
    return t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" });
}

function resolveObjectiveTypeLabel(
    objectiveType: ObjectiveType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ObjectiveType, string> = {
        operational: t("objective.type.operational", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø¹Ù…Ù„ÛŒØ§ØªÛŒ" }),
        compliance: t("objective.type.compliance", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø±Ø¹Ø§ÛŒØªÛŒ" }),
        strategic: t("objective.type.strategic", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø§Ø³ØªØ±Ø§ØªÚ˜ÛŒÚ©" }),
        financial: t("objective.type.financial", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ù…Ø§Ù„ÛŒ" }),
        reporting: t("objective.type.reporting", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ú¯Ø²Ø§Ø±Ø´Ú¯Ø±ÛŒ" }),
        market: t("objective.type.market", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø¨Ø§Ø²Ø§Ø±" }),
    };

    return map[objectiveType];
}

function defaultTabs(): ObjectiveTabKey[] {
    return ["general", "documents"];
}

function resolveTabLabel(tab: ObjectiveTabKey, t: ReturnType<typeof useTranslation>["t"]): string {
    const labels: Record<ObjectiveTabKey, string> = {
        general: t("objective.tabs.general", { defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ" }),
        documents: t("objective.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" }),
    };

    return labels[tab];
}

function ObjectiveTabs({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: ObjectiveTabKey[];
    activeTab: ObjectiveTabKey;
    onChange: (tab: ObjectiveTabKey) => void;
}) {
    const { t } = useTranslation();

    return (
        <DetailTabContainer
            className={OBJECTIVE_TAB_CONTAINER_CLASS}
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

export default function ObjectiveObjectPage({
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
}: ObjectiveObjectPageProps) {
    const { t } = useTranslation();
    const readOnly = mode === "view";

    const [form, setForm] = useState<ObjectiveFormState>(() =>
        toFormState(value, parent, requestedNodeType),
    );

    const [validationError, setValidationError] = useState<string | null>(null);
    const tabs = useMemo(() => defaultTabs(), []);
    const [activeTab, setActiveTab] = useState<ObjectiveTabKey>("general");

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? parent ?? null
        : null;

    const headerTitle = form.title || value?.title || "";
    const headerParent = selectedParent
        ? `${selectedParent.code} - ${selectedParent.title}`
        : t("common.none", { defaultValue: "Ù†Ø¯Ø§Ø±Ø¯" });
    const headerStatus = resolveStatusLabel(form.status, t);
    const headerType = resolveObjectiveTypeLabel(form.objectiveType, t);

    const handleChange = <K extends keyof ObjectiveFormState>(
        key: K,
        nextValue: ObjectiveFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const validate = (): boolean => {
        if (!form.code.trim()) {
            setValidationError(
                t("objective.validation.codeRequired", { defaultValue: "Ú©Ø¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª" }),
            );
            return false;
        }

        if (!form.title.trim()) {
            setValidationError(
                t("objective.validation.titleRequired", { defaultValue: "Ù†Ø§Ù… Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª" }),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseSortOrder(form.sortOrder) === undefined) {
            setValidationError(
                t("objective.validation.sortOrderInvalid", {
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

        const payload: ObjectiveNodeCreate | ObjectiveNodeUpdate = {
            code: form.code.trim(),
            title: form.title.trim(),
            nodeType: form.nodeType,
            parentId: form.parentId,
            status: form.status,
            sortOrder: parseSortOrder(form.sortOrder),
            description: normalizeOptionalText(form.description),
            strategy: normalizeOptionalText(form.strategy),
            objectiveType: form.objectiveType,
            objectiveClass: normalizeOptionalText(form.objectiveClass),
            organizationUnitName: normalizeOptionalText(form.organizationUnitName),
            effectiveFrom: normalizeOptionalText(form.effectiveFrom),
            validUntil: normalizeOptionalText(form.validUntil),
        };

        await onSubmit(payload);
    };

    const renderGeneralTab = () => (
        <>
            <div style={FORM_GRID_STYLE}>
                <FormField label={t("objective.fields.code", { defaultValue: "Ø´Ù†Ø§Ø³Ù‡" })} required>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("objective.fields.name", { defaultValue: "Ù†Ø§Ù…" })} required>
                    <Input
                        value={form.title}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("title", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("objective.fields.parent", { defaultValue: "Ù‡Ø¯Ù ÙˆØ§Ù„Ø¯" })}>
                    <Input value={headerParent} readonly />
                </FormField>

                <FormField
                    label={t("objective.fields.objectiveType", {
                        defaultValue: "Ù†ÙˆØ¹ Ù‡Ø¯Ù",
                    })}
                >
                    <Select
                        disabled={readOnly || busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.objectiveType);
                            handleChange("objectiveType", nextValue as ObjectiveType);
                        }}
                    >
                        <Option
                            data-value="operational"
                            selected={form.objectiveType === "operational"}
                        >
                            {t("objective.type.operational", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø¹Ù…Ù„ÛŒØ§ØªÛŒ" })}
                        </Option>
                        <Option
                            data-value="compliance"
                            selected={form.objectiveType === "compliance"}
                        >
                            {t("objective.type.compliance", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø±Ø¹Ø§ÛŒØªÛŒ" })}
                        </Option>
                        <Option
                            data-value="strategic"
                            selected={form.objectiveType === "strategic"}
                        >
                            {t("objective.type.strategic", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø§Ø³ØªØ±Ø§ØªÚ˜ÛŒÚ©" })}
                        </Option>
                        <Option
                            data-value="financial"
                            selected={form.objectiveType === "financial"}
                        >
                            {t("objective.type.financial", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ù…Ø§Ù„ÛŒ" })}
                        </Option>
                        <Option
                            data-value="reporting"
                            selected={form.objectiveType === "reporting"}
                        >
                            {t("objective.type.reporting", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ú¯Ø²Ø§Ø±Ø´Ú¯Ø±ÛŒ" })}
                        </Option>
                        <Option data-value="market" selected={form.objectiveType === "market"}>
                            {t("objective.type.market", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø¨Ø§Ø²Ø§Ø±" })}
                        </Option>
                    </Select>
                </FormField>

                <FormField
                    label={t("objective.fields.objectiveClass", { defaultValue: "Ø·Ø¨Ù‚Ù‡ Ù‡Ø¯Ù" })}
                >
                    <Input
                        value={form.objectiveClass}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("objectiveClass", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("objective.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}>
                    <Select
                        disabled={readOnly || busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.status);
                            handleChange("status", nextValue as ObjectiveStatus);
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
                    label={t("objective.fields.effectiveFrom", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" })}
                >
                    <DatePicker
                        value={form.effectiveFrom}
                        valueFormat={DATE_VALUE_FORMAT}
                        displayFormat={DATE_DISPLAY_FORMAT}
                        primaryCalendarType="Persian"
                        disabled={readOnly || busy}
                        placeholder={t("organization.fields.datePlaceholder", {
                            defaultValue: "Ø³Ø§Ù„/Ù…Ø§Ù‡/Ø±ÙˆØ²",
                        })}
                        onChange={(event) =>
                            handleChange("effectiveFrom", readDatePickerValue(event))
                        }
                    />
                </FormField>

                <FormField
                    label={t("objective.fields.validUntil", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" })}
                >
                    <DatePicker
                        value={form.validUntil}
                        valueFormat={DATE_VALUE_FORMAT}
                        displayFormat={DATE_DISPLAY_FORMAT}
                        primaryCalendarType="Persian"
                        disabled={readOnly || busy}
                        placeholder={t("organization.fields.datePlaceholder", {
                            defaultValue: "Ø³Ø§Ù„/Ù…Ø§Ù‡/Ø±ÙˆØ²",
                        })}
                        onChange={(event) =>
                            handleChange("validUntil", readDatePickerValue(event))
                        }
                    />
                </FormField>

                <FormField
                    label={t("objective.fields.sortOrder", { defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´" })}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("objective.fields.organizationUnit", { defaultValue: "ÙˆØ§Ø­Ø¯ Ø³Ø§Ø²Ù…Ø§Ù†ÛŒ" })}
                >
                    <Input
                        value={form.organizationUnitName}
                        disabled={readOnly || busy}
                        onInput={(event) =>
                            handleChange("organizationUnitName", readInputValue(event))
                        }
                    />
                </FormField>

                <FormField
                    label={t("objective.fields.strategy", { defaultValue: "Ø§Ø³ØªØ±Ø§ØªÚ˜ÛŒ" })}
                    fullWidth
                >
                    <TextArea
                        rows={3}
                        value={form.strategy}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("strategy", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("objective.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
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

    const renderTabContent = (tab: ObjectiveTabKey) => {
        if (tab === "general") {
            return renderGeneralTab();
        }

        return (
            <DocumentIntegrationDeferredMessage />
        );
    };

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

    const resolvedActiveTab = tabs.includes(activeTab) ? activeTab : "general";

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {mode === "create"
                            ? t("objective.object.createModalTitle", { defaultValue: "Ø§ÛŒØ¬Ø§Ø¯ Ù‡Ø¯Ù" })
                            : headerTitle ||
                              t("objective.object.modalTitle", {
                                  defaultValue: "Ù…Ø±Ú©Ø² Ø§Ù‡Ø¯Ø§Ù",
                              })}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("objective.fields.parentObjective", {
                            defaultValue: "Ù‡Ø¯Ù ÙˆØ§Ù„Ø¯",
                        })}
                        value={headerParent}
                    />
                    <HeaderItem
                        label={t("objective.fields.identifier", { defaultValue: "Ø´Ù†Ø§Ø³Ù‡" })}
                        value={form.code || value?.id}
                    />
                    <HeaderItem
                        label={t("objective.fields.createdAt", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" })}
                        value={formatPersianDate(value?.createdAt ?? form.effectiveFrom)}
                    />
                    <HeaderItem
                        label={t("objective.fields.validUntil", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" })}
                        value={formatPersianDate(form.validUntil)}
                    />
                    <HeaderItem
                        label={t("objective.fields.objectiveType", {
                            defaultValue: "Ù†ÙˆØ¹ Ù‡Ø¯Ù",
                        })}
                        value={headerType}
                    />
                    <HeaderItem
                        label={t("objective.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}
                        value={headerStatus}
                    />
                </div>
            </div>

            <ObjectiveTabs
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
