import {
    Fragment,
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
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
    Table,
    TableCell,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import { DetailTabContainer } from "@/shared/components/DetailTabContainer";

import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeType,
    RegulationNodeUpdate,
    RegulationStatus,
} from "../domain/regulation.model";
import {
    formatPersianDate,
    toEnglishDigits,
} from "@/shared/utils/date.utils";
import { DocumentManager, type DocumentLinkTargetType } from "@/features/document";
import { sortRegulations } from "../utils/regulation.tree";

export type RegulationObjectMode = "create" | "edit" | "view";

type RegulationTabKey = "general" | "requirements" | "documents";

interface RegulationFormState {
    code: string;
    title: string;
    nodeType: RegulationNodeType;
    parentId: string | null;
    status: RegulationStatus;
    sortOrder: string;
    description: string;
    effectiveDate: string;
    validTo: string;
    issuer: string;
    ownerName: string;
}

export interface RegulationObjectPageProps {
    mode: RegulationObjectMode;
    allItems: RegulationNode[];
    value: RegulationNode | null;
    parent?: RegulationNode | null;
    requestedNodeType?: RegulationNodeType;
    busy?: boolean;
    error?: string | null;
    onSubmit: (payload: RegulationNodeCreate | RegulationNodeUpdate) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
    onCreateRequirement?: (lawId: string) => void;
    onShowRequirement?: (requirementId: string) => void;
    onEditRequirement?: (requirementId: string) => void;
    onDeleteRequirement?: (requirementId: string) => void;
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

const REGULATION_TAB_CONTAINER_CLASS = "regulationObjectTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${REGULATION_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${REGULATION_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${REGULATION_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${REGULATION_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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

const REQUIREMENTS_HEADER_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "center",
    flexWrap: "wrap",
};

const REQUIREMENTS_ACTIONS_STYLE: CSSProperties = {
    display: "inline-flex",
    gap: "0.5rem",
    flexWrap: "wrap",
};

function toFormState(
    value: RegulationNode | null,
    parent: RegulationNode | null | undefined,
    requestedNodeType: RegulationNodeType | undefined,
): RegulationFormState {
    return {
        code: value?.code ?? "",
        title: value?.title ?? "",
        nodeType: value?.nodeType ?? requestedNodeType ?? "lawGroup",
        parentId: value?.parentId ?? parent?.id ?? null,
        status: value?.status ?? "active",
        sortOrder: value?.sortOrder?.toString() ?? "",
        description: value?.description ?? "",
        effectiveDate: toEnglishDigits(value?.effectiveDate ?? ""),
        validTo: toEnglishDigits(value?.validTo ?? ""),
        issuer: value?.issuer ?? "",
        ownerName: value?.ownerName ?? "",
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

function readSelectedTabKey(event: unknown): RegulationTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as RegulationTabKey | null) ?? null;
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
    nodeType: RegulationNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<RegulationNodeType, string> = {
        lawGroup: t("regulation.nodeType.lawGroup", { defaultValue: "Ú¯Ø±ÙˆÙ‡ Ù‚Ø§Ù†ÙˆÙ†" }),
        law: t("regulation.nodeType.law", { defaultValue: "Ù‚Ø§Ù†ÙˆÙ†" }),
        lawRequirement: t("regulation.nodeType.lawRequirement", {
            defaultValue: "Ø§Ù„Ø²Ø§Ù…Ø§Øª Ù‚Ø§Ù†ÙˆÙ†",
        }),
    };

    return map[nodeType];
}

function resolveStatusLabel(
    status: RegulationStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
        : t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" });
}

function defaultTabs(nodeType: RegulationNodeType): RegulationTabKey[] {
    if (nodeType === "law") {
        return ["general", "requirements", "documents"];
    }

    return ["general", "documents"];
}

