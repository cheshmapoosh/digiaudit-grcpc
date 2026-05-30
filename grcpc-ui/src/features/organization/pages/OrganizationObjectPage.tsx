import { useState, type CSSProperties, type ReactNode } from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
import {
    Button,
    ComboBox,
    ComboBoxItem,
    DatePicker,
    Input,
    Label,
    MessageStrip,
    Option,
    Select,
    Tab,
    Table,
    TableCell,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    TabContainer,
    TabSeparator,
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import type {
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
    OrganizationStatus,
    OrganizationType,
} from "../domain/organization.model";
import type {
    OrganizationProcessAssignmentType,
    OrganizationReferenceOption,
    OrganizationReferenceType,
    OrganizationReferenceView,
    OrganizationRiskAssignment,
    OrganizationRiskOption,
    OrganizationSubProcessOption,
    OrganizationSubProcessView,
} from "../domain/organization-process-assignment.model";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";
import {
    formatPersianDate,
    toEnglishDigits,
} from "@/shared/utils/date.utils";

export type OrganizationObjectMode = "create" | "edit" | "view";

export type OrganizationTabKey =
    | "general"
    | "subProcesses"
    | "risks"
    | "controls"
    | "rules"
    | "policies"
    | "goals"
    | "kpi"
    | "kri"
    | "riskAppetite"
    | "owner"
    | "documents"
    | "performance";

interface OrganizationFormState {
    code: string;
    name: string;
    type: OrganizationType;
    description: string;
    parentId: string | null;
    status: OrganizationStatus;
    validFrom: string;
    validTo: string;
    location: string;
}

export interface OrganizationObjectPageProps {
    mode: OrganizationObjectMode;
    allItems: OrganizationNode[];
    value: OrganizationNode | null;
    activeTab?: OrganizationTabKey;
    subProcesses?: OrganizationSubProcessView[];
    availableSubProcesses?: OrganizationSubProcessOption[];
    controlReferences?: OrganizationReferenceView[];
    availableControlReferences?: OrganizationReferenceOption[];
    regulationReferences?: OrganizationReferenceView[];
    availableRegulationReferences?: OrganizationReferenceOption[];
    policyReferences?: OrganizationReferenceView[];
    availablePolicyReferences?: OrganizationReferenceOption[];
    objectiveReferences?: OrganizationReferenceView[];
    availableObjectiveReferences?: OrganizationReferenceOption[];
    risks?: OrganizationRiskAssignment[];
    availableRisks?: OrganizationRiskOption[];
    subProcessesBusy?: boolean;
    relationshipsBusy?: boolean;
    referencesBusy?: boolean;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onSubmit: (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
    onAssignSubProcess?: (processNodeId: string) => Promise<void> | void;
    onRemoveSubProcessAssignment?: (assignmentId: string) => Promise<void> | void;
    onAssignRisk?: (processNodeId: string, riskNodeId: string) => Promise<void> | void;
    onRemoveRiskAssignment?: (assignmentId: string) => Promise<void> | void;
    onAssignReference?: (
        referenceType: OrganizationReferenceType,
        referenceId: string,
    ) => Promise<void> | void;
    onRemoveReferenceAssignment?: (
        referenceType: OrganizationReferenceType,
        assignmentId: string,
    ) => Promise<void> | void;
    onActiveTabChange?: (tab: OrganizationTabKey) => void;
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

const ORGANIZATION_TAB_CONTAINER_CLASS = "organizationObjectTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${ORGANIZATION_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${ORGANIZATION_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${ORGANIZATION_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${ORGANIZATION_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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
    minHeight: "18rem",
    padding: "0.75rem",
};

const FORM_GRID_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};

const FIELD_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.35rem",
};

const FULL_WIDTH_STYLE: CSSProperties = {
    gridColumn: "1 / -1",
};

const PARENT_PICKER_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto auto",
    gap: "0.75rem",
    alignItems: "end",
};

const FOOTER_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    flexWrap: "wrap",
    padding: "0.25rem 0 0",
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
    fontFamily: "var(--sapFontFamily)",
};

const TABLE_ACTIONS_STYLE: CSSProperties = {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "flex-start",
    flexWrap: "wrap",
};

const TABLE_HINT_STYLE: CSSProperties = {
    fontSize: "0.875rem",
    color: "var(--sapContent_LabelColor)",
};

const TABLE_STYLE: CSSProperties = {
    width: "100%",
    minHeight: "11rem",
    fontFamily: "var(--sapFontFamily)",
};

const TABLE_TEXT_CELL_STYLE: CSSProperties = {
    fontFamily: "var(--sapFontFamily)",
    fontFeatureSettings: '"ss01"',
};

const SUB_PROCESS_PICKER_STYLE: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "flex-start",
    gap: "0.5rem",
    alignItems: "center",
    width: "100%",
};

const SUB_PROCESS_COMBOBOX_STYLE: CSSProperties = {
    flex: "0 1 28rem",
    width: "min(100%, 28rem)",
    maxWidth: "28rem",
};

const SUB_PROCESS_ADD_BUTTON_STYLE: CSSProperties = {
    flex: "0 0 auto",
    minWidth: "8rem",
    whiteSpace: "nowrap",
};

const TABLE_CELL_CONTENT_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.15rem",
    minWidth: 0,
    fontFamily: "var(--sapFontFamily)",
};

const TABLE_SECONDARY_TEXT_STYLE: CSSProperties = {
    color: "var(--sapContent_LabelColor)",
    fontSize: "0.8125rem",
    overflowWrap: "anywhere",
};

const TABLE_INLINE_META_STYLE: CSSProperties = {
    display: "flex",
    gap: "0.25rem",
    flexWrap: "wrap",
    color: "var(--sapContent_LabelColor)",
    fontSize: "0.8125rem",
};

const TAB_SEQUENCE: readonly OrganizationTabKey[] = [
    "general",
    "subProcesses",
    "risks",
    "controls",
    "rules",
    "policies",
    "goals",
    "kpi",
    "kri",
    "riskAppetite",
    "owner",
    "documents",
    "performance",
];

const EMPTY_SELECTED_REFERENCES: Record<OrganizationReferenceType, string> = {
    CONTROL: "",
    REGULATION: "",
    POLICY: "",
    OBJECTIVE: "",
};

function toFormState(
    value: OrganizationNode | null,
    defaultParentId: string | null,
): OrganizationFormState {
    return {
        code: value?.code ?? "",
        name: value?.name ?? "",
        type: value?.type ?? "unit",
        description: value?.description ?? "",
        parentId: value?.parentId ?? defaultParentId,
        status: value?.status ?? "active",
        validFrom: toEnglishDigits(value?.validFrom ?? ""),
        validTo: toEnglishDigits(value?.validTo ?? ""),
        location: value?.location ?? "",
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

function readSelectedComboBoxDataValue(event: unknown, fallback: string): string {
    const selectedItem = (event as {
        detail?: {
            item?: {
                getAttribute?: (name: string) => string | null;
            };
        };
    }).detail?.item;

    return selectedItem?.getAttribute?.("data-value") ?? fallback;
}

function readSelectedTabKey(event: unknown): OrganizationTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as OrganizationTabKey | null) ?? null;
}

