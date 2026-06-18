import {
    useCallback,
    useMemo,
    useRef,
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
import {
    DocumentAttachmentsManager,
    type DocumentBeforeParentSubmitHandler,
} from "@/features/document";
import type { OrganizationNode } from "@/features/organization";

export type ObjectiveObjectMode = "create" | "edit" | "view";

type ObjectiveTabKey = "general" | "relatedOrganizations" | "documents";

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
    organizationIds: string[];
    effectiveFrom: string;
    validUntil: string;
}

export interface ObjectiveObjectPageProps {
    mode: ObjectiveObjectMode;
    allItems: ObjectiveNode[];
    value: ObjectiveNode | null;
    parent?: ObjectiveNode | null;
    requestedNodeType?: ObjectiveNodeType;
    availableOrganizations?: OrganizationNode[];
    organizationsBusy?: boolean;
    busy?: boolean;
    error?: string | null;
    documentTempSessionId?: string;
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

const TABLE_PANEL_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
    minHeight: "15rem",
    background: "var(--sapGroup_ContentBackground)",
    border: "1px solid var(--sapList_BorderColor)",
    padding: "1rem",
    fontFamily: "var(--sapFontFamily)",
};

const TABLE_STYLE: CSSProperties = {
    width: "100%",
    background: "var(--sapList_Background)",
    minHeight: "11rem",
    fontFamily: "var(--sapFontFamily)",
};

const TABLE_HINT_STYLE: CSSProperties = {
    fontSize: "0.875rem",
    color: "var(--sapContent_LabelColor)",
};

const TABLE_TEXT_CELL_STYLE: CSSProperties = {
    fontFamily: "var(--sapFontFamily)",
    fontFeatureSettings: '"ss01"',
};

const RELATED_ORGANIZATION_PICKER_STYLE: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "flex-start",
    gap: "0.5rem",
    alignItems: "center",
    width: "100%",
};

const RELATED_ORGANIZATION_COMBOBOX_STYLE: CSSProperties = {
    flex: "0 1 28rem",
    width: "min(100%, 28rem)",
    maxWidth: "28rem",
};

const RELATED_ORGANIZATION_ADD_BUTTON_STYLE: CSSProperties = {
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
    color: "var(--sapContent_LabelColor)",
    fontSize: "0.8125rem",
};

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
        organizationIds: value?.organizations?.map((organization) => organization.organizationId) ?? [],
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
    status: ObjectiveStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function resolveObjectiveTypeLabel(
    objectiveType: ObjectiveType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ObjectiveType, string> = {
        operational: t("objective.type.operational", { defaultValue: "اهداف عملیاتی" }),
        compliance: t("objective.type.compliance", { defaultValue: "اهداف رعایتی" }),
        strategic: t("objective.type.strategic", { defaultValue: "اهداف استراتژیک" }),
        financial: t("objective.type.financial", { defaultValue: "اهداف مالی" }),
        reporting: t("objective.type.reporting", { defaultValue: "اهداف گزارشگری" }),
        market: t("objective.type.market", { defaultValue: "اهداف بازار" }),
    };

    return map[objectiveType];
}

function formatOrganizationOption(organization: OrganizationNode): string {
    return `${organization.code} - ${organization.name}`;
}

function defaultTabs(): ObjectiveTabKey[] {
    return ["general", "relatedOrganizations", "documents"];
}

