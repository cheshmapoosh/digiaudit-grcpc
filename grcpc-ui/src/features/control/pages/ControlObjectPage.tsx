import {
    Fragment,
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
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import type {
    ControlAssignmentStatus,
    ControlDetails,
    UpdateControlAssignmentRequest,
} from "../domain/control.model";
import {
    formatPersianDate,
    formatPersianDateTime,
    toEnglishDigits,
} from "@/shared/utils/date.utils";
import ControlAccountGroupsTab from "../components/tabs/ControlAccountGroupsTab";
import ControlDocumentsTab from "../components/tabs/ControlDocumentsTab";
import ControlPerformancePlanTab from "../components/tabs/ControlPerformancePlanTab";
import ControlRegulationsTab from "../components/tabs/ControlRegulationsTab";
import ControlRequirementsTab from "../components/tabs/ControlRequirementsTab";
import ControlRisksTab from "../components/tabs/ControlRisksTab";
import ControlStepsTab from "../components/tabs/ControlStepsTab";

export type ControlObjectMode = "view" | "edit";

type ControlTabKey =
    | "general"
    | "steps"
    | "regulations"
    | "requirements"
    | "risks"
    | "accountGroups"
    | "performancePlan"
    | "documents";

const MODAL_CONTROL_TABS: ControlTabKey[] = [
    "general",
    "regulations",
    "risks",
    "accountGroups",
    "documents",
];

const PANEL_CONTROL_TABS: ControlTabKey[] = [
    "general",
    "steps",
    "regulations",
    "requirements",
    "risks",
    "accountGroups",
    "performancePlan",
    "documents",
];

interface ControlAssignmentFormState {
    ownerName: string;
    validFrom: string;
    validTo: string;
    sortOrder: string;
    operationPeriod: string;
    testMethod: string;
    testPlan: string;
    assignmentStatus: ControlAssignmentStatus;
}

export interface ControlObjectPageProps {
    mode: ControlObjectMode;
    presentation?: "panel" | "modal";
    value: ControlDetails;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onSubmit: (payload: UpdateControlAssignmentRequest) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
}

const ROOT_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    background: "var(--sapBackgroundColor)",
};

const HEADER_STYLE: CSSProperties = {
    minWidth: 0,
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
    minWidth: 0,
};

const HEADER_ROW_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(6.5rem, 40%) minmax(0, 1fr)",
    gap: "0.5rem",
    alignItems: "center",
    minWidth: 0,
};

const CONTROL_TAB_CONTAINER_CLASS = "controlObjectTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${CONTROL_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${CONTROL_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${CONTROL_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${CONTROL_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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
    minWidth: 0,
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
    gap: "2rem",
    padding: "1rem 0 0",
};

const ACTION_BUTTON_STYLE: CSSProperties = {
    minWidth: "6rem",
};

const DETAIL_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(8rem, max-content) minmax(0, 1fr)",
    gap: "0.6rem 1rem",
    alignItems: "start",
};

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "d MMMM y";

