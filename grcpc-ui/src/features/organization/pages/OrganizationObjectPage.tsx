import {
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
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
    TabSeparator,
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import { DetailTabContainer } from "@/shared/components/DetailTabContainer";

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
import type {
    OrganizationObjectiveOption,
    OrganizationObjectiveView,
} from "../domain/organization-objective-assignment.model";
import { DocumentManager } from "@/features/document";
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
    objectiveAssignments?: OrganizationObjectiveView[];
    availableObjectives?: OrganizationObjectiveOption[];
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
    onAssignObjective?: (objectiveNodeId: string) => Promise<void> | void;
    onRemoveObjectiveAssignment?: (assignmentId: string) => Promise<void> | void;
    onActiveTabChange?: (tab: OrganizationTabKey) => void;
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
    minWidth: 0,
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
        holding: t("organization.type.holding", { defaultValue: "Ù‡Ù„Ø¯ÛŒÙ†Ú¯" }),
        company: t("organization.type.company", { defaultValue: "Ø´Ø±Ú©Øª" }),
        deputy: t("organization.type.deputy", { defaultValue: "Ù…Ø¹Ø§ÙˆÙ†Øª" }),
        office: t("organization.type.office", { defaultValue: "Ø§Ø¯Ø§Ø±Ù‡" }),
        unit: t("organization.type.unit", { defaultValue: "ÙˆØ§Ø­Ø¯" }),
        committee: t("organization.type.committee", { defaultValue: "Ú©Ù…ÛŒØªÙ‡" }),
        group: t("organization.type.group", { defaultValue: "Ú¯Ø±ÙˆÙ‡" }),
        department: t("organization.type.department", { defaultValue: "Ø¯Ù¾Ø§Ø±ØªÙ…Ø§Ù†" }),
        management: t("organization.type.management", { defaultValue: "Ù…Ø¯ÛŒØ±ÛŒØª" }),
        branch: t("organization.type.branch", { defaultValue: "Ø´Ø¹Ø¨Ù‡" }),
        other: t("organization.type.other", { defaultValue: "Ø³Ø§ÛŒØ±" }),
    };

    return map[type] ?? type;
}

function resolveStatusLabel(
    status: OrganizationStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (status === "inactive") {
        return t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" });
    }

    return t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" });
}

