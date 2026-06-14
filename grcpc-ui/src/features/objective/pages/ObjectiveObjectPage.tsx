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
    DatePicker,
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

export type ObjectiveObjectMode = "create" | "edit" | "view";

type ObjectiveTabKey = "general" | "organizationUnits" | "documents";

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
    documentTempSessionId?: string;
    onErrorClose?: () => void;
    onSubmit: (payload: ObjectiveNodeCreate | ObjectiveNodeUpdate) => Promise<void> | void;
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

function defaultTabs(): ObjectiveTabKey[] {
    return ["general", "organizationUnits", "documents"];
}

function resolveTabLabel(tab: ObjectiveTabKey, t: ReturnType<typeof useTranslation>["t"]): string {
    const labels: Record<ObjectiveTabKey, string> = {
        general: t("objective.tabs.general", { defaultValue: "اطلاعات کلی" }),
        organizationUnits: t("objective.tabs.organizationUnits", { defaultValue: "واحد سازمانی" }),
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
        <TabContainer
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
        </TabContainer>
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

export default function ObjectiveObjectPage({
    mode,
    allItems,
    value,
    parent,
    requestedNodeType,
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

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? parent ?? null
        : null;

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

    const renderTabContent = (tab: ObjectiveTabKey) => {
        if (tab === "general") {
            return renderGeneralTab();
        }

        if (tab === "organizationUnits") {
            return (
                <TablePlaceholder
                    title={t("objective.tabs.organizationUnits", { defaultValue: "واحد سازمانی" })}
                    columns={[
                        t("objective.fields.name", { defaultValue: "نام" }),
                        t("objective.fields.description", { defaultValue: "شرح" }),
                    ]}
                />
            );
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