function toFormState(value: ControlDetails): ControlAssignmentFormState {
    return {
        ownerName: value.ownerName ?? "",
        validFrom: toEnglishDigits(value.validFrom ?? ""),
        validTo: toEnglishDigits(value.validTo ?? ""),
        sortOrder: value.sortOrder?.toString() ?? "",
        operationPeriod: value.operationPeriod ?? "",
        testMethod: value.testMethod ?? "",
        testPlan: value.testPlan ?? "",
        assignmentStatus: value.assignmentStatus,
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

function readSelectedTabKey(event: unknown): ControlTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as ControlTabKey | null) ?? null;
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
    fullWidth = false,
    children,
}: {
    label: string;
    fullWidth?: boolean;
    children: ReactNode;
}) {
    return (
        <div style={{ ...FIELD_STYLE, ...(fullWidth ? FULL_WIDTH_STYLE : undefined) }}>
            <Label showColon>{label}</Label>
            {children}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
    return (
        <>
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
        </>
    );
}

function resolveStatusLabel(
    status: ControlAssignmentStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
        : t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" });
}

function resolveControlStatusLabel(
    status: ControlDetails["status"],
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
        : t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" });
}

function formatValidityRange(validFrom?: string | null, validTo?: string | null): string {
    if (!validFrom && !validTo) {
        return "-";
    }

    return `${formatPersianDate(validFrom)} - ${formatPersianDate(validTo)}`;
}

function resolveTabLabel(
    tab: ControlTabKey,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<ControlTabKey, string> = {
        general: t("control.tabs.general", { defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ" }),
        steps: t("control.tabs.steps", { defaultValue: "Ù…Ø±Ø§Ø­Ù„" }),
        regulations: t("control.tabs.regulations", { defaultValue: "Ù‚ÙˆØ§Ù†ÛŒÙ†" }),
        requirements: t("control.tabs.requirements", { defaultValue: "Ø§Ù„Ø²Ø§Ù…Ø§Øª" }),
        risks: t("control.tabs.risks", { defaultValue: "Ø±ÛŒØ³Ú©â€ŒÙ‡Ø§" }),
        accountGroups: t("control.tabs.accountGroups", { defaultValue: "Ú¯Ø±ÙˆÙ‡ Ø­Ø³Ø§Ø¨â€ŒÙ‡Ø§" }),
        performancePlan: t("control.tabs.performancePlan", {
            defaultValue: "Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø¹Ù…Ù„Ú©Ø±Ø¯",
        }),
        documents: t("control.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" }),
    };

    return labels[tab];
}

function ControlTabs({
    activeTab,
    tabs,
    onChange,
}: {
    activeTab: ControlTabKey;
    tabs: ControlTabKey[];
    onChange: (tab: ControlTabKey) => void;
}) {
    const { t } = useTranslation();

    return (
        <DetailTabContainer
            className={CONTROL_TAB_CONTAINER_CLASS}
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

export default function ControlObjectPage({
    mode,
    presentation = "modal",
    value,
    busy = false,
    error,
    onErrorClose,
    onSubmit,
    onCancel,
    onEdit,
}: ControlObjectPageProps) {
    const { t } = useTranslation();
    const isPanel = presentation === "panel";
    const effectiveReadOnly = isPanel || mode === "view";
    const showTabActions = !isPanel;
    const tabs = isPanel ? PANEL_CONTROL_TABS : MODAL_CONTROL_TABS;
    const [form, setForm] = useState<ControlAssignmentFormState>(() => toFormState(value));
    const [validationError, setValidationError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ControlTabKey>("general");

    const handleChange = <K extends keyof ControlAssignmentFormState>(
        key: K,
        nextValue: ControlAssignmentFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const validate = (): boolean => {
        if (form.sortOrder.trim() && parseSortOrder(form.sortOrder) === undefined) {
            setValidationError(
                t("control.validation.sortOrderInvalid", {
                    defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´ Ø¨Ø§ÛŒØ¯ Ø¹Ø¯Ø¯ ØµØ­ÛŒØ­ Ù†Ø§Ù…Ù†ÙÛŒ Ø¨Ø§Ø´Ø¯",
                }),
            );
            return false;
        }

        setValidationError(null);
        return true;
    };

    const handleSubmit = async () => {
        if (effectiveReadOnly || !validate()) {
            return;
        }

        const payload: UpdateControlAssignmentRequest = {
            ownerName: normalizeOptionalText(form.ownerName),
            validFrom: normalizeOptionalText(form.validFrom),
            validTo: normalizeOptionalText(form.validTo),
            sortOrder: parseSortOrder(form.sortOrder),
            operationPeriod: normalizeOptionalText(form.operationPeriod),
            testMethod: normalizeOptionalText(form.testMethod),
            testPlan: normalizeOptionalText(form.testPlan),
            assignmentStatus: form.assignmentStatus || value.assignmentStatus,
        };

        await onSubmit(payload);
    };

    const renderViewContent = () => (
        <div style={{ display: "grid", gap: "1rem" }}>
            <Title level="H5">
                {t("control.sections.assignmentInfo", {
                    defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„",
                })}
            </Title>

            <div style={DETAIL_GRID_STYLE}>
                <DetailRow label={t("control.fields.code", { defaultValue: "Ú©Ø¯" })} value={value.code} />
                <DetailRow label={t("control.fields.name", { defaultValue: "Ù†Ø§Ù…" })} value={value.name} />
                <DetailRow
                    label={t("control.fields.controlClass", { defaultValue: "Ø·Ø¨Ù‚Ù‡ Ú©Ù†ØªØ±Ù„" })}
                    value={value.controlClass}
                />
                <DetailRow
                    label={t("control.fields.controlNature", { defaultValue: "Ù…Ø§Ù‡ÛŒØª Ú©Ù†ØªØ±Ù„" })}
                    value={value.controlNature ? t(`control.nature.${value.controlNature}`) : undefined}
                />
                <DetailRow
                    label={t("control.fields.automationType", { defaultValue: "Ù†ÙˆØ¹ Ø§Ø¬Ø±Ø§" })}
                    value={
                        value.automationType
                            ? t(`control.automation.${value.automationType}`)
                            : undefined
                    }
                />
                <DetailRow
                    label={t("control.fields.importance", { defaultValue: "Ø§Ù‡Ù…ÛŒØª" })}
                    value={value.importance ? t(`control.importance.${value.importance}`) : undefined}
                />
                <DetailRow
                    label={t("control.fields.ownerName", { defaultValue: "Ù…Ø³Ø¦ÙˆÙ„" })}
                    value={value.ownerName}
                />
                <DetailRow
                    label={t("control.fields.validity", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø±" })}
                    value={formatValidityRange(value.validFrom, value.validTo)}
                />
                <DetailRow
                    label={t("control.fields.sortOrder", { defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´" })}
                    value={value.sortOrder?.toString()}
                />
                <DetailRow
                    label={t("control.fields.operationPeriod", { defaultValue: "Ø¯ÙˆØ±Ù‡ Ø¹Ù…Ù„ÛŒØ§Øª" })}
                    value={value.operationPeriod}
                />
                <DetailRow
                    label={t("control.fields.testMethod", { defaultValue: "Ø±ÙˆØ´ Ø¢Ø²Ù…ÙˆÙ†" })}
                    value={value.testMethod}
                />
                <DetailRow
                    label={t("control.fields.testPlan", { defaultValue: "Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø¢Ø²Ù…ÙˆÙ†" })}
                    value={value.testPlan}
                />
                <DetailRow
                    label={t("control.fields.assignmentStatus", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª Ø§ØªØµØ§Ù„" })}
                    value={resolveStatusLabel(value.assignmentStatus, t)}
                />
                <DetailRow
                    label={t("control.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª Ú©Ù†ØªØ±Ù„" })}
                    value={resolveControlStatusLabel(value.status, t)}
                />
                <DetailRow
                    label={t("control.fields.objective", { defaultValue: "Ù‡Ø¯Ù" })}
                    value={value.objective}
                />
                <DetailRow
                    label={t("control.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
                    value={value.description}
                />
                <DetailRow
                    label={t("control.fields.updatedAt", { defaultValue: "Ø¢Ø®Ø±ÛŒÙ† Ø¨Ø±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ" })}
                    value={formatPersianDateTime(value.updatedAt)}
                />
            </div>
        </div>
    );

    const renderEditContent = () => (
        <>
            <Title level="H5">
                {t("control.sections.assignmentInfo", {
                    defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø§ØªØµØ§Ù„ Ú©Ù†ØªØ±Ù„",
                })}
            </Title>

            <div style={{ height: "0.75rem" }} />

            <div style={FORM_GRID_STYLE}>
                <FormField label={t("control.fields.ownerName", { defaultValue: "Ù…Ø³Ø¦ÙˆÙ„" })}>
                    <Input
                        value={form.ownerName}
                        disabled={busy}
                        onInput={(event) => handleChange("ownerName", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.assignmentStatus", {
                        defaultValue: "ÙˆØ¶Ø¹ÛŒØª Ø§ØªØµØ§Ù„",
                    })}
                >
                    <Select
                        disabled={busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.assignmentStatus);
                            handleChange("assignmentStatus", nextValue as ControlAssignmentStatus);
                        }}
                    >
                        <Option data-value="active" selected={form.assignmentStatus === "active"}>
                            {t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })}
                        </Option>
                        <Option data-value="inactive" selected={form.assignmentStatus === "inactive"}>
                            {t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" })}
                        </Option>
                    </Select>
                </FormField>

                <FormField label={t("control.fields.validFrom", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± Ø§Ø²" })}>
                    <DatePicker
                        value={form.validFrom}
                        valueFormat={DATE_VALUE_FORMAT}
                        formatPattern={DATE_DISPLAY_FORMAT}
                        disabled={busy}
                        onChange={(event) => handleChange("validFrom", readDatePickerValue(event))}
                    />
                </FormField>

                <FormField label={t("control.fields.validTo", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± ØªØ§" })}>
                    <DatePicker
                        value={form.validTo}
                        valueFormat={DATE_VALUE_FORMAT}
                        formatPattern={DATE_DISPLAY_FORMAT}
                        disabled={busy}
                        onChange={(event) => handleChange("validTo", readDatePickerValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.sortOrder", { defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´" })}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.operationPeriod", {
                        defaultValue: "Ø¯ÙˆØ±Ù‡ Ø¹Ù…Ù„ÛŒØ§Øª",
                    })}
                >
                    <Input
                        value={form.operationPeriod}
                        disabled={busy}
                        onInput={(event) => handleChange("operationPeriod", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.testMethod", { defaultValue: "Ø±ÙˆØ´ Ø¢Ø²Ù…ÙˆÙ†" })}
                    fullWidth
                >
                    <TextArea
                        rows={3}
                        value={form.testMethod}
                        disabled={busy}
                        onInput={(event) => handleChange("testMethod", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.testPlan", { defaultValue: "Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø¢Ø²Ù…ÙˆÙ†" })}
                    fullWidth
                >
                    <TextArea
                        rows={4}
                        value={form.testPlan}
                        disabled={busy}
                        onInput={(event) => handleChange("testPlan", readInputValue(event))}
                    />
                </FormField>
            </div>
        </>
    );

    const renderGeneralTab = () => (
        <>
            {effectiveReadOnly ? renderViewContent() : renderEditContent()}
        </>
    );

    const renderFooterActions = () => {
        if (isPanel) {
            return (
                <div style={FOOTER_STYLE}>
                    <Button
                        design="Transparent"
                        style={ACTION_BUTTON_STYLE}
                        onClick={onCancel}
                    >
                        {t("common.close", { defaultValue: "Ø¨Ø³ØªÙ†" })}
                    </Button>
                </div>
            );
        }

        return (
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
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "steps":
                return (
                    <ControlStepsTab
                        key={`${value.controlAssignmentId}:steps`}
                        controlAssignmentId={value.controlAssignmentId}
                        readOnly={effectiveReadOnly}
                        showActions={showTabActions}
                    />
                );
            case "regulations":
                return (
                    <ControlRegulationsTab
                        key={`${value.controlAssignmentId}:regulations`}
                        controlAssignmentId={value.controlAssignmentId}
                        readOnly={effectiveReadOnly}
                        showActions={showTabActions}
                    />
                );
            case "requirements":
                return (
                    <ControlRequirementsTab
                        key={`${value.controlAssignmentId}:requirements`}
                        controlAssignmentId={value.controlAssignmentId}
                        readOnly={effectiveReadOnly}
                        showActions={showTabActions}
                    />
                );
            case "risks":
                return (
                    <ControlRisksTab
                        key={`${value.controlAssignmentId}:risks`}
                        controlAssignmentId={value.controlAssignmentId}
                        readOnly={effectiveReadOnly}
                        showActions={showTabActions}
                    />
                );
            case "accountGroups":
                return (
                    <ControlAccountGroupsTab
                        key={`${value.controlAssignmentId}:account-groups`}
                        controlAssignmentId={value.controlAssignmentId}
                        readOnly={effectiveReadOnly}
                        showActions={showTabActions}
                    />
                );
            case "performancePlan":
                return (
                    <ControlPerformancePlanTab
                        key={`${value.controlAssignmentId}:performance-plans`}
                        controlAssignmentId={value.controlAssignmentId}
                        readOnly={effectiveReadOnly}
                        showActions={showTabActions}
                    />
                );
            case "documents":
                return (
                    <ControlDocumentsTab
                        key={`${value.controlAssignmentId}:documents`}
                        controlId={value.controlId}
                        readOnly={effectiveReadOnly}
                        showActions={showTabActions}
                    />
                );
            case "general":
            default:
                return renderGeneralTab();
        }
    };

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">{`${value.code} - ${value.name}`}</Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("control.fields.parentProcess", {
                            defaultValue: "ÙØ±Ø¢ÛŒÙ†Ø¯ ÙˆØ§Ù„Ø¯",
                        })}
                        value={value.parentProcessTitle}
                    />
                    <HeaderItem
                        label={t("control.fields.parentSubProcess", {
                            defaultValue: "Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯",
                        })}
                        value={value.parentSubProcessTitle}
                    />
                    <HeaderItem
                        label={t("control.fields.validity", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø±" })}
                        value={formatValidityRange(value.validFrom, value.validTo)}
                    />
                    <HeaderItem
                        label={t("control.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª Ú©Ù†ØªØ±Ù„" })}
                        value={resolveControlStatusLabel(value.status, t)}
                    />
                </div>
            </div>

            <ControlTabs activeTab={activeTab} tabs={tabs} onChange={setActiveTab} />

            {error ? (
                <MessageStrip
                    design="Negative"
                    hideCloseButton={isPanel}
                    onClose={isPanel ? undefined : onErrorClose}
                >
                    {error}
                </MessageStrip>
            ) : null}

            {validationError ? (
                <MessageStrip
                    design="Negative"
                    hideCloseButton={isPanel}
                    onClose={isPanel ? undefined : () => setValidationError(null)}
                >
                    {validationError}
                </MessageStrip>
            ) : null}

            <div style={BODY_STYLE}>{renderTabContent()}</div>

            {renderFooterActions()}
        </div>
    );
}