function resolveAssignmentTypeLabel(
    assignmentType: OrganizationProcessAssignmentType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<OrganizationProcessAssignmentType, string> = {
        scope: t("organization.assignmentType.scope", { defaultValue: "Ù…Ø­Ø¯ÙˆØ¯Ù‡" }),
        owner: t("organization.assignmentType.owner", { defaultValue: "Ù…Ø§Ù„Ú©" }),
        participant: t("organization.assignmentType.participant", {
            defaultValue: "Ù…Ø´Ø§Ø±Ú©Øª Ú©Ù†Ù†Ø¯Ù‡",
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

function formatObjectiveOption(option: OrganizationObjectiveOption): string {
    return `${option.code} - ${option.title}`;
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
        general: t("organization.tabs.general", { defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ" }),
        subProcesses: t("organization.tabs.subProcesses", { defaultValue: "Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯" }),
        risks: t("organization.tabs.risks", { defaultValue: "Ø±ÛŒØ³Ú© Ù‡Ø§" }),
        controls: t("organization.tabs.controls", { defaultValue: "Ú©Ù†ØªØ±Ù„ Ù‡Ø§" }),
        rules: t("organization.tabs.rules", { defaultValue: "Ù‚ÙˆØ§Ù†ÛŒÙ†" }),
        policies: t("organization.tabs.policies", { defaultValue: "Ø³ÛŒØ§Ø³Øª Ù‡Ø§" }),
        goals: t("organization.tabs.goals.label", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù" }),
        kpi: "KPI",
        kri: "KRI",
        riskAppetite: t("organization.tabs.riskAppetite", { defaultValue: "Ø§Ø´ØªÙ‡Ø§ÛŒ Ø±ÛŒØ³Ú©" }),
        owner: t("organization.tabs.owner", { defaultValue: "Ù…Ø§Ù„Ú©" }),
        documents: t("organization.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" }),
        performance: t("organization.tabs.performance", { defaultValue: "Ø§Ø±Ø²ÛŒØ§Ø¨ÛŒ Ø¹Ù…Ù„Ú©Ø±Ø¯" }),
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
        <DetailTabContainer
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
        </DetailTabContainer>
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
    objectiveAssignments = [],
    availableObjectives = [],
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
    onAssignObjective,
    onRemoveObjectiveAssignment,
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
    const [selectedObjectiveId, setSelectedObjectiveId] = useState("");
    const [selectedObjectiveSearchValue, setSelectedObjectiveSearchValue] = useState("");
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
        : t("common.none", { defaultValue: "Ù†Ø¯Ø§Ø±Ø¯" });

    const headerName = form.name || value?.name || "";
    const headerParent = selectedParent
        ? selectedParent.name
        : t("common.none", { defaultValue: "Ù†Ø¯Ø§Ø±Ø¯" });
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
                    defaultValue: "Ú©Ø¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª",
                }),
            );
            return false;
        }

        if (!form.name.trim()) {
            setValidationError(
                t("organization.validation.nameRequired", {
                    defaultValue: "Ù†Ø§Ù… Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª",
                }),
            );
            return false;
        }

        if (form.location.length > 255) {
            setValidationError(
                t("organization.validation.locationMaxLength", {
                    defaultValue: "Ù…ÙˆÙ‚Ø¹ÛŒØª Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¨ÛŒØ´ØªØ± Ø§Ø² 255 Ú©Ø§Ø±Ø§Ú©ØªØ± Ø¨Ø§Ø´Ø¯",
                }),
            );
            return false;
        }

        if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
            setValidationError(
                t("organization.validation.validRange", {
                    defaultValue: "ØªØ§Ø±ÛŒØ® Ø´Ø±ÙˆØ¹ Ø¨Ø§ÛŒØ¯ Ù‚Ø¨Ù„ Ø§Ø² ØªØ§Ø±ÛŒØ® Ù¾Ø§ÛŒØ§Ù† Ø¨Ø§Ø´Ø¯",
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
                        {t("common.edit", { defaultValue: "ÙˆÛŒØ±Ø§ÛŒØ´" })}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={busy}
                        style={ACTION_BUTTON_STYLE}
                        onClick={onCancel}
                    >
                        {t("common.close", { defaultValue: "Ø¨Ø³ØªÙ†" })}
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
                    {t("common.save", { defaultValue: "Ø«Ø¨Øª" })}
                </Button>

                <Button
                    design="Transparent"
                    disabled={busy}
                    style={ACTION_BUTTON_STYLE}
                    onClick={onCancel}
                >
                    {t("common.cancel", { defaultValue: "Ø§Ù†ØµØ±Ø§Ù" })}
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

    const setObjectiveSelection = (
        objectiveNodeId: string,
        searchValue: string,
    ) => {
        setSelectedObjectiveId(objectiveNodeId);
        setSelectedObjectiveSearchValue(searchValue);
    };

    const handleAssignObjective = async (
        options: OrganizationObjectiveOption[],
    ) => {
        const typedMatch = options.find(
            (option) => formatObjectiveOption(option) === selectedObjectiveSearchValue,
        );
        const targetId = selectedObjectiveId || typedMatch?.objectiveNodeId;

        if (!targetId || !onAssignObjective || !value?.id) {
            return;
        }

        await onAssignObjective(targetId);
        setObjectiveSelection("", "");
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
                label={t("organization.fields.code", { defaultValue: "Ú©Ø¯" })}
                required
            >
                <Input
                    value={form.code}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("code", readInputValue(event))}
                />
            </FormField>

            <FormField
                label={t("organization.fields.name", { defaultValue: "Ù†Ø§Ù…" })}
                required
            >
                <Input
                    value={form.name}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("name", readInputValue(event))}
                />
            </FormField>

            <FormField
                label={t("organization.fields.type", { defaultValue: "Ù†ÙˆØ¹ Ø³Ø§Ø²Ù…Ø§Ù†" })}
            >
                <Select
                    disabled={readOnly || busy}
                    onChange={(event) => {
                        const nextValue = readSelectedDataValue(event, form.type);
                        handleChange("type", nextValue as OrganizationType);
                    }}
                >
                    <Option data-value="holding" selected={form.type === "holding"}>
                        {t("organization.type.holding", { defaultValue: "Ù‡Ù„Ø¯ÛŒÙ†Ú¯" })}
                    </Option>
                    <Option data-value="company" selected={form.type === "company"}>
                        {t("organization.type.company", { defaultValue: "Ø´Ø±Ú©Øª" })}
                    </Option>
                    <Option data-value="deputy" selected={form.type === "deputy"}>
                        {t("organization.type.deputy", { defaultValue: "Ù…Ø¹Ø§ÙˆÙ†Øª" })}
                    </Option>
                    <Option data-value="office" selected={form.type === "office"}>
                        {t("organization.type.office", { defaultValue: "Ø§Ø¯Ø§Ø±Ù‡" })}
                    </Option>
                    <Option data-value="unit" selected={form.type === "unit"}>
                        {t("organization.type.unit", { defaultValue: "ÙˆØ§Ø­Ø¯" })}
                    </Option>
                    <Option data-value="committee" selected={form.type === "committee"}>
                        {t("organization.type.committee", { defaultValue: "Ú©Ù…ÛŒØªÙ‡" })}
                    </Option>
                    <Option data-value="group" selected={form.type === "group"}>
                        {t("organization.type.group", { defaultValue: "Ú¯Ø±ÙˆÙ‡" })}
                    </Option>
                    <Option data-value="department" selected={form.type === "department"}>
                        {t("organization.type.department", { defaultValue: "Ø¯Ù¾Ø§Ø±ØªÙ…Ø§Ù†" })}
                    </Option>
                    <Option data-value="management" selected={form.type === "management"}>
                        {t("organization.type.management", { defaultValue: "Ù…Ø¯ÛŒØ±ÛŒØª" })}
                    </Option>
                    <Option data-value="branch" selected={form.type === "branch"}>
                        {t("organization.type.branch", { defaultValue: "Ø´Ø¹Ø¨Ù‡" })}
                    </Option>
                    <Option data-value="other" selected={form.type === "other"}>
                        {t("organization.type.other", { defaultValue: "Ø³Ø§ÛŒØ±" })}
                    </Option>
                </Select>
            </FormField>

            <FormField
                label={t("organization.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}
            >
                <Select
                    disabled={readOnly || busy}
                    onChange={(event) => {
                        const nextValue = readSelectedDataValue(event, form.status);
                        handleChange("status", nextValue as OrganizationStatus);
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
                label={t("organization.fields.parent", { defaultValue: "ÙˆØ§Ù„Ø¯ Ø³Ø§Ø²Ù…Ø§Ù†" })}
                fullWidth
            >
                <div style={PARENT_PICKER_STYLE}>
                    <Input value={selectedParentTitle} readonly />

                    <Button
                        design="Emphasized"
                        disabled={readOnly || busy}
                        onClick={() => setParentDialogOpen(true)}
                    >
                        {t("common.select", { defaultValue: "Ø§Ù†ØªØ®Ø§Ø¨" })}
                    </Button>

                    <Button
                        design="Transparent"
                        disabled={readOnly || busy || !form.parentId}
                        onClick={() => handleChange("parentId", null)}
                    >
                        {t("common.clear", { defaultValue: "Ù¾Ø§Ú© Ú©Ø±Ø¯Ù†" })}
                    </Button>
                </div>
            </FormField>

            <FormField
                label={t("organization.fields.validFrom", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± Ø§Ø²" })}
            >
                <DatePicker
                    value={form.validFrom}
                    valueFormat={DATE_VALUE_FORMAT}
                    displayFormat={DATE_DISPLAY_FORMAT}
                    primaryCalendarType="Persian"
                    placeholder={t("organization.fields.datePlaceholder", {
                        defaultValue: "Ø³Ø§Ù„/Ù…Ø§Ù‡/Ø±ÙˆØ²",
                    })}
                    disabled={readOnly || busy}
                    onChange={(event) =>
                        handleChange("validFrom", readDatePickerValue(event))
                    }
                />
            </FormField>

            <FormField
                label={t("organization.fields.validTo", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± ØªØ§" })}
            >
                <DatePicker
                    value={form.validTo}
                    valueFormat={DATE_VALUE_FORMAT}
                    displayFormat={DATE_DISPLAY_FORMAT}
                    primaryCalendarType="Persian"
                    placeholder={t("organization.fields.datePlaceholder", {
                        defaultValue: "Ø³Ø§Ù„/Ù…Ø§Ù‡/Ø±ÙˆØ²",
                    })}
                    disabled={readOnly || busy}
                    onChange={(event) =>
                        handleChange("validTo", readDatePickerValue(event))
                    }
                />
            </FormField>

            <FormField
                label={t("organization.fields.location", { defaultValue: "Ù…ÙˆÙ‚Ø¹ÛŒØª Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ" })}
            >
                <Input
                    value={form.location}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("location", readInputValue(event))}
                />
            </FormField>

            <FormField
                label={t("organization.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
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
                        defaultValue: "Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯Ù‡Ø§ÛŒ Ù…Ø±ØªØ¨Ø· Ø¨Ø§ Ø³Ø§Ø²Ù…Ø§Ù†",
                    })}
                </Title>

                <div style={TABLE_HINT_STYLE}>
                    {value?.id
                        ? t("organization.tabs.subProcesses.hint", {
                              defaultValue:
                                  "Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯Ù‡Ø§ Ø§Ø² ÙÛŒÚ†Ø± ÙØ±Ø¢ÛŒÙ†Ø¯ Ø®ÙˆØ§Ù†Ø¯Ù‡ Ù…ÛŒ Ø´ÙˆÙ†Ø¯ Ùˆ Ø±Ø§Ø¨Ø·Ù‡ Ø¢Ù† Ù‡Ø§ Ø¨Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ø°Ø®ÛŒØ±Ù‡ Ù…ÛŒ Ø´ÙˆØ¯.",
                          })
                        : t("organization.tabs.subProcesses.saveFirstHint", {
                              defaultValue:
                                  "Ø¨Ø±Ø§ÛŒ ØªØ®ØµÛŒØµ Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯ØŒ Ø§Ø¨ØªØ¯Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯.",
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
                                defaultValue: "Ø§Ù†ØªØ®Ø§Ø¨ Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯",
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
                            {t("organization.actions.add", { defaultValue: "Ø§Ø¶Ø§ÙÙ‡ Ù†Ù…ÙˆØ¯Ù†" })}
                        </Button>
                    </div>
                ) : null}

                <Table
                    style={TABLE_STYLE}
                    noDataText={t("organization.subProcesses.noData", {
                        defaultValue: "Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø³Ø§Ø²Ù…Ø§Ù† Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯ÛŒ ØªØ®ØµÛŒØµ Ø¯Ø§Ø¯Ù‡ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.",
                    })}
                    headerRow={
                        <TableHeaderRow>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.subProcess", {
                                    defaultValue: "Ø±Ø§Ø¨Ø·Ù‡ / ÙˆØ¶Ø¹ÛŒØª",
                                    })}
                                </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.parentProcess", {
                                    defaultValue: "ÙØ±Ø¢ÛŒÙ†Ø¯ ÙˆØ§Ù„Ø¯",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.controlsCount", {
                                    defaultValue: "ØªØ¹Ø¯Ø§Ø¯ Ú©Ù†ØªØ±Ù„",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.assignmentAndStatus", {
                                    defaultValue: "Ø±Ø§Ø¨Ø·Ù‡ / ÙˆØ¶Ø¹ÛŒØª",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.validity", {
                                    defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø±",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.actions", { defaultValue: "Ø¹Ù…Ù„ÛŒØ§Øª" })}
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
                                            ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
                                            : t("common.inactive", {
                                                  defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„",
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
                                    {t("organization.actions.delete", { defaultValue: "Ø­Ø°Ù" })}
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
                    {t("organization.tabs.risks", { defaultValue: "Ø±ÛŒØ³Ú© Ù‡Ø§" })}
                </Title>

                <div style={TABLE_HINT_STYLE}>
                    {value?.id
                        ? t("organization.tabs.risks.hint", {
                              defaultValue:
                                  "Ø±ÛŒØ³Ú© Ù‡Ø§ Ø¨Ù‡ Ø²ÛŒØ±ÙØ±Ø¢ÛŒÙ†Ø¯Ù‡Ø§ÛŒ ØªØ®ØµÛŒØµ Ø¯Ø§Ø¯Ù‡ Ø´Ø¯Ù‡ Ø¨Ù‡ Ø³Ø§Ø²Ù…Ø§Ù† ÙˆØµÙ„ Ù…ÛŒ Ø´ÙˆÙ†Ø¯.",
                          })
                        : t("organization.tabs.risks.saveFirstHint", {
                              defaultValue: "Ø¨Ø±Ø§ÛŒ ØªØ®ØµÛŒØµ Ø±ÛŒØ³Ú©ØŒ Ø§Ø¨ØªØ¯Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯.",
                          })}
                </div>

                {!readOnly ? (
                    <div style={SUB_PROCESS_PICKER_STYLE}>
                        <ComboBox
                            style={SUB_PROCESS_COMBOBOX_STYLE}
                            filter="Contains"
                            value={riskSubProcessComboBoxValue}
                            placeholder={t("organization.risks.selectSubProcess", {
                                defaultValue: "Ø§Ù†ØªØ®Ø§Ø¨ Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯",
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
                                defaultValue: "Ø§Ù†ØªØ®Ø§Ø¨ Ø±ÛŒØ³Ú©",
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
                            {t("organization.actions.add", { defaultValue: "Ø§Ø¶Ø§ÙÙ‡ Ù†Ù…ÙˆØ¯Ù†" })}
                        </Button>
                    </div>
                ) : null}

                <Table
                    style={TABLE_STYLE}
                    noDataText={t("organization.risks.noData", {
                        defaultValue: "Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø³Ø§Ø²Ù…Ø§Ù† Ø±ÛŒØ³Ú©ÛŒ ØªØ®ØµÛŒØµ Ø¯Ø§Ø¯Ù‡ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.",
                    })}
                    headerRow={
                        <TableHeaderRow>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.subProcessName", { defaultValue: "Ù†Ø§Ù… Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.riskName", { defaultValue: "Ù†Ø§Ù… Ø±ÛŒØ³Ú©" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.riskDescription", { defaultValue: "Ø´Ø±Ø­ Ø±ÛŒØ³Ú©" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.riskType", { defaultValue: "Ù†ÙˆØ¹ Ø±ÛŒØ³Ú©" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.assignmentAndStatus", { defaultValue: "Ø±Ø§Ø¨Ø·Ù‡ / ÙˆØ¶Ø¹ÛŒØª" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.actions", { defaultValue: "Ø¹Ù…Ù„ÛŒØ§Øª" })}
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
                                            ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
                                            : t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" })}
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
                                    {t("organization.actions.delete", { defaultValue: "Ø­Ø°Ù" })}
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
                            {t("organization.actions.add", { defaultValue: "Ø§Ø¶Ø§ÙÙ‡ Ù†Ù…ÙˆØ¯Ù†" })}
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
                                {t("organization.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.owner", { defaultValue: "Ù…Ø§Ù„Ú© / Ù†ÙˆØ¹" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.assignmentAndStatus", {
                                    defaultValue: "Ø±Ø§Ø¨Ø·Ù‡ / ÙˆØ¶Ø¹ÛŒØª",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.validity", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø±" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.actions", { defaultValue: "Ø¹Ù…Ù„ÛŒØ§Øª" })}
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
                                            ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
                                            : t("common.inactive", {
                                                  defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„",
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
                                    {t("organization.actions.delete", { defaultValue: "Ø­Ø°Ù" })}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </Table>
            </div>
        );
    };

    const renderObjectiveAssignmentTab = ({
        title,
        entityLabel,
        options,
        assignments,
        selectPlaceholder,
        noDataText,
        hint,
        saveFirstHint,
    }: {
        title: string;
        entityLabel: string;
        options: OrganizationObjectiveOption[];
        assignments: OrganizationObjectiveView[];
        selectPlaceholder: string;
        noDataText: string;
        hint: string;
        saveFirstHint: string;
    }) => {
        const assignedObjectiveIds = new Set(
            assignments.map((assignment) => assignment.objectiveNodeId),
        );
        const unassignedOptions = options.filter(
            (option) => !assignedObjectiveIds.has(option.objectiveNodeId),
        );
        const selectedAssignableObjective = unassignedOptions.some(
            (option) => option.objectiveNodeId === selectedObjectiveId,
        )
            ? selectedObjectiveId
            : "";
        const selectedObjectiveOption = unassignedOptions.find(
            (option) => option.objectiveNodeId === selectedAssignableObjective,
        );
        const comboBoxValue = selectedObjectiveOption
            ? formatObjectiveOption(selectedObjectiveOption)
            : selectedObjectiveSearchValue;
        const canSelect =
            !readOnly &&
            !busy &&
            !referencesBusy &&
            Boolean(value?.id) &&
            Boolean(onAssignObjective) &&
            unassignedOptions.length > 0;
        const canAssign = canSelect && Boolean(selectedAssignableObjective);

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
                                    (option) => formatObjectiveOption(option) === nextValue,
                                );
                                setObjectiveSelection(
                                    matchedOption?.objectiveNodeId ?? "",
                                    nextValue,
                                );
                            }}
                            onSelectionChange={(event) => {
                                const nextValue = readSelectedComboBoxDataValue(
                                    event,
                                    selectedAssignableObjective,
                                );
                                const selectedOption = unassignedOptions.find(
                                    (option) => option.objectiveNodeId === nextValue,
                                );

                                setObjectiveSelection(
                                    nextValue,
                                    selectedOption ? formatObjectiveOption(selectedOption) : "",
                                );
                            }}
                        >
                            {unassignedOptions.map((option) => (
                                <ComboBoxItem
                                    key={option.objectiveNodeId}
                                    data-value={option.objectiveNodeId}
                                    text={formatObjectiveOption(option)}
                                    additionalText={option.typeLabel ?? option.status}
                                />
                            ))}
                        </ComboBox>

                        <Button
                            style={SUB_PROCESS_ADD_BUTTON_STYLE}
                            design="Emphasized"
                            disabled={!canAssign}
                            onClick={() => {
                                void handleAssignObjective(unassignedOptions);
                            }}
                        >
                            {t("organization.actions.add", { defaultValue: "Ø§Ø¶Ø§ÙÙ‡ Ù†Ù…ÙˆØ¯Ù†" })}
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
                                {t("organization.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.owner", { defaultValue: "Ù…Ø§Ù„Ú© / Ù†ÙˆØ¹" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.assignmentAndStatus", {
                                    defaultValue: "Ø±Ø§Ø¨Ø·Ù‡ / ÙˆØ¶Ø¹ÛŒØª",
                                })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.validity", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø±" })}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("organization.fields.actions", { defaultValue: "Ø¹Ù…Ù„ÛŒØ§Øª" })}
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
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                {assignment.description || "-"}
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <span>{assignment.typeLabel || "-"}</span>
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <span style={TABLE_INLINE_META_STYLE}>
                                        {assignment.active
                                            ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
                                            : t("common.inactive", {
                                                  defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„",
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
                                        !onRemoveObjectiveAssignment
                                    }
                                    onClick={() => {
                                        void onRemoveObjectiveAssignment?.(
                                            assignment.assignmentId,
                                        );
                                    }}
                                >
                                    {t("organization.actions.delete", { defaultValue: "Ø­Ø°Ù" })}
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
            title: t("organization.tabs.controls", { defaultValue: "Ú©Ù†ØªØ±Ù„ Ù‡Ø§" }),
            entityLabel: t("organization.fields.controlName", { defaultValue: "Ù†Ø§Ù… Ú©Ù†ØªØ±Ù„" }),
            options: availableControlReferences,
            assignments: controlReferences,
            selectPlaceholder: t("organization.controls.selectPlaceholder", {
                defaultValue: "Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ØªØ±Ù„",
            }),
            noDataText: t("organization.controls.noData", {
                defaultValue: "Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø³Ø§Ø²Ù…Ø§Ù† Ú©Ù†ØªØ±Ù„ÛŒ ØªØ®ØµÛŒØµ Ø¯Ø§Ø¯Ù‡ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.",
            }),
            hint: t("organization.tabs.controls.hint", {
                defaultValue: "Ú©Ù†ØªØ±Ù„ Ù‡Ø§ Ø§Ø² ÙÛŒÚ†Ø± Ú©Ù†ØªØ±Ù„ Ø®ÙˆØ§Ù†Ø¯Ù‡ Ù…ÛŒ Ø´ÙˆÙ†Ø¯ Ùˆ Ø±Ø§Ø¨Ø·Ù‡ Ø¢Ù† Ù‡Ø§ Ø¨Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø°Ø®ÛŒØ±Ù‡ Ù…ÛŒ Ø´ÙˆØ¯.",
            }),
            saveFirstHint: t("organization.tabs.controls.saveFirstHint", {
                defaultValue: "Ø¨Ø±Ø§ÛŒ ØªØ®ØµÛŒØµ Ú©Ù†ØªØ±Ù„ØŒ Ø§Ø¨ØªØ¯Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯.",
            }),
        });

    const renderRulesTab = () =>
        renderReferenceAssignmentTab({
            referenceType: "REGULATION",
            title: t("organization.tabs.rules", { defaultValue: "Ù‚ÙˆØ§Ù†ÛŒÙ†" }),
            entityLabel: t("organization.fields.rule", { defaultValue: "Ù‚Ø§Ù†ÙˆÙ†" }),
            options: availableRegulationReferences,
            assignments: regulationReferences,
            selectPlaceholder: t("organization.rules.selectPlaceholder", {
                defaultValue: "Ø§Ù†ØªØ®Ø§Ø¨ Ù‚Ø§Ù†ÙˆÙ†",
            }),
            noDataText: t("organization.rules.noData", {
                defaultValue: "Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø³Ø§Ø²Ù…Ø§Ù† Ù‚Ø§Ù†ÙˆÙ†ÛŒ ØªØ®ØµÛŒØµ Ø¯Ø§Ø¯Ù‡ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.",
            }),
            hint: t("organization.tabs.rules.hint", {
                defaultValue: "Ù‚ÙˆØ§Ù†ÛŒÙ† Ø§Ø² ÙÛŒÚ†Ø± Ù‚ÙˆØ§Ù†ÛŒÙ† Ùˆ Ù…Ù‚Ø±Ø±Ø§Øª Ø®ÙˆØ§Ù†Ø¯Ù‡ Ù…ÛŒ Ø´ÙˆÙ†Ø¯ Ùˆ Ø±Ø§Ø¨Ø·Ù‡ Ø¢Ù† Ù‡Ø§ Ø¨Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø°Ø®ÛŒØ±Ù‡ Ù…ÛŒ Ø´ÙˆØ¯.",
            }),
            saveFirstHint: t("organization.tabs.rules.saveFirstHint", {
                defaultValue: "Ø¨Ø±Ø§ÛŒ ØªØ®ØµÛŒØµ Ù‚Ø§Ù†ÙˆÙ†ØŒ Ø§Ø¨ØªØ¯Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯.",
            }),
        });

    const renderPoliciesTab = () =>
        renderReferenceAssignmentTab({
            referenceType: "POLICY",
            title: t("organization.tabs.policies", { defaultValue: "Ø³ÛŒØ§Ø³Øª Ù‡Ø§" }),
            entityLabel: t("organization.fields.policy", { defaultValue: "Ø³ÛŒØ§Ø³Øª" }),
            options: availablePolicyReferences,
            assignments: policyReferences,
            selectPlaceholder: t("organization.policies.selectPlaceholder", {
                defaultValue: "Ø§Ù†ØªØ®Ø§Ø¨ Ø³ÛŒØ§Ø³Øª",
            }),
            noDataText: t("organization.policies.noData", {
                defaultValue: "Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø³Ø§Ø²Ù…Ø§Ù† Ø³ÛŒØ§Ø³ØªÛŒ ØªØ®ØµÛŒØµ Ø¯Ø§Ø¯Ù‡ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.",
            }),
            hint: t("organization.tabs.policies.hint", {
                defaultValue: "Ø³ÛŒØ§Ø³Øª Ù‡Ø§ Ø§Ø² ÙÛŒÚ†Ø± Ø³ÛŒØ§Ø³Øª Ù‡Ø§ Ø®ÙˆØ§Ù†Ø¯Ù‡ Ù…ÛŒ Ø´ÙˆÙ†Ø¯ Ùˆ Ø±Ø§Ø¨Ø·Ù‡ Ø¢Ù† Ù‡Ø§ Ø¨Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø°Ø®ÛŒØ±Ù‡ Ù…ÛŒ Ø´ÙˆØ¯.",
            }),
            saveFirstHint: t("organization.tabs.policies.saveFirstHint", {
                defaultValue: "Ø¨Ø±Ø§ÛŒ ØªØ®ØµÛŒØµ Ø³ÛŒØ§Ø³ØªØŒ Ø§Ø¨ØªØ¯Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯.",
            }),
        });

    const renderGoalsTab = () =>
        renderObjectiveAssignmentTab({
            title: t("organization.tabs.goals.title", { defaultValue: "Ø§Ù‡Ø¯Ø§Ù" }),
            entityLabel: t("organization.fields.goal", { defaultValue: "Ù‡Ø¯Ù" }),
            options: availableObjectives,
            assignments: objectiveAssignments,
            selectPlaceholder: t("organization.goals.selectPlaceholder", {
                defaultValue: "Ø§Ù†ØªØ®Ø§Ø¨ Ù‡Ø¯Ù",
            }),
            noDataText: t("organization.goals.noData", {
                defaultValue: "Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø³Ø§Ø²Ù…Ø§Ù† Ù‡Ø¯ÙÛŒ ØªØ®ØµÛŒØµ Ø¯Ø§Ø¯Ù‡ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.",
            }),
            hint: t("organization.tabs.goals.hint", {
                defaultValue: "Ø§Ù‡Ø¯Ø§Ù Ø§Ø² ÙÛŒÚ†Ø± Ø§Ù‡Ø¯Ø§Ù Ú©Ù†ØªØ±Ù„ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù‡ Ù…ÛŒ Ø´ÙˆÙ†Ø¯ Ùˆ Ø±Ø§Ø¨Ø·Ù‡ Ø¢Ù† Ù‡Ø§ Ø¨Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø°Ø®ÛŒØ±Ù‡ Ù…ÛŒ Ø´ÙˆØ¯.",
            }),
            saveFirstHint: t("organization.tabs.goals.saveFirstHint", {
                defaultValue: "Ø¨Ø±Ø§ÛŒ ØªØ®ØµÛŒØµ Ù‡Ø¯ÙØŒ Ø§Ø¨ØªØ¯Ø§ Ø³Ø§Ø²Ù…Ø§Ù† Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯.",
            }),
        });

    const renderDocumentsTab = () => (
        <DocumentManager
            title={t("organization.tabs.documents", { defaultValue: "مستندات" })}
            targetType="ORG"
            targetId={value?.id ?? null}
            busy={busy}
            readOnly={readOnly}
            viewHint={t("organization.documents.viewHint", {
                defaultValue: "مستندات ذخیره شده سازمان",
            })}
            editHint={t("organization.documents.editHint", {
                defaultValue: "فایل انتخابی ابتدا موقت بارگذاری و سپس برای این سازمان نهایی می‌شود.",
            })}
        />
    );
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
                        t("organization.actions.addRow", { defaultValue: "Ø§Ø¶Ø§ÙÙ‡ Ø±Ø¯ÛŒÙ" }),
                        t("organization.actions.deleteRow", { defaultValue: "Ø­Ø°Ù Ø±Ø¯ÛŒÙ" }),
                    ])}
                    columns={[
                        t("organization.fields.kpiName", { defaultValue: "Ù†Ø§Ù… Ø´Ø§Ø®Øµ" }),
                        t("organization.fields.validFrom", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± Ø§Ø²" }),
                        t("organization.fields.validTo", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± ØªØ§" }),
                    ]}
                />
            );
        }

        if (activeTab === "kri") {
            return (
                <TablePlaceholder
                    title="KRI"
                    actions={tabActionButtons([
                        t("organization.actions.addRow", { defaultValue: "Ø§Ø¶Ø§ÙÙ‡ Ø±Ø¯ÛŒÙ" }),
                        t("organization.actions.deleteRow", { defaultValue: "Ø­Ø°Ù Ø±Ø¯ÛŒÙ" }),
                    ])}
                    columns={[
                        t("organization.fields.kriName", { defaultValue: "Ù†Ø§Ù… Ø´Ø§Ø®Øµ" }),
                        t("organization.fields.validFrom", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± Ø§Ø²" }),
                        t("organization.fields.validTo", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± ØªØ§" }),
                    ]}
                />
            );
        }

        if (activeTab === "riskAppetite") {
            return (
                <TablePlaceholder
                    title={t("organization.tabs.riskAppetite", { defaultValue: "Ø§Ø´ØªÙ‡Ø§ÛŒ Ø±ÛŒØ³Ú©" })}
                    actions={tabActionButtons([
                        t("organization.actions.add", { defaultValue: "Ø§Ø¶Ø§ÙÙ‡" }),
                        t("organization.actions.delete", { defaultValue: "Ø­Ø°Ù" }),
                    ])}
                    columns={[
                        t("organization.fields.subProcessRisk", { defaultValue: "Ø²ÛŒØ± ÙØ±Ø¢ÛŒÙ†Ø¯Ù‡Ø§/ Ø±ÛŒØ³Ú©" }),
                        t("organization.fields.goalType", { defaultValue: "Ù†ÙˆØ¹ Ù‡Ø¯Ù" }),
                        t("organization.fields.description", { defaultValue: "Ø´Ø±Ø­" }),
                        t("organization.fields.riskTemplate", { defaultValue: "Ø§Ù„Ú¯ÙˆÛŒ Ø±ÛŒØ³Ú©" }),
                    ]}
                />
            );
        }

        if (activeTab === "owner") {
            return (
                <TablePlaceholder
                    title={t("organization.tabs.owner", { defaultValue: "Ù…Ø§Ù„Ú©" })}
                    actions={tabActionButtons([
                        t("organization.actions.addRow", { defaultValue: "Ø§Ø¶Ø§ÙÙ‡ Ø±Ø¯ÛŒÙ" }),
                        t("organization.actions.deleteRow", { defaultValue: "Ø­Ø°Ù Ø±Ø¯ÛŒÙ" }),
                    ])}
                    columns={[
                        t("organization.fields.positionName", { defaultValue: "Ù†Ø§Ù… Ù¾Ø³Øª Ø³Ø§Ø²Ù…Ø§Ù†ÛŒ" }),
                        t("organization.fields.userId", { defaultValue: "Ø´Ù†Ø§Ø³Ù‡ Ú©Ø§Ø±Ø¨Ø±" }),
                        t("organization.fields.updatedAt", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø¨Ø±ÙˆØ² Ø±Ø³Ø§Ù†ÛŒ" }),
                        t("organization.fields.nextUpdate", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø¨Ø±ÙˆØ² Ø±Ø³Ø§Ù†ÛŒ Ø¨Ø¹Ø¯ÛŒ" }),
                    ]}
                />
            );
        }

        if (activeTab === "documents") {
            return renderDocumentsTab();
        }

        return (
            <TablePlaceholder
                title={t("organization.tabs.performance", { defaultValue: "Ø§Ø±Ø²ÛŒØ§Ø¨ÛŒ Ø¹Ù…Ù„Ú©Ø±Ø¯" })}
                actions={tabActionButtons([
                    t("organization.actions.addRow", { defaultValue: "Ø§Ø¶Ø§ÙÙ‡ Ø±Ø¯ÛŒÙ" }),
                    t("organization.actions.deleteRow", { defaultValue: "Ø­Ø°Ù Ø±Ø¯ÛŒÙ" }),
                ])}
                columns={[
                    t("organization.fields.kpiName", { defaultValue: "Ù†Ø§Ù… Ø´Ø§Ø®Øµ" }),
                    t("organization.fields.validFrom", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± Ø§Ø²" }),
                    t("organization.fields.validTo", { defaultValue: "Ø§Ø¹ØªØ¨Ø§Ø± ØªØ§" }),
                ]}
            />
        );
    };

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {t("organization.object.modalTitle", { defaultValue: "Ø³Ø§Ø²Ù…Ø§Ù†" })}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("organization.fields.name", { defaultValue: "Ù†Ø§Ù… Ø³Ø§Ø²Ù…Ø§Ù†" })}
                        value={headerName}
                    />
                    <HeaderItem
                        label={t("organization.fields.parent", { defaultValue: "ÙˆØ§Ù„Ø¯ Ø³Ø§Ø²Ù…Ø§Ù†" })}
                        value={headerParent}
                    />
                    <HeaderItem
                        label={t("organization.fields.identifier", { defaultValue: "Ø´Ù†Ø§Ø³Ù‡" })}
                        value={value?.id}
                    />
                    <HeaderItem
                        label={t("organization.fields.createdAt", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" })}
                        value={formatPersianDate(value?.createdAt)}
                    />
                    <HeaderItem
                        label={t("organization.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}
                        value={headerStatus}
                    />
                    <HeaderItem
                        label={t("organization.fields.location", { defaultValue: "Ù…ÙˆÙ‚Ø¹ÛŒØª" })}
                        value={headerLocation}
                    />
                    <HeaderItem
                        label={t("organization.fields.type", { defaultValue: "Ù†ÙˆØ¹ Ø³Ø§Ø²Ù…Ø§Ù†" })}
                        value={headerType}
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