function resolveTabLabel(
    tab: RegulationTabKey,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<RegulationTabKey, string> = {
        general: t("regulation.tabs.general", { defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ" }),
        requirements: t("regulation.tabs.requirements", { defaultValue: "Ø§Ù„Ø²Ø§Ù…Ø§Øª" }),
        documents: t("regulation.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" }),
    };

    return labels[tab];
}

function RegulationTabs({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: RegulationTabKey[];
    activeTab: RegulationTabKey;
    onChange: (tab: RegulationTabKey) => void;
}) {
    const { t } = useTranslation();

    return (
        <DetailTabContainer
            className={REGULATION_TAB_CONTAINER_CLASS}
            onTabSelect={(event) => {
                const nextTab = readSelectedTabKey(event);
                if (nextTab) {
                    onChange(nextTab);
                }
            }}
            style={TAB_CONTAINER_STYLE}
        >
            {tabs.map((tab, index) => (
                <Fragment key={tab}>
                    {index === 1 ? <TabSeparator /> : null}
                    <Tab
                        text={resolveTabLabel(tab, t)}
                        selected={activeTab === tab}
                        data-tab-key={tab}
                    />
                </Fragment>
            ))}
        </DetailTabContainer>
    );
}

function resolveParentLabel(
    nodeType: RegulationNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (nodeType === "lawGroup") {
        return t("regulation.fields.parentLawGroup", { defaultValue: "ÙˆØ§Ù„Ø¯ Ú¯Ø±ÙˆÙ‡ Ù‚Ø§Ù†ÙˆÙ†" });
    }

    if (nodeType === "law") {
        return t("regulation.fields.parentLaw", { defaultValue: "ÙˆØ§Ù„Ø¯ Ù‚Ø§Ù†ÙˆÙ†" });
    }

    return t("regulation.fields.parentRequirement", { defaultValue: "ÙˆØ§Ù„Ø¯ Ù‚Ø§Ù†ÙˆÙ†" });
}

function resolveDocumentTargetType(nodeType: RegulationNodeType): DocumentLinkTargetType {
    if (nodeType === "lawGroup") {
        return "CENTRAL_REGULATION_GROUP";
    }

    return nodeType === "law" ? "CENTRAL_REGULATION" : "CENTRAL_REQUIREMENT";
}

export default function RegulationObjectPage({
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
    onCreateRequirement,
    onShowRequirement,
    onEditRequirement,
    onDeleteRequirement,
}: RegulationObjectPageProps) {
    const { t } = useTranslation();
    const readOnly = mode === "view";

    const [form, setForm] = useState<RegulationFormState>(() =>
        toFormState(value, parent, requestedNodeType),
    );

    const [validationError, setValidationError] = useState<string | null>(null);
    const tabs = useMemo(() => defaultTabs(form.nodeType), [form.nodeType]);
    const [activeTab, setActiveTab] = useState<RegulationTabKey>("general");
    const effectiveActiveTab = tabs.includes(activeTab) ? activeTab : "general";

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? parent ?? null
        : null;

    const currentRegulationId = value?.id ?? null;
    const directRequirements = useMemo(
        () =>
            sortRegulations(
                currentRegulationId && form.nodeType === "law"
                    ? allItems.filter(
                          (item) =>
                              item.parentId === currentRegulationId &&
                              item.nodeType === "lawRequirement",
                      )
                    : [],
            ),
        [allItems, currentRegulationId, form.nodeType],
    );

    const headerTitle = form.title || value?.title || "";
    const headerParent = selectedParent
        ? `${selectedParent.code} - ${selectedParent.title}`
        : t("common.none", { defaultValue: "Ù†Ø¯Ø§Ø±Ø¯" });
    const headerType = resolveNodeTypeLabel(form.nodeType, t);
    const headerStatus = resolveStatusLabel(form.status, t);
    const parentLabel = resolveParentLabel(form.nodeType, t);

    const handleChange = <K extends keyof RegulationFormState>(
        key: K,
        nextValue: RegulationFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const validate = (): boolean => {
        if (!form.code.trim()) {
            setValidationError(
                t("regulation.validation.codeRequired", { defaultValue: "Ú©Ø¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª" }),
            );
            return false;
        }

        if (!form.title.trim()) {
            setValidationError(
                t("regulation.validation.titleRequired", { defaultValue: "Ù†Ø§Ù… Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª" }),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseSortOrder(form.sortOrder) === undefined) {
            setValidationError(
                t("regulation.validation.sortOrderInvalid", {
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

        const payload: RegulationNodeCreate | RegulationNodeUpdate = {
            code: form.code.trim(),
            title: form.title.trim(),
            nodeType: form.nodeType,
            parentId: form.parentId,
            status: form.status,
            sortOrder: parseSortOrder(form.sortOrder),
            description: normalizeOptionalText(form.description),
            effectiveDate: normalizeOptionalText(form.effectiveDate),
            validTo: normalizeOptionalText(form.validTo),
            issuer: normalizeOptionalText(form.issuer),
            ownerName: normalizeOptionalText(form.ownerName),
        };

        await onSubmit(payload);
    };

    const renderGeneralTab = () => (
        <>
            <div style={FORM_GRID_STYLE}>
                <FormField label={t("regulation.fields.code", { defaultValue: "Ø´Ù†Ø§Ø³Ù‡" })} required>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("regulation.fields.name", { defaultValue: "Ù†Ø§Ù…" })} required>
                    <Input
                        value={form.title}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("title", readInputValue(event))}
                    />
                </FormField>

                <FormField label={parentLabel}>
                    <Input value={headerParent} readonly />
                </FormField>

                <FormField label={t("regulation.fields.type", { defaultValue: "Ù†ÙˆØ¹" })}>
                    <Input value={headerType} readonly />
                </FormField>

                <FormField label={t("regulation.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}>
                    <Select
                        disabled={readOnly || busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.status);
                            handleChange("status", nextValue as RegulationStatus);
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
                    label={t("regulation.fields.sortOrder", { defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´" })}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("regulation.fields.effectiveDate", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" })}
                >
                    <DatePicker
                        value={form.effectiveDate}
                        valueFormat={DATE_VALUE_FORMAT}
                        displayFormat={DATE_DISPLAY_FORMAT}
                        primaryCalendarType="Persian"
                        disabled={readOnly || busy}
                        placeholder={t("organization.fields.datePlaceholder", {
                            defaultValue: "Ø³Ø§Ù„/Ù…Ø§Ù‡/Ø±ÙˆØ²",
                        })}
                        onChange={(event) =>
                            handleChange("effectiveDate", readDatePickerValue(event))
                        }
                    />
                </FormField>

                <FormField
                    label={t("regulation.fields.validTo", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" })}
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

                <FormField
                    label={t("regulation.fields.issuer", { defaultValue: "Ù…Ø±Ø¬Ø¹ ØµØ§Ø¯Ø±Ú©Ù†Ù†Ø¯Ù‡" })}
                >
                    <Input
                        value={form.issuer}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("issuer", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("regulation.fields.owner", { defaultValue: "Ù…Ø§Ù„Ú©" })}>
                    <Input
                        value={form.ownerName}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("ownerName", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("regulation.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
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

    const renderRequirementActions = (requirement: RegulationNode) => {
        const canShow = Boolean(onShowRequirement);
        const canEdit = mode === "edit" && Boolean(onEditRequirement);
        const canDelete = mode === "edit" && Boolean(onDeleteRequirement);

        if (!canShow && !canEdit && !canDelete) {
            return "-";
        }

        return (
            <div style={REQUIREMENTS_ACTIONS_STYLE}>
                {canShow ? (
                    <Button
                        design="Transparent"
                        disabled={busy}
                        onClick={() => onShowRequirement?.(requirement.id)}
                    >
                        {t("common.view", { defaultValue: "Ù†Ù…Ø§ÛŒØ´" })}
                    </Button>
                ) : null}
                {canEdit ? (
                    <Button
                        design="Transparent"
                        disabled={busy}
                        onClick={() => onEditRequirement?.(requirement.id)}
                    >
                        {t("common.edit", { defaultValue: "ÙˆÛŒØ±Ø§ÛŒØ´" })}
                    </Button>
                ) : null}
                {canDelete ? (
                    <Button
                        design="Transparent"
                        disabled={busy}
                        onClick={() => onDeleteRequirement?.(requirement.id)}
                    >
                        {t("common.delete", { defaultValue: "Ø­Ø°Ù" })}
                    </Button>
                ) : null}
            </div>
        );
    };

    const renderRequirementsTab = () => {
        const canAddRequirement =
            mode === "edit" &&
            Boolean(currentRegulationId) &&
            Boolean(onCreateRequirement);

        return (
            <div style={TABLE_PANEL_STYLE}>
                <div style={REQUIREMENTS_HEADER_STYLE}>
                    <Title level="H5">
                        {t("regulation.requirements.title", {
                            defaultValue: "Ø§Ù„Ø²Ø§Ù…Ø§Øª Ù‚Ø§Ù†ÙˆÙ†",
                        })}
                    </Title>

                    {mode === "edit" ? (
                        <Button
                            design="Emphasized"
                            disabled={!canAddRequirement || busy}
                            onClick={() => {
                                if (currentRegulationId) {
                                    onCreateRequirement?.(currentRegulationId);
                                }
                            }}
                        >
                            {t("regulation.requirements.add", {
                                defaultValue: "Ø§ÙØ²ÙˆØ¯Ù† Ø§Ù„Ø²Ø§Ù…",
                            })}
                        </Button>
                    ) : null}
                </div>

                {!currentRegulationId && !readOnly ? (
                    <>
                        <div style={{ height: "0.75rem" }} />
                        <MessageStrip design="Information" hideCloseButton>
                            {t("regulation.requirements.saveFirst", {
                                defaultValue:
                                    "Ø§Ø¨ØªØ¯Ø§ Ù‚Ø§Ù†ÙˆÙ† Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯ØŒ Ø³Ù¾Ø³ Ø§Ù„Ø²Ø§Ù… Ø§Ø¶Ø§ÙÙ‡ Ú©Ù†ÛŒØ¯.",
                            })}
                        </MessageStrip>
                    </>
                ) : null}

                <div style={{ height: "0.75rem" }} />

                <Table
                    accessibleName={t("regulation.requirements.title", {
                        defaultValue: "Ø§Ù„Ø²Ø§Ù…Ø§Øª Ù‚Ø§Ù†ÙˆÙ†",
                    })}
                    alternateRowColors
                    headerRow={
                        <TableHeaderRow>
                            <TableHeaderCell width="8rem">
                                {t("regulation.requirements.columns.code", {
                                    defaultValue: "Ø´Ù†Ø§Ø³Ù‡",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell minWidth="12rem">
                                {t("regulation.requirements.columns.title", {
                                    defaultValue: "Ù†Ø§Ù… Ø§Ù„Ø²Ø§Ù…",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell minWidth="14rem">
                                {t("regulation.requirements.columns.description", {
                                    defaultValue: "Ø´Ø±Ø­",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell width="8rem">
                                {t("regulation.requirements.columns.status", {
                                    defaultValue: "ÙˆØ¶Ø¹ÛŒØª",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell width="10rem">
                                {t("regulation.requirements.columns.effectiveDate", {
                                    defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell width="10rem">
                                {t("regulation.requirements.columns.validTo", {
                                    defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell width="12rem">
                                {t("regulation.requirements.columns.actions", {
                                    defaultValue: "Ø¹Ù…Ù„ÛŒØ§Øª",
                                })}
                            </TableHeaderCell>
                        </TableHeaderRow>
                    }
                    loading={busy}
                    loadingDelay={0}
                    noDataText={t("regulation.requirements.empty", {
                        defaultValue: "Ø§Ù„Ø²Ø§Ù…ÛŒ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ù‚Ø§Ù†ÙˆÙ† Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.",
                    })}
                    overflowMode="Popin"
                >
                    {directRequirements.map((requirement) => (
                        <TableRow key={requirement.id} rowKey={requirement.id}>
                            <TableCell>{requirement.code || "-"}</TableCell>
                            <TableCell>{requirement.title || "-"}</TableCell>
                            <TableCell>{requirement.description || "-"}</TableCell>
                            <TableCell>{resolveStatusLabel(requirement.status, t)}</TableCell>
                            <TableCell>{formatPersianDate(requirement.effectiveDate)}</TableCell>
                            <TableCell>{formatPersianDate(requirement.validTo)}</TableCell>
                            <TableCell>{renderRequirementActions(requirement)}</TableCell>
                        </TableRow>
                    ))}
                </Table>
            </div>
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

    const renderTabContent = () => {
        if (effectiveActiveTab === "general") {
            return renderGeneralTab();
        }

        if (effectiveActiveTab === "requirements") {
            return renderRequirementsTab();
        }

        return (
            <DocumentManager
                title={t("regulation.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" })}
                targetType={resolveDocumentTargetType(form.nodeType)}
                targetId={currentRegulationId}
                busy={busy}
                readOnly={readOnly}
                saveFirstMessage={t("regulation.documents.saveFirst", {
                    defaultValue:
                        "Ø§Ø¨ØªØ¯Ø§ Ø¢ÛŒØªÙ… Ù‚Ø§Ù†ÙˆÙ† Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯ØŒ Ø³Ù¾Ø³ Ù…Ø³ØªÙ†Ø¯Ø§Øª Ø±Ø§ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ú©Ù†ÛŒØ¯.",
                })}
            />
        );
    };

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {mode === "create"
                            ? t("regulation.object.createModalTitle", { defaultValue: "Ø§ÛŒØ¬Ø§Ø¯" })
                            : resolveNodeTypeLabel(form.nodeType, t)}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem label={parentLabel} value={headerParent} />
                    <HeaderItem
                        label={t("regulation.fields.identifier", { defaultValue: "Ø´Ù†Ø§Ø³Ù‡" })}
                        value={form.code || value?.id}
                    />
                    <HeaderItem
                        label={t("regulation.fields.effectiveDate", {
                            defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯",
                        })}
                        value={formatPersianDate(form.effectiveDate || value?.effectiveDate)}
                    />
                    <HeaderItem
                        label={t("regulation.fields.validTo", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" })}
                        value={formatPersianDate(form.validTo || value?.validTo)}
                    />
                    <HeaderItem
                        label={t("regulation.fields.nodeType", { defaultValue: "Ù†ÙˆØ¹ Ø¢ÛŒØªÙ…" })}
                        value={headerType}
                    />
                    <HeaderItem
                        label={t("regulation.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}
                        value={headerStatus}
                    />
                    {headerTitle ? (
                        <HeaderItem
                            label={t("regulation.fields.name", { defaultValue: "Ù†Ø§Ù…" })}
                            value={headerTitle}
                        />
                    ) : null}
                </div>
            </div>

            <RegulationTabs
                tabs={tabs}
                activeTab={effectiveActiveTab}
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

            {renderFooterActions()}
        </div>
    );
}