function normalizeOptionalText(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function HeaderItem({
    label,
    value,
}: {
    label: string;
    value?: string | null;
}) {
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

function resolveTypeLabel(
    type: OrganizationType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<OrganizationType, string> = {
        holding: t("organization.type.holding", { defaultValue: "هلدینگ" }),
        company: t("organization.type.company", { defaultValue: "شرکت" }),
        deputy: t("organization.type.deputy", { defaultValue: "معاونت" }),
        office: t("organization.type.office", { defaultValue: "اداره" }),
        unit: t("organization.type.unit", { defaultValue: "واحد" }),
        committee: t("organization.type.committee", { defaultValue: "کمیته" }),
        group: t("organization.type.group", { defaultValue: "گروه" }),
        department: t("organization.type.department", { defaultValue: "دپارتمان" }),
        management: t("organization.type.management", { defaultValue: "مدیریت" }),
        branch: t("organization.type.branch", { defaultValue: "شعبه" }),
        other: t("organization.type.other", { defaultValue: "سایر" }),
    };

    return map[type] ?? type;
}

function resolveStatusLabel(
    status: OrganizationStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (status === "inactive") {
        return t("common.inactive", { defaultValue: "غیرفعال" });
    }

    return t("common.active", { defaultValue: "فعال" });
}

function resolveAssignmentTypeLabel(
    assignmentType: OrganizationProcessAssignmentType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<OrganizationProcessAssignmentType, string> = {
        scope: t("organization.assignmentType.scope", { defaultValue: "محدوده" }),
        owner: t("organization.assignmentType.owner", { defaultValue: "مالک" }),
        participant: t("organization.assignmentType.participant", {
            defaultValue: "مشارکت کننده",
        }),
    };

    return map[assignmentType];
}

function formatSubProcessOption(option: OrganizationSubProcessOption): string {
    const parentTitle = option.parentProcessTitle
        ? ` (${option.parentProcessCode ? `${option.parentProcessCode} - ` : ""}${option.parentProcessTitle})`
        : "";

    return `${option.code} - ${option.title}${parentTitle}`;
}

function formatAssignedSubProcessOption(option: OrganizationSubProcessView): string {
    return `${option.code} - ${option.title}`;
}

function formatRiskOption(option: OrganizationRiskOption): string {
    return `${option.code} - ${option.title}`;
}

function formatReferenceOption(option: OrganizationReferenceOption): string {
    const parentTitle = option.parentTitle
        ? ` (${option.parentCode ? `${option.parentCode} - ` : ""}${option.parentTitle})`
        : "";

    return `${option.code} - ${option.title}${parentTitle}`;
}

function formatOptionalValue(value?: string): string {
    return formatPersianDate(value);
}

function formatValidityRange(validFrom?: string, validTo?: string): string {
    if (!validFrom && !validTo) {
        return "-";
    }

    return `${formatOptionalValue(validFrom)} - ${formatOptionalValue(validTo)}`;
}

function resolveTabLabel(
    tab: OrganizationTabKey,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<OrganizationTabKey, string> = {
        general: t("organization.tabs.general", { defaultValue: "اطلاعات کلی" }),
        subProcesses: t("organization.tabs.subProcesses", { defaultValue: "زیر فرآیند" }),
        risks: t("organization.tabs.risks", { defaultValue: "ریسک ها" }),
        controls: t("organization.tabs.controls", { defaultValue: "کنترل ها" }),
        rules: t("organization.tabs.rules", { defaultValue: "قوانین" }),
        policies: t("organization.tabs.policies", { defaultValue: "سیاست ها" }),
        goals: t("organization.tabs.goals", { defaultValue: "اهداف" }),
        kpi: "KPI",
        kri: "KRI",
        riskAppetite: t("organization.tabs.riskAppetite", { defaultValue: "اشتهای ریسک" }),
        owner: t("organization.tabs.owner", { defaultValue: "مالک" }),
        documents: t("organization.tabs.documents", { defaultValue: "مستندات" }),
        performance: t("organization.tabs.performance", { defaultValue: "ارزیابی عملکرد" }),
    };

    return labels[tab];
}

function OrganizationTabs({
    activeTab,
    onChange,
}: {
    activeTab: OrganizationTabKey;
    onChange: (tab: OrganizationTabKey) => void;
}) {
    const { t } = useTranslation();

    return (
        <TabContainer
            className={ORGANIZATION_TAB_CONTAINER_CLASS}
            onTabSelect={(event) => {
                const nextTab = readSelectedTabKey(event);
                if (nextTab) {
                    onChange(nextTab);
                }
            }}
            style={TAB_CONTAINER_STYLE}
        >
            {TAB_SEQUENCE.flatMap((tab, index) => {
                const tabItem = (
                    <Tab
                        key={tab}
                        text={resolveTabLabel(tab, t)}
                        selected={activeTab === tab}
                        data-tab-key={tab}
                    />
                );

                if (index === 0) {
                    return [tabItem];
                }

                if (index === 1) {
                    return [<TabSeparator key="general-separator" />, tabItem];
                }

                return [tabItem];
            })}
        </TabContainer>
    );
}

function TablePlaceholder({
    title,
    columns,
    actions,
    hint,
    rowCount = 3,
}: {
    title: string;
    columns: string[];
    actions?: ReactNode;
    hint?: string;
    rowCount?: number;
}) {
    return (
        <div style={TABLE_PANEL_STYLE}>
            <Title level="H5">{title}</Title>

            {hint ? <div style={TABLE_HINT_STYLE}>{hint}</div> : null}

            {actions ? <div style={TABLE_ACTIONS_STYLE}>{actions}</div> : null}

            <Table
                style={TABLE_STYLE}
                noDataText=""
                headerRow={
                    <TableHeaderRow>
                        {columns.map((column) => (
                            <TableHeaderCell key={column} style={TABLE_TEXT_CELL_STYLE}>
                                {column}
                            </TableHeaderCell>
                        ))}
                    </TableHeaderRow>
                }
            >
                {Array.from({ length: rowCount }, (_, rowIndex) => rowIndex).map((rowIndex) => (
                    <TableRow key={`placeholder-row-${rowIndex}`}>
                        {columns.map((column, columnIndex) => (
                            <TableCell
                                key={`${column}-${rowIndex}-${columnIndex}`}
                                style={TABLE_TEXT_CELL_STYLE}
                            >
                                {"\u00A0"}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </Table>
        </div>
    );
}

export default function OrganizationObjectPage({
    mode,
    allItems,
    value,
    activeTab: controlledActiveTab,
    subProcesses = [],
    availableSubProcesses = [],
    controlReferences = [],
    availableControlReferences = [],
    regulationReferences = [],
    availableRegulationReferences = [],
    policyReferences = [],
    availablePolicyReferences = [],
    objectiveReferences = [],
    availableObjectiveReferences = [],
    risks = [],
    availableRisks = [],
    subProcessesBusy = false,
    relationshipsBusy = false,
    referencesBusy = false,
    busy = false,
    error,
    onErrorClose,
    onSubmit,
    onCancel,
    onEdit,
    onAssignSubProcess,
    onRemoveSubProcessAssignment,
    onAssignRisk,
    onRemoveRiskAssignment,
    onAssignReference,
    onRemoveReferenceAssignment,
    onActiveTabChange,
}: OrganizationObjectPageProps) {
    const { t } = useTranslation();

    const readOnly = mode === "view";
    const defaultParentId = value?.parentId ?? null;

    /*
     * This state resets by object key in OrganizationsFclShellPage.
     * Avoid useEffect synchronization for hook-safety.
     */
    const [form, setForm] = useState<OrganizationFormState>(() =>
        toFormState(value, defaultParentId),
    );

    const [validationError, setValidationError] = useState<string | null>(null);
    const [parentDialogOpen, setParentDialogOpen] = useState(false);
    const [internalActiveTab, setInternalActiveTab] = useState<OrganizationTabKey>("general");
    const [selectedSubProcessId, setSelectedSubProcessId] = useState("");
    const [selectedSubProcessSearchValue, setSelectedSubProcessSearchValue] = useState("");
    const [selectedRiskSubProcessId, setSelectedRiskSubProcessId] = useState("");
    const [selectedRiskId, setSelectedRiskId] = useState("");
    const [selectedRiskSearchValue, setSelectedRiskSearchValue] = useState("");
    const [selectedReferenceIds, setSelectedReferenceIds] = useState<
        Record<OrganizationReferenceType, string>
    >(EMPTY_SELECTED_REFERENCES);
    const [selectedReferenceSearchValues, setSelectedReferenceSearchValues] = useState<
        Record<OrganizationReferenceType, string>
    >(EMPTY_SELECTED_REFERENCES);
    const activeTab = controlledActiveTab ?? internalActiveTab;

    const handleActiveTabChange = (tab: OrganizationTabKey) => {
        if (controlledActiveTab === undefined) {
            setInternalActiveTab(tab);
        }

        onActiveTabChange?.(tab);
    };

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? null
        : null;

    const selectedParentTitle = selectedParent
        ? `${selectedParent.code} - ${selectedParent.name}`
        : t("common.none", { defaultValue: "ندارد" });

    const headerName = form.name || value?.name || "";
    const headerParent = selectedParent
        ? selectedParent.name
        : t("common.none", { defaultValue: "ندارد" });
    const headerStatus = resolveStatusLabel(form.status, t);
    const headerType = resolveTypeLabel(form.type, t);
    const headerLocation = form.location || value?.location || "";

    const handleChange = <K extends keyof OrganizationFormState>(
        key: K,
        nextValue: OrganizationFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const validate = (): boolean => {
        if (!form.code.trim()) {
            setValidationError(
                t("organization.validation.codeRequired", {
                    defaultValue: "کد الزامی است",
                }),
            );
            return false;
        }

        if (!form.name.trim()) {
            setValidationError(
                t("organization.validation.nameRequired", {
                    defaultValue: "نام الزامی است",
                }),
            );
            return false;
        }

        if (form.location.length > 255) {
            setValidationError(
                t("organization.validation.locationMaxLength", {
                    defaultValue: "موقعیت نمی‌تواند بیشتر از 255 کاراکتر باشد",
                }),
            );
            return false;
        }

        if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
            setValidationError(
                t("organization.validation.validRange", {
                    defaultValue: "تاریخ شروع باید قبل از تاریخ پایان باشد",
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

        const payload: OrganizationNodeCreate | OrganizationNodeUpdate = {
            code: form.code.trim(),
            name: form.name.trim(),
            type: form.type,
            description: normalizeOptionalText(form.description),
            parentId: form.parentId,
            status: form.status,
            validFrom: normalizeOptionalText(form.validFrom),
            validTo: normalizeOptionalText(form.validTo),
            location: normalizeOptionalText(form.location),
        };

        await onSubmit(payload);
    };

    const renderFooterActions = () => {
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

        return (
            <>
                <Button
                    design="Emphasized"
                    disabled={busy}
                    style={ACTION_BUTTON_STYLE}
                    onClick={handleSubmit}
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
    };

    const tabActionButtons = (labels: string[]) => (
        <>
            {labels.map((label, index) => (
                <Button
                    key={label}
                    design={index === 0 ? "Emphasized" : "Transparent"}
                    disabled={readOnly || busy}
                >
                    {label}
                </Button>
            ))}
        </>
    );

    const assignedSubProcessIds = new Set(
        subProcesses.map((subProcess) => subProcess.processNodeId),
    );
    const unassignedSubProcesses = availableSubProcesses.filter(
        (subProcess) => !assignedSubProcessIds.has(subProcess.processNodeId),
    );

    const selectedAssignableSubProcess = unassignedSubProcesses.some(
        (subProcess) => subProcess.processNodeId === selectedSubProcessId,
    )
        ? selectedSubProcessId
        : "";
    const selectedSubProcessOption = unassignedSubProcesses.find(
        (subProcess) => subProcess.processNodeId === selectedAssignableSubProcess,
    );
    const subProcessComboBoxValue =
        selectedSubProcessOption
            ? formatSubProcessOption(selectedSubProcessOption)
            : selectedSubProcessSearchValue;
    const selectedRiskSubProcess = subProcesses.find(
        (subProcess) => subProcess.processNodeId === selectedRiskSubProcessId,
    );
    const riskSubProcessComboBoxValue = selectedRiskSubProcess
        ? formatAssignedSubProcessOption(selectedRiskSubProcess)
        : "";
    const assignedRiskKeys = new Set(
        risks.map((risk) => `${risk.processNodeId}:${risk.riskNodeId}`),
    );
    const assignableRisks = selectedRiskSubProcessId
        ? availableRisks.filter(
              (risk) => !assignedRiskKeys.has(`${selectedRiskSubProcessId}:${risk.riskNodeId}`),
          )
        : availableRisks;
    const selectedRiskOption = assignableRisks.find(
        (risk) => risk.riskNodeId === selectedRiskId,
    );
    const riskComboBoxValue = selectedRiskOption
        ? formatRiskOption(selectedRiskOption)
        : selectedRiskSearchValue;

    const setReferenceSelection = (
        referenceType: OrganizationReferenceType,
        referenceId: string,
        searchValue: string,
    ) => {
        setSelectedReferenceIds((current) => ({
            ...current,
            [referenceType]: referenceId,
        }));
        setSelectedReferenceSearchValues((current) => ({
            ...current,
            [referenceType]: searchValue,
        }));
    };

    const handleAssignReference = async (
        referenceType: OrganizationReferenceType,
        options: OrganizationReferenceOption[],
    ) => {
        const selectedReferenceId = selectedReferenceIds[referenceType];
        const selectedSearchValue = selectedReferenceSearchValues[referenceType];
        const typedMatch = options.find(
            (option) => formatReferenceOption(option) === selectedSearchValue,
        );
        const targetId = selectedReferenceId || typedMatch?.referenceId;

        if (!targetId || !onAssignReference || !value?.id) {
            return;
        }

        await onAssignReference(referenceType, targetId);
        setReferenceSelection(referenceType, "", "");
    };

    const handleAssignSubProcess = async () => {
        const typedMatch = unassignedSubProcesses.find(
            (subProcess) =>
                formatSubProcessOption(subProcess) === selectedSubProcessSearchValue,
        );
        const targetId =
            selectedAssignableSubProcess || typedMatch?.processNodeId;

        if (!targetId || !onAssignSubProcess || !value?.id) {
            return;
        }

        await onAssignSubProcess(targetId);
        setSelectedSubProcessId("");
        setSelectedSubProcessSearchValue("");
    };

    const handleAssignRisk = async () => {
        const typedMatch = assignableRisks.find(
            (risk) => formatRiskOption(risk) === selectedRiskSearchValue,
        );
        const targetRiskId = selectedRiskId || typedMatch?.riskNodeId;

        if (!selectedRiskSubProcessId || !targetRiskId || !onAssignRisk || !value?.id) {
            return;
        }

        await onAssignRisk(selectedRiskSubProcessId, targetRiskId);
        setSelectedRiskId("");
        setSelectedRiskSearchValue("");
    };

    const renderGeneralTab = () => (
        <div style={FORM_GRID_STYLE}>
            <FormField
                label={t("organization.fields.code", { defaultValue: "کد" })}
                required
            >
                <Input
                    value={form.code}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("code", readInputValue(event))}
                />
            </FormField>

            <FormField
                label={t("organization.fields.name", { defaultValue: "نام" })}
                required
            >
                <Input
                    value={form.name}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("name", readInputValue(event))}
                />
            </FormField>

            <FormField
                label={t("organization.fields.type", { defaultValue: "نوع سازمان" })}
            >
                <Select
                    disabled={readOnly || busy}
                    onChange={(event) => {
                        const nextValue = readSelectedDataValue(event, form.type);
                        handleChange("type", nextValue as OrganizationType);
                    }}
                >
                    <Option data-value="holding" selected={form.type === "holding"}>
                        {t("organization.type.holding", { defaultValue: "هلدینگ" })}
                    </Option>
                    <Option data-value="company" selected={form.type === "company"}>
                        {t("organization.type.company", { defaultValue: "شرکت" })}
                    </Option>
                    <Option data-value="deputy" selected={form.type === "deputy"}>
                        {t("organization.type.deputy", { defaultValue: "معاونت" })}
                    </Option>
                    <Option data-value="office" selected={form.type === "office"}>
                        {t("organization.type.office", { defaultValue: "اداره" })}
                    </Option>
                    <Option data-value="unit" selected={form.type === "unit"}>
                        {t("organization.type.unit", { defaultValue: "واحد" })}
                    </Option>
                    <Option data-value="committee" selected={form.type === "committee"}>
                        {t("organization.type.committee", { defaultValue: "کمیته" })}
                    </Option>
                    <Option data-value="group" selected={form.type === "group"}>
                        {t("organization.type.group", { defaultValue: "گروه" })}
                    </Option>
                    <Option data-value="department" selected={form.type === "department"}>
                        {t("organization.type.department", { defaultValue: "دپارتمان" })}
                    </Option>
                    <Option data-value="management" selected={form.type === "management"}>
                        {t("organization.type.management", { defaultValue: "مدیریت" })}
                    </Option>
                    <Option data-value="branch" selected={form.type === "branch"}>
                        {t("organization.type.branch", { defaultValue: "شعبه" })}
                    </Option>
                    <Option data-value="other" selected={form.type === "other"}>
                        {t("organization.type.other", { defaultValue: "سایر" })}
                    </Option>
                </Select>
            </FormField>

            <FormField
                label={t("organization.fields.status", { defaultValue: "وضعیت" })}
            >
                <Select
                    disabled={readOnly || busy}
                    onChange={(event) => {
                        const nextValue = readSelectedDataValue(event, form.status);
                        handleChange("status", nextValue as OrganizationStatus);
                    }}
                >
                    <Option data-value="active" selected={form.status === "active"}>
                        {t("common.active", { defaultValue: "فعال" })}
                    </Option>
                    <Option data-value="inactive" selected={form.status === "inactive"}>
                        {t("common.inactive", { defaultValue: "غیرفعال" })}
                    </Option>
                </Select>
            </FormField>

            <FormField
                label={t("organization.fields.parent", { defaultValue: "والد سازمان" })}
                fullWidth
            >
                <div style={PARENT_PICKER_STYLE}>
                    <Input value={selectedParentTitle} readonly />

                    <Button
                        design="Emphasized"
                        disabled={readOnly || busy}
                        onClick={() => setParentDialogOpen(true)}
                    >
                        {t("common.select", { defaultValue: "انتخاب" })}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={readOnly || busy || !form.parentId}
                        onClick={() => handleChange("parentId", null)}
                    >
                        {t("common.clear", { defaultValue: "پاک کردن" })}
                    </Button>
                </div>
            </FormField>

            <FormField
                label={t("organization.fields.validFrom", { defaultValue: "اعتبار از" })}
            >
                <DatePicker
                    value={form.validFrom}
                    valueFormat={DATE_VALUE_FORMAT}
                    displayFormat={DATE_DISPLAY_FORMAT}
                    primaryCalendarType="Persian"
                    placeholder={t("organization.fields.datePlaceholder", {
                        defaultValue: "سال/ماه/روز",
                    })}
                    disabled={readOnly || busy}
                    onChange={(event) =>
                        handleChange("validFrom", readDatePickerValue(event))
                    }
                />
            </FormField>

            <FormField
                label={t("organization.fields.validTo", { defaultValue: "اعتبار تا" })}
            >
                <DatePicker
                    value={form.validTo}
                    valueFormat={DATE_VALUE_FORMAT}
                    displayFormat={DATE_DISPLAY_FORMAT}
                    primaryCalendarType="Persian"
                    placeholder={t("organization.fields.datePlaceholder", {
                        defaultValue: "سال/ماه/روز",
                    })}
                    disabled={readOnly || busy}
                    onChange={(event) =>
                        handleChange("validTo", readDatePickerValue(event))
                    }
                />
            </FormField>

            <FormField
                label={t("organization.fields.location", { defaultValue: "موقعیت جغرافیایی" })}
            >
                <Input
                    value={form.location}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("location", readInputValue(event))}
                />
            </FormField>

            <FormField
                label={t("organization.fields.description", { defaultValue: "شرح" })}
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
    );

    const renderSubProcessesTab = () => {
        const canSelectSubProcess =
            !readOnly &&
            !busy &&
            !subProcessesBusy &&
            Boolean(value?.id) &&
            Boolean(onAssignSubProcess) &&
            unassignedSubProcesses.length > 0;
        const canAssign = canSelectSubProcess && Boolean(selectedAssignableSubProcess);

        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">
                    {t("organization.tabs.subProcesses.title", {
                        defaultValue: "زیر فرآیندهای مرتبط با سازمان",
                    })}
                </Title>

                <div style={TABLE_HINT_STYLE}>
                    {value?.id
                        ? t("organization.tabs.subProcesses.hint", {
                              defaultValue:
                                  "زیر فرآیندها از فیچر فرآیند خوانده می شوند و رابطه آن ها با سازمان جداگانه ذخیره می شود.",
                          })
                        : t("organization.tabs.subProcesses.saveFirstHint", {
                              defaultValue:
                                  "برای تخصیص زیر فرآیند، ابتدا سازمان را ذخیره کنید.",
                          })}
                </div>

                {!readOnly ? (
                    <div style={SUB_PROCESS_PICKER_STYLE}>
                        <ComboBox
                            style={SUB_PROCESS_COMBOBOX_STYLE}
                            filter="Contains"
                            showClearIcon
                            value={subProcessComboBoxValue}
                            placeholder={t("organization.subProcesses.selectPlaceholder", {
                                defaultValue: "انتخاب زیر فرآیند",
                            })}
                            disabled={!canSelectSubProcess}
                            onInput={(event) => {
                                const nextValue = readInputValue(event);
                                setSelectedSubProcessSearchValue(nextValue);

                                const matchedOption = unassignedSubProcesses.find(
                                    (subProcess) =>
                                        formatSubProcessOption(subProcess) === nextValue,
                                );
                                setSelectedSubProcessId(matchedOption?.processNodeId ?? "");
                            }}
                            onSelectionChange={(event) => {
                                const nextValue = readSelectedComboBoxDataValue(
                                    event,
                                    selectedAssignableSubProcess,
                                );
                                const selectedOption = unassignedSubProcesses.find(
                                    (subProcess) => subProcess.processNodeId === nextValue,
                                );

                                setSelectedSubProcessId(nextValue);
                                setSelectedSubProcessSearchValue(
                                    selectedOption ? formatSubProcessOption(selectedOption) : "",
                                );
                            }}
                        >
                            {unassignedSubProcesses.map((subProcess) => (
                                <ComboBoxItem
                                    key={subProcess.processNodeId}
                                    data-value={subProcess.processNodeId}
                                    text={formatSubProcessOption(subProcess)}
                                    additionalText={subProcess.parentProcessTitle}
                                />
                            ))}
                        </ComboBox>

                        <Button
                            style={SUB_PROCESS_ADD_BUTTON_STYLE}
                            design="Emphasized"
                            disabled={!canAssign}
                            onClick={() => {
                                void handleAssignSubProcess();
                            }}
                        >
                            {t("organization.actions.add", { defaultValue: "اضافه نمودن" })}
                        </Button>
                    </div>
                ) : null}

                <Table
                    style={TABLE_STYLE}
                    noDataText={t("organization.subProcesses.noData", {
                        defaultValue: "برای این سازمان زیر فرآیندی تخصیص داده نشده است.",
                    })}
                    headerRow={
                        <TableHeaderRow>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.subProcess", {
                                    defaultValue: "زیر فرآیند",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.parentProcess", {
                                    defaultValue: "فرآیند والد",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.controlsCount", {
                                    defaultValue: "تعداد کنترل",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.assignmentAndStatus", {
                                    defaultValue: "رابطه / وضعیت",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.validity", {
                                    defaultValue: "اعتبار",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.actions", { defaultValue: "عملیات" })}
                            </TableHeaderCell>
                        </TableHeaderRow>
                    }
                >
                    {subProcesses.map((subProcess) => (
                        <TableRow key={subProcess.assignmentId}>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <strong>{subProcess.title}</strong>
                                    <span style={TABLE_SECONDARY_TEXT_STYLE}>
                                        {subProcess.code}
                                    </span>
                                    {subProcess.description ? (
                                        <span style={TABLE_SECONDARY_TEXT_STYLE}>
                                            {subProcess.description}
                                        </span>
                                    ) : null}
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                {formatOptionalValue(
                                    subProcess.parentProcessTitle
                                        ? `${subProcess.parentProcessCode ? `${subProcess.parentProcessCode} - ` : ""}${subProcess.parentProcessTitle}`
                                        : undefined,
                                )}
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                {subProcess.controlsCount}
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <span>
                                        {resolveAssignmentTypeLabel(subProcess.assignmentType, t)}
                                    </span>
                                    <span style={TABLE_INLINE_META_STYLE}>
                                        {subProcess.isActive
                                            ? t("common.active", { defaultValue: "فعال" })
                                            : t("common.inactive", {
                                                  defaultValue: "غیرفعال",
                                              })}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                {formatValidityRange(subProcess.validFrom, subProcess.validTo)}
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <Button
                                    design="Transparent"
                                    disabled={
                                        readOnly ||
                                        busy ||
                                        subProcessesBusy ||
                                        !onRemoveSubProcessAssignment
                                    }
                                    onClick={() => {
                                        void onRemoveSubProcessAssignment?.(
                                            subProcess.assignmentId,
                                        );
                                    }}
                                >
                                    {t("organization.actions.delete", { defaultValue: "حذف" })}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </Table>
            </div>
        );
    };

    const renderRisksTab = () => {
        const canSelectRisk =
            !readOnly &&
            !busy &&
            !relationshipsBusy &&
            Boolean(value?.id) &&
            Boolean(onAssignRisk) &&
            subProcesses.length > 0 &&
            availableRisks.length > 0;
        const canAssignRisk = canSelectRisk && Boolean(selectedRiskSubProcessId) && Boolean(selectedRiskId);

        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">
                    {t("organization.tabs.risks", { defaultValue: "ریسک ها" })}
                </Title>

                <div style={TABLE_HINT_STYLE}>
                    {value?.id
                        ? t("organization.tabs.risks.hint", {
                              defaultValue:
                                  "ریسک ها به زیرفرآیندهای تخصیص داده شده به سازمان وصل می شوند.",
                          })
                        : t("organization.tabs.risks.saveFirstHint", {
                              defaultValue: "برای تخصیص ریسک، ابتدا سازمان را ذخیره کنید.",
                          })}
                </div>

                {!readOnly ? (
                    <div style={SUB_PROCESS_PICKER_STYLE}>
                        <ComboBox
                            style={SUB_PROCESS_COMBOBOX_STYLE}
                            filter="Contains"
                            value={riskSubProcessComboBoxValue}
                            placeholder={t("organization.risks.selectSubProcess", {
                                defaultValue: "انتخاب زیر فرآیند",
                            })}
                            disabled={!canSelectRisk}
                            onSelectionChange={(event) => {
                                const nextValue = readSelectedComboBoxDataValue(
                                    event,
                                    selectedRiskSubProcessId,
                                );
                                setSelectedRiskSubProcessId(nextValue);
                                setSelectedRiskId("");
                                setSelectedRiskSearchValue("");
                            }}
                        >
                            {subProcesses.map((subProcess) => (
                                <ComboBoxItem
                                    key={subProcess.processNodeId}
                                    data-value={subProcess.processNodeId}
                                    text={formatAssignedSubProcessOption(subProcess)}
                                />
                            ))}
                        </ComboBox>

                        <ComboBox
                            style={SUB_PROCESS_COMBOBOX_STYLE}
                            filter="Contains"
                            showClearIcon
                            value={riskComboBoxValue}
                            placeholder={t("organization.risks.selectRisk", {
                                defaultValue: "انتخاب ریسک",
                            })}
                            disabled={!canSelectRisk || !selectedRiskSubProcessId}
                            onInput={(event) => {
                                const nextValue = readInputValue(event);
                                setSelectedRiskSearchValue(nextValue);

                                const matchedOption = assignableRisks.find(
                                    (risk) => formatRiskOption(risk) === nextValue,
                                );
                                setSelectedRiskId(matchedOption?.riskNodeId ?? "");
                            }}
                            onSelectionChange={(event) => {
                                const nextValue = readSelectedComboBoxDataValue(
                                    event,
                                    selectedRiskId,
                                );
                                const selectedOption = assignableRisks.find(
                                    (risk) => risk.riskNodeId === nextValue,
                                );

                                setSelectedRiskId(nextValue);
                                setSelectedRiskSearchValue(
                                    selectedOption ? formatRiskOption(selectedOption) : "",
                                );
                            }}
                        >
                            {assignableRisks.map((risk) => (
                                <ComboBoxItem
                                    key={risk.riskNodeId}
                                    data-value={risk.riskNodeId}
                                    text={formatRiskOption(risk)}
                                    additionalText={risk.riskType}
                                />
                            ))}
                        </ComboBox>

                        <Button
                            style={SUB_PROCESS_ADD_BUTTON_STYLE}
                            design="Emphasized"
                            disabled={!canAssignRisk}
                            onClick={() => {
                                void handleAssignRisk();
                            }}
                        >
                            {t("organization.actions.add", { defaultValue: "اضافه نمودن" })}
                        </Button>
                    </div>
                ) : null}

                <Table
                    style={TABLE_STYLE}
                    noDataText={t("organization.risks.noData", {
                        defaultValue: "برای این سازمان ریسکی تخصیص داده نشده است.",
                    })}
                    headerRow={
                        <TableHeaderRow>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.subProcessName", { defaultValue: "نام زیر فرآیند" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.riskName", { defaultValue: "نام ریسک" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.riskDescription", { defaultValue: "شرح ریسک" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.riskType", { defaultValue: "نوع ریسک" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.assignmentAndStatus", { defaultValue: "رابطه / وضعیت" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.actions", { defaultValue: "عملیات" })}
                            </TableHeaderCell>
                        </TableHeaderRow>
                    }
                >
                    {risks.map((risk) => (
                        <TableRow key={risk.id}>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <strong>{risk.subProcessTitle}</strong>
                                    <span style={TABLE_SECONDARY_TEXT_STYLE}>{risk.subProcessCode}</span>
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <strong>{risk.riskTitle}</strong>
                                    <span style={TABLE_SECONDARY_TEXT_STYLE}>{risk.riskCode}</span>
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                {risk.riskDescription || "-"}
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                {risk.riskType || "-"}
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <span>{resolveAssignmentTypeLabel(risk.assignmentType, t)}</span>
                                    <span style={TABLE_INLINE_META_STYLE}>
                                        {risk.isActive
                                            ? t("common.active", { defaultValue: "فعال" })
                                            : t("common.inactive", { defaultValue: "غیرفعال" })}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <Button
                                    design="Transparent"
                                    disabled={
                                        readOnly ||
                                        busy ||
                                        relationshipsBusy ||
                                        !onRemoveRiskAssignment
                                    }
                                    onClick={() => {
                                        void onRemoveRiskAssignment?.(risk.id);
                                    }}
                                >
                                    {t("organization.actions.delete", { defaultValue: "حذف" })}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </Table>
            </div>
        );
    };

    const renderReferenceAssignmentTab = ({
        referenceType,
        title,
        entityLabel,
        options,
        assignments,
        selectPlaceholder,
        noDataText,
        hint,
        saveFirstHint,
    }: {
        referenceType: OrganizationReferenceType;
        title: string;
        entityLabel: string;
        options: OrganizationReferenceOption[];
        assignments: OrganizationReferenceView[];
        selectPlaceholder: string;
        noDataText: string;
        hint: string;
        saveFirstHint: string;
    }) => {
        const assignedReferenceIds = new Set(
            assignments.map((assignment) => assignment.referenceId),
        );
        const unassignedOptions = options.filter(
            (option) => !assignedReferenceIds.has(option.referenceId),
        );
        const selectedReferenceId = selectedReferenceIds[referenceType];
        const selectedReferenceSearchValue = selectedReferenceSearchValues[referenceType];
        const selectedAssignableReference = unassignedOptions.some(
            (option) => option.referenceId === selectedReferenceId,
        )
            ? selectedReferenceId
            : "";
        const selectedReferenceOption = unassignedOptions.find(
            (option) => option.referenceId === selectedAssignableReference,
        );
        const comboBoxValue = selectedReferenceOption
            ? formatReferenceOption(selectedReferenceOption)
            : selectedReferenceSearchValue;
        const canSelect =
            !readOnly &&
            !busy &&
            !referencesBusy &&
            Boolean(value?.id) &&
            Boolean(onAssignReference) &&
            unassignedOptions.length > 0;
        const canAssign = canSelect && Boolean(selectedAssignableReference);

        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{title}</Title>

                <div style={TABLE_HINT_STYLE}>{value?.id ? hint : saveFirstHint}</div>

                {!readOnly ? (
                    <div style={SUB_PROCESS_PICKER_STYLE}>
                        <ComboBox
                            style={SUB_PROCESS_COMBOBOX_STYLE}
                            filter="Contains"
                            showClearIcon
                            value={comboBoxValue}
                            placeholder={selectPlaceholder}
                            disabled={!canSelect}
                            onInput={(event) => {
                                const nextValue = readInputValue(event);
                                const matchedOption = unassignedOptions.find(
                                    (option) => formatReferenceOption(option) === nextValue,
                                );
                                setReferenceSelection(
                                    referenceType,
                                    matchedOption?.referenceId ?? "",
                                    nextValue,
                                );
                            }}
                            onSelectionChange={(event) => {
                                const nextValue = readSelectedComboBoxDataValue(
                                    event,
                                    selectedAssignableReference,
                                );
                                const selectedOption = unassignedOptions.find(
                                    (option) => option.referenceId === nextValue,
                                );

                                setReferenceSelection(
                                    referenceType,
                                    nextValue,
                                    selectedOption ? formatReferenceOption(selectedOption) : "",
                                );
                            }}
                        >
                            {unassignedOptions.map((option) => (
                                <ComboBoxItem
                                    key={option.referenceId}
                                    data-value={option.referenceId}
                                    text={formatReferenceOption(option)}
                                    additionalText={option.parentTitle ?? option.typeLabel}
                                />
                            ))}
                        </ComboBox>

                        <Button
                            style={SUB_PROCESS_ADD_BUTTON_STYLE}
                            design="Emphasized"
                            disabled={!canAssign}
                            onClick={() => {
                                void handleAssignReference(referenceType, unassignedOptions);
                            }}
                        >
                            {t("organization.actions.add", { defaultValue: "اضافه نمودن" })}
                        </Button>
                    </div>
                ) : null}

                <Table
                    style={TABLE_STYLE}
                    noDataText={noDataText}
                    headerRow={
                        <TableHeaderRow>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {entityLabel}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.description", { defaultValue: "شرح" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.owner", { defaultValue: "مالک / نوع" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.assignmentAndStatus", {
                                    defaultValue: "رابطه / وضعیت",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.validity", { defaultValue: "اعتبار" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.actions", { defaultValue: "عملیات" })}
                            </TableHeaderCell>
                        </TableHeaderRow>
                    }
                >
                    {assignments.map((assignment) => (
                        <TableRow key={assignment.assignmentId}>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <strong>{assignment.title}</strong>
                                    <span style={TABLE_SECONDARY_TEXT_STYLE}>
                                        {assignment.code}
                                    </span>
                                    {assignment.parentTitle ? (
                                        <span style={TABLE_SECONDARY_TEXT_STYLE}>
                                            {assignment.parentCode
                                                ? `${assignment.parentCode} - ${assignment.parentTitle}`
                                                : assignment.parentTitle}
                                        </span>
                                    ) : null}
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                {assignment.description || "-"}
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <span>{assignment.ownerName || "-"}</span>
                                    <span style={TABLE_INLINE_META_STYLE}>
                                        {assignment.typeLabel || "-"}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <span>
                                        {resolveAssignmentTypeLabel(assignment.assignmentType, t)}
                                    </span>
                                    <span style={TABLE_INLINE_META_STYLE}>
                                        {assignment.isActive
                                            ? t("common.active", { defaultValue: "فعال" })
                                            : t("common.inactive", {
                                                  defaultValue: "غیرفعال",
                                              })}
                                        {assignment.status ? ` / ${assignment.status}` : ""}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                {formatValidityRange(assignment.validFrom, assignment.validTo)}
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <Button
                                    design="Transparent"
                                    disabled={
                                        readOnly ||
                                        busy ||
                                        referencesBusy ||
                                        !onRemoveReferenceAssignment
                                    }
                                    onClick={() => {
                                        void onRemoveReferenceAssignment?.(
                                            referenceType,
                                            assignment.assignmentId,
                                        );
                                    }}
                                >
                                    {t("organization.actions.delete", { defaultValue: "حذف" })}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </Table>
            </div>
        );
    };

    const renderControlsTab = () =>
        renderReferenceAssignmentTab({
            referenceType: "CONTROL",
            title: t("organization.tabs.controls", { defaultValue: "کنترل ها" }),
            entityLabel: t("organization.fields.controlName", { defaultValue: "نام کنترل" }),
            options: availableControlReferences,
            assignments: controlReferences,
            selectPlaceholder: t("organization.controls.selectPlaceholder", {
                defaultValue: "انتخاب کنترل",
            }),
            noDataText: t("organization.controls.noData", {
                defaultValue: "برای این سازمان کنترلی تخصیص داده نشده است.",
            }),
            hint: t("organization.tabs.controls.hint", {
                defaultValue: "کنترل ها از فیچر کنترل خوانده می شوند و رابطه آن ها با سازمان ذخیره می شود.",
            }),
            saveFirstHint: t("organization.tabs.controls.saveFirstHint", {
                defaultValue: "برای تخصیص کنترل، ابتدا سازمان را ذخیره کنید.",
            }),
        });

    const renderRulesTab = () =>
        renderReferenceAssignmentTab({
            referenceType: "REGULATION",
            title: t("organization.tabs.rules", { defaultValue: "قوانین" }),
            entityLabel: t("organization.fields.rule", { defaultValue: "قانون" }),
            options: availableRegulationReferences,
            assignments: regulationReferences,
            selectPlaceholder: t("organization.rules.selectPlaceholder", {
                defaultValue: "انتخاب قانون",
            }),
            noDataText: t("organization.rules.noData", {
                defaultValue: "برای این سازمان قانونی تخصیص داده نشده است.",
            }),
            hint: t("organization.tabs.rules.hint", {
                defaultValue: "قوانین از فیچر قوانین و مقررات خوانده می شوند و رابطه آن ها با سازمان ذخیره می شود.",
            }),
            saveFirstHint: t("organization.tabs.rules.saveFirstHint", {
                defaultValue: "برای تخصیص قانون، ابتدا سازمان را ذخیره کنید.",
            }),
        });

    const renderPoliciesTab = () =>
        renderReferenceAssignmentTab({
            referenceType: "POLICY",
            title: t("organization.tabs.policies", { defaultValue: "سیاست ها" }),
            entityLabel: t("organization.fields.policy", { defaultValue: "سیاست" }),
            options: availablePolicyReferences,
            assignments: policyReferences,
            selectPlaceholder: t("organization.policies.selectPlaceholder", {
                defaultValue: "انتخاب سیاست",
            }),
            noDataText: t("organization.policies.noData", {
                defaultValue: "برای این سازمان سیاستی تخصیص داده نشده است.",
            }),
            hint: t("organization.tabs.policies.hint", {
                defaultValue: "سیاست ها از فیچر سیاست ها خوانده می شوند و رابطه آن ها با سازمان ذخیره می شود.",
            }),
            saveFirstHint: t("organization.tabs.policies.saveFirstHint", {
                defaultValue: "برای تخصیص سیاست، ابتدا سازمان را ذخیره کنید.",
            }),
        });

    const renderGoalsTab = () =>
        renderReferenceAssignmentTab({
            referenceType: "OBJECTIVE",
            title: t("organization.tabs.goals", { defaultValue: "اهداف" }),
            entityLabel: t("organization.fields.goal", { defaultValue: "هدف" }),
            options: availableObjectiveReferences,
            assignments: objectiveReferences,
            selectPlaceholder: t("organization.goals.selectPlaceholder", {
                defaultValue: "انتخاب هدف",
            }),
            noDataText: t("organization.goals.noData", {
                defaultValue: "برای این سازمان هدفی تخصیص داده نشده است.",
            }),
            hint: t("organization.tabs.goals.hint", {
                defaultValue: "اهداف از فیچر اهداف کنترلی خوانده می شوند و رابطه آن ها با سازمان ذخیره می شود.",
            }),
            saveFirstHint: t("organization.tabs.goals.saveFirstHint", {
                defaultValue: "برای تخصیص هدف، ابتدا سازمان را ذخیره کنید.",
            }),
        });

    const renderTabContent = () => {
        if (activeTab === "general") {
            return renderGeneralTab();
        }

        if (activeTab === "subProcesses") {
            return renderSubProcessesTab();
        }

        if (activeTab === "risks") {
            return renderRisksTab();
        }

        if (activeTab === "controls") {
            return renderControlsTab();
        }

        if (activeTab === "rules") {
            return renderRulesTab();
        }

        if (activeTab === "policies") {
            return renderPoliciesTab();
        }

        if (activeTab === "goals") {
            return renderGoalsTab();
        }

        if (activeTab === "kpi") {
            return (
                <TablePlaceholder
                    title="KPI"
                    actions={tabActionButtons([
                        t("organization.actions.addRow", { defaultValue: "اضافه ردیف" }),
                        t("organization.actions.deleteRow", { defaultValue: "حذف ردیف" }),
                    ])}
                    columns={[
                        t("organization.fields.kpiName", { defaultValue: "نام شاخص" }),
                        t("organization.fields.validFrom", { defaultValue: "اعتبار از" }),
                        t("organization.fields.validTo", { defaultValue: "اعتبار تا" }),
                    ]}
                />
            );
        }

        if (activeTab === "kri") {
            return (
                <TablePlaceholder
                    title="KRI"
                    actions={tabActionButtons([
                        t("organization.actions.addRow", { defaultValue: "اضافه ردیف" }),
                        t("organization.actions.deleteRow", { defaultValue: "حذف ردیف" }),
                    ])}
                    columns={[
                        t("organization.fields.kriName", { defaultValue: "نام شاخص" }),
                        t("organization.fields.validFrom", { defaultValue: "اعتبار از" }),
                        t("organization.fields.validTo", { defaultValue: "اعتبار تا" }),
                    ]}
                />
            );
        }

        if (activeTab === "riskAppetite") {
            return (
                <TablePlaceholder
                    title={t("organization.tabs.riskAppetite", { defaultValue: "اشتهای ریسک" })}
                    actions={tabActionButtons([
                        t("organization.actions.add", { defaultValue: "اضافه" }),
                        t("organization.actions.delete", { defaultValue: "حذف" }),
                    ])}
                    columns={[
                        t("organization.fields.subProcessRisk", { defaultValue: "زیر فرآیندها/ ریسک" }),
                        t("organization.fields.goalType", { defaultValue: "نوع هدف" }),
                        t("organization.fields.description", { defaultValue: "شرح" }),
                        t("organization.fields.riskTemplate", { defaultValue: "الگوی ریسک" }),
                    ]}
                />
            );
        }

        if (activeTab === "owner") {
            return (
                <TablePlaceholder
                    title={t("organization.tabs.owner", { defaultValue: "مالک" })}
                    actions={tabActionButtons([
                        t("organization.actions.addRow", { defaultValue: "اضافه ردیف" }),
                        t("organization.actions.deleteRow", { defaultValue: "حذف ردیف" }),
                    ])}
                    columns={[
                        t("organization.fields.positionName", { defaultValue: "نام پست سازمانی" }),
                        t("organization.fields.userId", { defaultValue: "شناسه کاربر" }),
                        t("organization.fields.updatedAt", { defaultValue: "تاریخ بروز رسانی" }),
                        t("organization.fields.nextUpdate", { defaultValue: "تاریخ بروز رسانی بعدی" }),
                    ]}
                />
            );
        }

        if (activeTab === "documents") {
            return (
                <TablePlaceholder
                    title={t("organization.tabs.documents", { defaultValue: "مستندات" })}
                    actions={tabActionButtons([
                        t("organization.actions.addRow", { defaultValue: "اضافه ردیف" }),
                        t("organization.actions.deleteRow", { defaultValue: "حذف ردیف" }),
                    ])}
                    columns={[
                        t("organization.fields.code", { defaultValue: "کد" }),
                        t("organization.fields.documentName", { defaultValue: "نام مستند" }),
                        t("organization.fields.documentType", { defaultValue: "نوع مستند" }),
                        t("organization.fields.createYear", { defaultValue: "سال ایجاد" }),
                        t("organization.fields.createdBy", { defaultValue: "ایجاد کننده" }),
                        t("organization.fields.fileType", { defaultValue: "نوع فایل" }),
                    ]}
                />
            );
        }

        return (
            <TablePlaceholder
                title={t("organization.tabs.performance", { defaultValue: "ارزیابی عملکرد" })}
                actions={tabActionButtons([
                    t("organization.actions.addRow", { defaultValue: "اضافه ردیف" }),
                    t("organization.actions.deleteRow", { defaultValue: "حذف ردیف" }),
                ])}
                columns={[
                    t("organization.fields.kpiName", { defaultValue: "نام شاخص" }),
                    t("organization.fields.validFrom", { defaultValue: "اعتبار از" }),
                    t("organization.fields.validTo", { defaultValue: "اعتبار تا" }),
                ]}
            />
        );
    };

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {t("organization.object.modalTitle", { defaultValue: "سازمان" })}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("organization.fields.name", { defaultValue: "نام سازمان" })}
                        value={headerName}
                    />
                    <HeaderItem
                        label={t("organization.fields.parent", { defaultValue: "والد سازمان" })}
                        value={headerParent}
                    />
                    <HeaderItem
                        label={t("organization.fields.identifier", { defaultValue: "شناسه" })}
                        value={value?.id}
                    />
                    <HeaderItem
                        label={t("organization.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                        value={formatPersianDate(value?.createdAt)}
                    />
                    <HeaderItem
                        label={t("organization.fields.status", { defaultValue: "وضعیت" })}
                        value={headerStatus}
                    />
                    <HeaderItem
                        label={t("organization.fields.location", { defaultValue: "موقعیت" })}
                        value={headerLocation}
                    />
                    <HeaderItem
                        label={t("organization.fields.type", { defaultValue: "نوع سازمان" })}
                        value={headerType}
                    />
                    <HeaderItem
                        label={t("organization.fields.documents", { defaultValue: "مستندات" })}
                        value="03"
                    />
                </div>
            </div>

            <OrganizationTabs activeTab={activeTab} onChange={handleActiveTabChange} />

            {error ? (
                <MessageStrip design="Negative" onClose={onErrorClose}>
                    {error}
                </MessageStrip>
            ) : null}

            {validationError ? (
                <MessageStrip
                    design="Negative"
                    onClose={() => setValidationError(null)}
                >
                    {validationError}
                </MessageStrip>
            ) : null}

            <div style={BODY_STYLE}>{renderTabContent()}</div>

            <div style={FOOTER_STYLE}>{renderFooterActions()}</div>

            <ParentValueHelpDialog
                open={parentDialogOpen}
                items={allItems}
                currentId={value?.id ?? null}
                selectedParentId={form.parentId}
                onClose={() => setParentDialogOpen(false)}
                onSelect={(parentId) => {
                    handleChange("parentId", parentId);
                    setParentDialogOpen(false);
                }}
            />
        </div>
    );
}