function resolveTabLabel(tab: ObjectiveTabKey, t: ReturnType<typeof useTranslation>["t"]): string {
    const labels: Record<ObjectiveTabKey, string> = {
        general: t("objective.tabs.general", { defaultValue: "اطلاعات کلی" }),
        relatedOrganizations: t("objective.tabs.relatedOrganizations"),
        documents: t("objective.tabs.documents", { defaultValue: "مستندات" }),
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
    availableOrganizations = [],
    organizationsBusy = false,
    busy = false,
    error,
    documentTempSessionId,
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
    const [hasPendingDocumentUploads, setHasPendingDocumentUploads] = useState(false);
    const documentBeforeSubmitRef = useRef<DocumentBeforeParentSubmitHandler | null>(null);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
    const [selectedOrganizationSearchValue, setSelectedOrganizationSearchValue] =
        useState("");

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? parent ?? null
        : null;
    const existingOrganizationsById = useMemo(
        () =>
            new Map(
                (value?.organizations ?? []).map((organization) => [
                    organization.organizationId,
                    organization,
                ]),
            ),
        [value?.organizations],
    );
    const availableOrganizationsById = useMemo(
        () =>
            new Map(
                availableOrganizations.map((organization) => [
                    organization.id,
                    organization,
                ]),
            ),
        [availableOrganizations],
    );
    const selectedOrganizationIds = useMemo(
        () => new Set(form.organizationIds),
        [form.organizationIds],
    );
    const selectedOrganizations = useMemo(
        () =>
            form.organizationIds.map((organizationId) => {
                const organization = availableOrganizationsById.get(organizationId);
                const existingOrganization = existingOrganizationsById.get(organizationId);

                return {
                    organizationId,
                    code:
                        organization?.code ??
                        existingOrganization?.organizationCode ??
                        "",
                    name:
                        organization?.name ??
                        existingOrganization?.organizationName ??
                        "",
                    status:
                        organization?.status ??
                        existingOrganization?.organizationStatus,
                };
            }),
        [availableOrganizationsById, existingOrganizationsById, form.organizationIds],
    );
    const unassignedOrganizations = useMemo(
        () =>
            availableOrganizations.filter(
                (organization) => !selectedOrganizationIds.has(organization.id),
            ),
        [availableOrganizations, selectedOrganizationIds],
    );
    const selectedAssignableOrganization = unassignedOrganizations.some(
        (organization) => organization.id === selectedOrganizationId,
    )
        ? selectedOrganizationId
        : "";
    const organizationComboBoxValue =
        selectedOrganizationSearchValue ||
        (selectedAssignableOrganization
            ? formatOrganizationOption(
                  availableOrganizationsById.get(selectedAssignableOrganization)!,
              )
            : "");

    const headerTitle = form.title || value?.title || "";
    const headerParent = selectedParent
        ? `${selectedParent.code} - ${selectedParent.title}`
        : t("common.none", { defaultValue: "ندارد" });
    const headerStatus = resolveStatusLabel(form.status, t);
    const headerType = resolveObjectiveTypeLabel(form.objectiveType, t);
    const currentObjectiveId = value?.id ?? null;

    const handleChange = <K extends keyof ObjectiveFormState>(
        key: K,
        nextValue: ObjectiveFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const handleAssignOrganization = useCallback(() => {
        if (!selectedAssignableOrganization) {
            return;
        }

        setForm((prev) => {
            if (prev.organizationIds.includes(selectedAssignableOrganization)) {
                return prev;
            }

            return {
                ...prev,
                organizationIds: [
                    ...prev.organizationIds,
                    selectedAssignableOrganization,
                ],
            };
        });
        setSelectedOrganizationId("");
        setSelectedOrganizationSearchValue("");
    }, [selectedAssignableOrganization]);

    const handleRemoveOrganization = useCallback((organizationId: string) => {
        setForm((prev) => ({
            ...prev,
            organizationIds: prev.organizationIds.filter((id) => id !== organizationId),
        }));
        setSelectedOrganizationId((prev) => (prev === organizationId ? "" : prev));
        setSelectedOrganizationSearchValue("");
    }, []);

    const validate = (): boolean => {
        if (!form.code.trim()) {
            setValidationError(
                t("objective.validation.codeRequired", { defaultValue: "کد الزامی است" }),
            );
            return false;
        }

        if (!form.title.trim()) {
            setValidationError(
                t("objective.validation.titleRequired", { defaultValue: "نام الزامی است" }),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseSortOrder(form.sortOrder) === undefined) {
            setValidationError(
                t("objective.validation.sortOrderInvalid", {
                    defaultValue: "ترتیب نمایش باید عدد صحیح نامنفی باشد",
                }),
            );
            return false;
        }

        setValidationError(null);
        return true;
    };

    const handleDocumentBeforeParentSubmitChange = useCallback(
        (handler: DocumentBeforeParentSubmitHandler | null) => {
            documentBeforeSubmitRef.current = handler;
        },
        [],
    );

    const handleSubmit = async () => {
        if (readOnly || !validate()) {
            return;
        }

        if (hasPendingDocumentUploads) {
            setValidationError(
                t("document.validation.waitForUpload", {
                    defaultValue: "تا پایان بارگذاری فایل‌ها صبر کنید.",
                }),
            );
            setActiveTab("documents");
            return;
        }

        const documentsReady = await documentBeforeSubmitRef.current?.();
        if (documentsReady === false) {
            setActiveTab("documents");
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
            organizationIds: form.organizationIds,
            effectiveFrom: normalizeOptionalText(form.effectiveFrom),
            validUntil: normalizeOptionalText(form.validUntil),
        };

        await onSubmit(payload);
    };

    const renderGeneralTab = () => (
        <>
            <div style={FORM_GRID_STYLE}>
                <FormField label={t("objective.fields.code", { defaultValue: "شناسه" })} required>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("objective.fields.name", { defaultValue: "نام" })} required>
                    <Input
                        value={form.title}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("title", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("objective.fields.parent", { defaultValue: "هدف والد" })}>
                    <Input value={headerParent} readonly />
                </FormField>

                <FormField
                    label={t("objective.fields.objectiveType", {
                        defaultValue: "نوع هدف",
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
                            {t("objective.type.operational", { defaultValue: "اهداف عملیاتی" })}
                        </Option>
                        <Option
                            data-value="compliance"
                            selected={form.objectiveType === "compliance"}
                        >
                            {t("objective.type.compliance", { defaultValue: "اهداف رعایتی" })}
                        </Option>
                        <Option
                            data-value="strategic"
                            selected={form.objectiveType === "strategic"}
                        >
                            {t("objective.type.strategic", { defaultValue: "اهداف استراتژیک" })}
                        </Option>
                        <Option
                            data-value="financial"
                            selected={form.objectiveType === "financial"}
                        >
                            {t("objective.type.financial", { defaultValue: "اهداف مالی" })}
                        </Option>
                        <Option
                            data-value="reporting"
                            selected={form.objectiveType === "reporting"}
                        >
                            {t("objective.type.reporting", { defaultValue: "اهداف گزارشگری" })}
                        </Option>
                        <Option data-value="market" selected={form.objectiveType === "market"}>
                            {t("objective.type.market", { defaultValue: "اهداف بازار" })}
                        </Option>
                    </Select>
                </FormField>

                <FormField
                    label={t("objective.fields.objectiveClass", { defaultValue: "طبقه هدف" })}
                >
                    <Input
                        value={form.objectiveClass}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("objectiveClass", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("objective.fields.status", { defaultValue: "وضعیت" })}>
                    <Select
                        disabled={readOnly || busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.status);
                            handleChange("status", nextValue as ObjectiveStatus);
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
                    label={t("objective.fields.effectiveFrom", { defaultValue: "تاریخ ایجاد" })}
                >
                    <DatePicker
                        value={form.effectiveFrom}
                        valueFormat={DATE_VALUE_FORMAT}
                        displayFormat={DATE_DISPLAY_FORMAT}
                        primaryCalendarType="Persian"
                        disabled={readOnly || busy}
                        placeholder={t("organization.fields.datePlaceholder", {
                            defaultValue: "سال/ماه/روز",
                        })}
                        onChange={(event) =>
                            handleChange("effectiveFrom", readDatePickerValue(event))
                        }
                    />
                </FormField>

                <FormField
                    label={t("objective.fields.validUntil", { defaultValue: "تاریخ اعتبار" })}
                >
                    <DatePicker
                        value={form.validUntil}
                        valueFormat={DATE_VALUE_FORMAT}
                        displayFormat={DATE_DISPLAY_FORMAT}
                        primaryCalendarType="Persian"
                        disabled={readOnly || busy}
                        placeholder={t("organization.fields.datePlaceholder", {
                            defaultValue: "سال/ماه/روز",
                        })}
                        onChange={(event) =>
                            handleChange("validUntil", readDatePickerValue(event))
                        }
                    />
                </FormField>

                <FormField
                    label={t("objective.fields.sortOrder", { defaultValue: "ترتیب نمایش" })}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("objective.fields.organizationUnit", { defaultValue: "واحد سازمانی" })}
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
                    label={t("objective.fields.strategy", { defaultValue: "استراتژی" })}
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
                    label={t("objective.fields.description", { defaultValue: "شرح" })}
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

    const renderRelatedOrganizationsTab = () => {
        const canSelectOrganization =
            !readOnly &&
            !busy &&
            !organizationsBusy &&
            unassignedOrganizations.length > 0;
        const canAssignOrganization =
            canSelectOrganization && Boolean(selectedAssignableOrganization);

        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">
                    {t("objective.relatedOrganizations.title")}
                </Title>

                <div style={TABLE_HINT_STYLE}>
                    {t("objective.relatedOrganizations.hint")}
                </div>

                {!readOnly ? (
                    <div style={RELATED_ORGANIZATION_PICKER_STYLE}>
                        <ComboBox
                            style={RELATED_ORGANIZATION_COMBOBOX_STYLE}
                            filter="Contains"
                            showClearIcon
                            value={organizationComboBoxValue}
                            placeholder={t(
                                "objective.relatedOrganizations.selectPlaceholder",
                            )}
                            disabled={!canSelectOrganization}
                            onInput={(event) => {
                                const nextValue = readInputValue(event);
                                setSelectedOrganizationSearchValue(nextValue);

                                const matchedOrganization = unassignedOrganizations.find(
                                    (organization) =>
                                        formatOrganizationOption(organization) === nextValue,
                                );
                                setSelectedOrganizationId(matchedOrganization?.id ?? "");
                            }}
                            onSelectionChange={(event) => {
                                const nextValue = readSelectedComboBoxDataValue(
                                    event,
                                    selectedAssignableOrganization,
                                );
                                const selectedOrganization = unassignedOrganizations.find(
                                    (organization) => organization.id === nextValue,
                                );

                                setSelectedOrganizationId(nextValue);
                                setSelectedOrganizationSearchValue(
                                    selectedOrganization
                                        ? formatOrganizationOption(selectedOrganization)
                                        : "",
                                );
                            }}
                        >
                            {unassignedOrganizations.map((organization) => (
                                <ComboBoxItem
                                    key={organization.id}
                                    data-value={organization.id}
                                    text={formatOrganizationOption(organization)}
                                    additionalText={resolveStatusLabel(organization.status, t)}
                                />
                            ))}
                        </ComboBox>

                        <Button
                            style={RELATED_ORGANIZATION_ADD_BUTTON_STYLE}
                            design="Emphasized"
                            disabled={!canAssignOrganization}
                            onClick={handleAssignOrganization}
                        >
                            {t("objective.relatedOrganizations.add")}
                        </Button>
                    </div>
                ) : null}

                <Table
                    style={TABLE_STYLE}
                    noDataText={t("objective.relatedOrganizations.empty")}
                    headerRow={
                        <TableHeaderRow>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("objective.relatedOrganizations.columns.organization")}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("objective.relatedOrganizations.columns.status")}
                            </TableHeaderCell>
                            <TableHeaderCell style={TABLE_TEXT_CELL_STYLE}>
                                {t("objective.relatedOrganizations.columns.actions")}
                            </TableHeaderCell>
                        </TableHeaderRow>
                    }
                >
                    {selectedOrganizations.map((organization) => (
                        <TableRow key={organization.organizationId}>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <div style={TABLE_CELL_CONTENT_STYLE}>
                                    <strong>{organization.name || "-"}</strong>
                                    <span style={TABLE_SECONDARY_TEXT_STYLE}>
                                        {organization.code || organization.organizationId}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                {organization.status ? (
                                    <span style={TABLE_INLINE_META_STYLE}>
                                        {resolveStatusLabel(organization.status, t)}
                                    </span>
                                ) : (
                                    "-"
                                )}
                            </TableCell>
                            <TableCell style={TABLE_TEXT_CELL_STYLE}>
                                <Button
                                    design="Transparent"
                                    disabled={readOnly || busy}
                                    onClick={() =>
                                        handleRemoveOrganization(organization.organizationId)
                                    }
                                >
                                    {t("objective.relatedOrganizations.remove")}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </Table>
            </div>
        );
    };

    const renderTabContent = (tab: ObjectiveTabKey) => {
        if (tab === "general") {
            return renderGeneralTab();
        }

        if (tab === "relatedOrganizations") {
            return renderRelatedOrganizationsTab();
        }

        return (
            <DocumentAttachmentsManager
                key={currentObjectiveId ?? "unsaved-objective-documents"}
                title={t("objective.tabs.documents", { defaultValue: "مستندات" })}
                targetType="OBJECTIVE_NODE"
                targetId={currentObjectiveId}
                tempSessionId={documentTempSessionId}
                stagingMode="tempUntilParentSave"
                busy={busy}
                readOnly={readOnly}
                saveFirstMessage={t("objective.documents.saveFirst", {
                    defaultValue:
                        "ابتدا هدف را ذخیره کنید، سپس مستندات را بارگذاری کنید.",
                })}
                onBeforeParentSubmitChange={handleDocumentBeforeParentSubmitChange}
                onPendingUploadsChange={setHasPendingDocumentUploads}
            />
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
                    {t("common.edit", { defaultValue: "ویرایش" })}
                </Button>
            ) : (
                <Button
                    design="Emphasized"
                    disabled={busy}
                    style={ACTION_BUTTON_STYLE}
                    onClick={handleSubmit}
                >
                    {t("common.save", { defaultValue: "ذخیره" })}
                </Button>
            )}

            <Button
                design="Transparent"
                disabled={busy}
                style={ACTION_BUTTON_STYLE}
                onClick={onCancel}
            >
                {mode === "view"
                    ? t("common.close", { defaultValue: "بستن" })
                    : t("common.cancel", { defaultValue: "انصراف" })}
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
                            ? t("objective.object.createModalTitle", { defaultValue: "ایجاد هدف" })
                            : headerTitle ||
                              t("objective.object.modalTitle", {
                                  defaultValue: "مرکز اهداف",
                              })}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("objective.fields.parentObjective", {
                            defaultValue: "هدف والد",
                        })}
                        value={headerParent}
                    />
                    <HeaderItem
                        label={t("objective.fields.identifier", { defaultValue: "شناسه" })}
                        value={form.code || value?.id}
                    />
                    <HeaderItem
                        label={t("objective.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                        value={formatPersianDate(value?.createdAt ?? form.effectiveFrom)}
                    />
                    <HeaderItem
                        label={t("objective.fields.validUntil", { defaultValue: "تاریخ اعتبار" })}
                        value={formatPersianDate(form.validUntil)}
                    />
                    <HeaderItem
                        label={t("objective.fields.objectiveType", {
                            defaultValue: "نوع هدف",
                        })}
                        value={headerType}
                    />
                    <HeaderItem
                        label={t("objective.fields.status", { defaultValue: "وضعیت" })}
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
