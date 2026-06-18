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
    ProcessCategory,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeType,
    ProcessNodeUpdate,
    ProcessStatus,
} from "../domain/process.model";
import ProcessObjectivesTab from "../components/tabs/ProcessObjectivesTab";
import ProcessAccountGroupsTab from "../components/tabs/ProcessAccountGroupsTab";
import ProcessControlsTab from "../components/tabs/ProcessControlsTab";
import ProcessRegulationsTab from "../components/tabs/ProcessRegulationsTab";
import ProcessRisksTab from "../components/tabs/ProcessRisksTab";
import {
    DocumentAttachmentsManager,
    type DocumentBeforeParentSubmitHandler,
} from "@/features/document";
import { formatPersianDate } from "@/shared/utils/date.utils";

export type ProcessObjectMode = "create" | "edit" | "view";

type ProcessTabKey =
    | "general"
    | "rules"
    | "objectives"
    | "accountGroups"
    | "risks"
    | "documents"
    | "controls";

interface ProcessFormState {
    code: string;
    title: string;
    nodeType: ProcessNodeType;
    parentId: string | null;
    status: ProcessStatus;
    sortOrder: string;
    description: string;
    processCategory: ProcessCategory;
    ownerName: string;
    objective: string;
    operationCycle: string;
}

export interface ProcessObjectPageProps {
    mode: ProcessObjectMode;
    allItems: ProcessNode[];
    value: ProcessNode | null;
    parent?: ProcessNode | null;
    requestedNodeType?: ProcessNodeType;
    busy?: boolean;
    error?: string | null;
    documentTempSessionId?: string;
    onErrorClose?: () => void;
    onSubmit: (payload: ProcessNodeCreate | ProcessNodeUpdate) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
    onOpenControlAssignment?: (controlAssignmentId: string) => void;
    onControlStructureChanged?: () => void | Promise<void>;
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

const PROCESS_TAB_CONTAINER_CLASS = "processObjectTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${PROCESS_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${PROCESS_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${PROCESS_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${PROCESS_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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

function toFormState(
    value: ProcessNode | null,
    parent: ProcessNode | null | undefined,
    requestedNodeType: ProcessNodeType | undefined,
): ProcessFormState {
    return {
        code: value?.code ?? "",
        title: value?.title ?? "",
        nodeType: value?.nodeType ?? requestedNodeType ?? "process",
        parentId: value?.parentId ?? parent?.id ?? null,
        status: value?.status ?? "active",
        sortOrder: value?.sortOrder?.toString() ?? "",
        description: value?.description ?? "",
        processCategory: value?.processCategory ?? "operational",
        ownerName: value?.ownerName ?? "",
        objective: value?.objective ?? "",
        operationCycle: value?.operationCycle ?? "",
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

function readSelectedTabKey(event: unknown): ProcessTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as ProcessTabKey | null) ?? null;
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
    nodeType: ProcessNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ProcessNodeType, string> = {
        process: t("process.nodeType.process", { defaultValue: "فرآیند" }),
        subProcess: t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
    };

    return map[nodeType];
}

function resolveStatusLabel(
    status: ProcessStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function resolveCategoryLabel(
    category: ProcessCategory,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ProcessCategory, string> = {
        operational: t("process.category.operational", { defaultValue: "عملیاتی" }),
        support: t("process.category.support", { defaultValue: "پشتیبانی" }),
        strategic: t("process.category.strategic", { defaultValue: "استراتژیک" }),
        financial: t("process.category.financial", { defaultValue: "مالی" }),
        compliance: t("process.category.compliance", { defaultValue: "انطباق" }),
        it: t("process.category.it", { defaultValue: "فناوری اطلاعات" }),
        other: t("process.category.other", { defaultValue: "سایر" }),
    };

    return map[category];
}

function defaultTabs(nodeType: ProcessNodeType): ProcessTabKey[] {
    if (nodeType === "subProcess") {
        return [
            "general",
            "rules",
            "controls",
            "objectives",
            "accountGroups",
            "risks",
            "documents",
        ];
    }

    return ["general", "objectives", "accountGroups", "risks", "documents"];
}

function resolveTabLabel(tab: ProcessTabKey, t: ReturnType<typeof useTranslation>["t"]): string {
    const labels: Record<ProcessTabKey, string> = {
        general: t("process.tabs.general", { defaultValue: "اطلاعات کلی" }),
        rules: t("process.tabs.rules", { defaultValue: "قوانین" }),
        objectives: t("process.tabs.objectives", { defaultValue: "اهداف" }),
        accountGroups: t("process.tabs.accountGroups", { defaultValue: "گروه حساب" }),
        risks: t("process.tabs.risks", { defaultValue: "ریسک" }),
        documents: t("process.tabs.documents", { defaultValue: "مستندات" }),
        controls: t("process.tabs.controls", { defaultValue: "کنترل‌ها" }),
    };

    return labels[tab];
}

function ProcessTabs({
                         tabs,
                         activeTab,
                         onChange,
                     }: {
    tabs: ProcessTabKey[];
    activeTab: ProcessTabKey;
    onChange: (tab: ProcessTabKey) => void;
}) {
    const { t } = useTranslation();

    return (
        <DetailTabContainer
            className={PROCESS_TAB_CONTAINER_CLASS}
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

export default function ProcessObjectPage({
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
                                              onOpenControlAssignment,
                                              onControlStructureChanged,
                                          }: ProcessObjectPageProps) {
    const { t } = useTranslation();
    const readOnly = mode === "view";

    /*
     * این state با key در ProcessesFclShellPage ریست می‌شود.
     * برای جلوگیری از خطای react-hooks/set-state-in-effect اینجا useEffect sync نگذار.
     */
    const [form, setForm] = useState<ProcessFormState>(() =>
        toFormState(value, parent, requestedNodeType),
    );

    const [validationError, setValidationError] = useState<string | null>(null);
    const tabs = useMemo(() => defaultTabs(form.nodeType), [form.nodeType]);
    const [activeTab, setActiveTab] = useState<ProcessTabKey>("general");
    const [hasPendingDocumentUploads, setHasPendingDocumentUploads] = useState(false);
    const documentBeforeSubmitRef = useRef<DocumentBeforeParentSubmitHandler | null>(null);

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? parent ?? null
        : null;

    const currentProcessId = value?.id ?? null;
    const headerTitle = form.title || value?.title || "";
    const headerParent = selectedParent
        ? `${selectedParent.code} - ${selectedParent.title}`
        : t("common.none", { defaultValue: "ندارد" });
    const headerType = resolveNodeTypeLabel(form.nodeType, t);
    const headerStatus = resolveStatusLabel(form.status, t);
    const headerCategory = resolveCategoryLabel(form.processCategory, t);

    const handleChange = <K extends keyof ProcessFormState>(
        key: K,
        nextValue: ProcessFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const validate = (): boolean => {
        if (!form.code.trim()) {
            setValidationError(
                t("process.validation.codeRequired", { defaultValue: "کد الزامی است" }),
            );
            return false;
        }

        if (!form.title.trim()) {
            setValidationError(
                t("process.validation.titleRequired", { defaultValue: "نام الزامی است" }),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseSortOrder(form.sortOrder) === undefined) {
            setValidationError(
                t("process.validation.sortOrderInvalid", {
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

        const basePayload: ProcessNodeCreate | ProcessNodeUpdate = {
            code: form.code.trim(),
            title: form.title.trim(),
            nodeType: form.nodeType,
            parentId: form.parentId,
            status: form.status,
            sortOrder: parseSortOrder(form.sortOrder),
            description: normalizeOptionalText(form.description),
            processCategory: form.processCategory,
            ownerName: normalizeOptionalText(form.ownerName),
        };

        const payload: ProcessNodeCreate | ProcessNodeUpdate = {
            ...basePayload,
            objective: normalizeOptionalText(form.objective),
            operationCycle: normalizeOptionalText(form.operationCycle),
        };

        await onSubmit(payload);
    };

    const renderGeneralTab = () => (
        <>
            <div style={FORM_GRID_STYLE}>
                <FormField label={t("process.fields.code", { defaultValue: "شناسه" })} required>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("process.fields.name", { defaultValue: "نام" })} required>
                    <Input
                        value={form.title}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("title", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("process.fields.parent", { defaultValue: "والد" })}>
                    <Input value={headerParent} readonly />
                </FormField>

                <FormField label={t("process.fields.type", { defaultValue: "نوع" })}>
                    <Input value={headerType} readonly />
                </FormField>

                <FormField
                    label={t("process.fields.processCategory", {
                        defaultValue: "نوع فرآیند",
                    })}
                >
                    <Select
                        disabled={readOnly || busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.processCategory);
                            handleChange("processCategory", nextValue as ProcessCategory);
                        }}
                    >
                        <Option
                            data-value="operational"
                            selected={form.processCategory === "operational"}
                        >
                            {t("process.category.operational", { defaultValue: "عملیاتی" })}
                        </Option>
                        <Option data-value="support" selected={form.processCategory === "support"}>
                            {t("process.category.support", { defaultValue: "پشتیبانی" })}
                        </Option>
                        <Option
                            data-value="strategic"
                            selected={form.processCategory === "strategic"}
                        >
                            {t("process.category.strategic", { defaultValue: "استراتژیک" })}
                        </Option>
                        <Option
                            data-value="financial"
                            selected={form.processCategory === "financial"}
                        >
                            {t("process.category.financial", { defaultValue: "مالی" })}
                        </Option>
                        <Option
                            data-value="compliance"
                            selected={form.processCategory === "compliance"}
                        >
                            {t("process.category.compliance", { defaultValue: "انطباق" })}
                        </Option>
                        <Option data-value="it" selected={form.processCategory === "it"}>
                            {t("process.category.it", { defaultValue: "فناوری اطلاعات" })}
                        </Option>
                        <Option data-value="other" selected={form.processCategory === "other"}>
                            {t("process.category.other", { defaultValue: "سایر" })}
                        </Option>
                    </Select>
                </FormField>

                <FormField label={t("process.fields.status", { defaultValue: "وضعیت" })}>
                    <Select
                        disabled={readOnly || busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.status);
                            handleChange("status", nextValue as ProcessStatus);
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
                    label={t("process.fields.sortOrder", { defaultValue: "ترتیب نمایش" })}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("process.fields.owner", { defaultValue: "مسئول" })}>
                    <Input
                        value={form.ownerName}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("ownerName", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("process.fields.operationCycle", {
                        defaultValue: "دوره عملیاتی",
                    })}
                >
                    <Input
                        value={form.operationCycle}
                        disabled={readOnly || busy}
                        onInput={(event) =>
                            handleChange("operationCycle", readInputValue(event))
                        }
                    />
                </FormField>

                <FormField
                    label={t("process.fields.objective", { defaultValue: "هدف" })}
                    fullWidth
                >
                    <TextArea
                        rows={3}
                        value={form.objective}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("objective", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("process.fields.description", { defaultValue: "شرح" })}
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

    const renderTabContent = (tab: ProcessTabKey) => {
        if (tab === "general") {
            return renderGeneralTab();
        }

        if (tab === "rules") {
            return (
                <ProcessRegulationsTab
                    key={currentProcessId ?? "unsaved-process-regulations"}
                    processId={currentProcessId}
                    nodeType={form.nodeType}
                    readOnly={readOnly}
                />
            );
        }

        if (tab === "objectives") {
            return (
                <ProcessObjectivesTab
                    key={currentProcessId ?? "unsaved-process-objectives"}
                    processId={currentProcessId}
                    readOnly={readOnly}
                />
            );
        }

        if (tab === "accountGroups") {
            return (
                <ProcessAccountGroupsTab
                    key={currentProcessId ?? "unsaved-process-account-groups"}
                    processId={currentProcessId}
                    readOnly={readOnly}
                />
            );
        }

        if (tab === "risks") {
            return (
                <ProcessRisksTab
                    key={currentProcessId ?? "unsaved-process-risks"}
                    processId={currentProcessId}
                    nodeType={form.nodeType}
                    readOnly={readOnly}
                />
            );
        }

        if (tab === "controls") {
            if (form.nodeType !== "subProcess") {
                return null;
            }

            return (
                <ProcessControlsTab
                    key={currentProcessId ?? "unsaved-sub-process-controls"}
                    subProcessId={currentProcessId}
                    subProcessTitle={form.title || value?.title}
                    readOnly={readOnly}
                    onOpenControl={onOpenControlAssignment}
                    onControlStructureChanged={onControlStructureChanged}
                />
            );
        }

        return (
            <DocumentAttachmentsManager
                key={currentProcessId ?? "unsaved-process-documents"}
                title={t("process.tabs.documents", { defaultValue: "مستندات" })}
                targetType="PROCESS_NODE"
                targetId={currentProcessId}
                tempSessionId={documentTempSessionId}
                stagingMode="tempUntilParentSave"
                busy={busy}
                readOnly={readOnly}
                saveFirstMessage={t("document.saveFirst.process", {
                    defaultValue:
                        "ابتدا آیتم فرآیندی را ذخیره کنید، سپس مستندات را بارگذاری کنید.",
                })}
                onBeforeParentSubmitChange={handleDocumentBeforeParentSubmitChange}
                onPendingUploadsChange={setHasPendingDocumentUploads}
            />
        );
    };

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {mode === "create"
                            ? t("process.object.createModalTitle", { defaultValue: "ایجاد" })
                            : headerTitle ||
                              t("process.object.modalTitle", {
                                  defaultValue: "مرکز فرآیند",
                              })}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("process.fields.parentProcess", {
                            defaultValue: "والد فرآیند",
                        })}
                        value={headerParent}
                    />
                    <HeaderItem
                        label={t("process.fields.identifier", { defaultValue: "شناسه" })}
                        value={form.code || value?.id}
                    />
                    <HeaderItem
                        label={t("process.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                        value={formatPersianDate(value?.createdAt)}
                    />
                    <HeaderItem
                        label={t("process.fields.processCategory", {
                            defaultValue: "نوع فرآیند",
                        })}
                        value={headerCategory}
                    />
                    <HeaderItem
                        label={t("process.fields.nodeType", { defaultValue: "نوع آیتم" })}
                        value={headerType}
                    />
                    <HeaderItem
                        label={t("process.fields.status", { defaultValue: "وضعیت" })}
                        value={headerStatus}
                    />
                </div>
            </div>

            <ProcessTabs
                tabs={tabs}
                activeTab={tabs.includes(activeTab) ? activeTab : "general"}
                onChange={setActiveTab}
            />

            {error ? (
                <MessageStrip design="Negative" onClose={onErrorClose}>
                    {error}
                </MessageStrip>
            ) : null}

            {validationError ? (
                <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
                    {validationError}
                </MessageStrip>
            ) : null}

            <div style={BODY_STYLE}>
                {renderTabContent(tabs.includes(activeTab) ? activeTab : "general")}
            </div>

            {renderFooterActions()}
        </div>
    );
}
