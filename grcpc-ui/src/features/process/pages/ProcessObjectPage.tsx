import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
import {
    Button,
    DatePicker,
    Dialog,
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
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import {
    DocumentIntegrationDeferredMessage,
    DocumentManager,
    type DocumentLinkTargetType,
} from "@/features/document";
import {
    formatPersianDate,
    formatPersianDateTime,
    toEnglishDigits,
} from "@/shared/utils/date.utils";
import type {
    ProcessMoveCommand,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeType,
    ProcessNodeUpdate,
} from "../domain/process.model";
import { buildTree, collectDescendantIds } from "../utils/process.tree";

export type ProcessObjectMode = "create" | "edit" | "view";

export type ProcessTabKey =
    | "general"
    | "rules"
    | "controls"
    | "objectives"
    | "risks"
    | "documents";

interface ProcessFormState {
    code: string;
    title: string;
    nodeType: ProcessNodeType;
    parentId: string | null;
    sortOrder: string;
    description: string;
    validFrom: string;
    validTo: string;
}

export interface ProcessObjectPageProps {
    mode: ProcessObjectMode;
    allItems: ProcessNode[];
    value: ProcessNode | null;
    parent?: ProcessNode | null;
    requestedNodeType?: ProcessNodeType;
    activeTab?: ProcessTabKey;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onSubmit: (payload: ProcessNodeCreate | ProcessNodeUpdate) => Promise<void> | void;
    onMove?: (payload: ProcessMoveCommand) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
    onActiveTabChange?: (tab: ProcessTabKey) => void;
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
    value: ProcessNode | null,
    parent: ProcessNode | null | undefined,
    requestedNodeType: ProcessNodeType | undefined,
): ProcessFormState {
    return {
        code: value?.code ?? "",
        title: value?.title ?? "",
        nodeType: value?.nodeType ?? requestedNodeType ?? "PROCESS",
        parentId: value?.parentId ?? parent?.id ?? null,
        sortOrder: value?.sortOrder?.toString() ?? "0",
        description: value?.description ?? "",
        validFrom: value?.validFrom ?? "",
        validTo: value?.validTo ?? "",
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

function normalizeOptionalText(value: string): string | null {
    const trimmed = toEnglishDigits(value).trim();
    return trimmed ? trimmed : null;
}

function parseSortOrder(value: string): number | null {
    const normalized = toEnglishDigits(value).trim();
    if (!normalized) {
        return 0;
    }

    const parsed = Number(normalized);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
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
    return nodeType === "PROCESS"
        ? t("process.nodeType.process", { defaultValue: "فرآیند" })
        : t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" });
}

function resolveStatusLabel(
    status: ProcessNode["status"] | undefined,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (status === "ACTIVE") {
        return t("common.active", { defaultValue: "فعال" });
    }

    if (status === "INACTIVE") {
        return t("common.inactive", { defaultValue: "غیرفعال" });
    }

    if (status === "DELETED") {
        return t("common.deleted", { defaultValue: "حذف‌شده" });
    }

    return "-";
}

function resolveDocumentTargetType(nodeType: ProcessNodeType): DocumentLinkTargetType {
    return nodeType === "PROCESS" ? "CENTRAL_PROCESS" : "CENTRAL_SUBPROCESS";
}

function resolveTabLabel(
    tab: ProcessTabKey,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ProcessTabKey, string> = {
        general: t("process.tabs.general", { defaultValue: "اطلاعات کلی" }),
        risks: t("process.tabs.risks", { defaultValue: "ریسک‌ها" }),
        rules: t("process.tabs.rules", { defaultValue: "قوانین" }),
        objectives: t("process.tabs.objectives", { defaultValue: "اهداف" }),
        controls: t("process.tabs.controls", { defaultValue: "کنترل‌ها" }),
        documents: t("process.tabs.documents", { defaultValue: "مستندات" }),
    };

    return map[tab];
}

function getTabs(): ProcessTabKey[] {
    return ["general", "rules", "controls", "objectives", "risks", "documents"];
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
                const key = readSelectedTabKey(event);
                if (key) {
                    onChange(key);
                }
            }}
            style={TAB_CONTAINER_STYLE}
        >
            {tabs.map((tab, index) => {
                const item = (
                    <Tab
                        key={tab}
                        text={resolveTabLabel(tab, t)}
                        selected={activeTab === tab}
                        data-tab-key={tab}
                    />
                );

                if (index === 1) {
                    return [<TabSeparator key="general-separator" />, item];
                }

                return item;
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
    activeTab: controlledActiveTab,
    busy = false,
    error,
    onErrorClose,
    onSubmit,
    onMove,
    onCancel,
    onEdit,
    onActiveTabChange,
}: ProcessObjectPageProps) {
    const { t } = useTranslation();
    const [form, setForm] = useState<ProcessFormState>(() =>
        toFormState(value, parent, requestedNodeType),
    );
    const [validationError, setValidationError] = useState<string | null>(null);
    const [internalActiveTab, setInternalActiveTab] = useState<ProcessTabKey>("general");
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [moveParentId, setMoveParentId] = useState<string | null>(value?.parentId ?? null);

    const readOnly = mode === "view";
    const activeTab = controlledActiveTab ?? internalActiveTab;
    const tabs = getTabs();
    const processParents = useMemo(() => {
        const excluded = new Set<string>([
            ...(value?.id ? [value.id] : []),
            ...(value?.nodeType === "PROCESS"
                ? collectDescendantIds(buildTree(allItems), value.id)
                : []),
        ]);
        return allItems.filter(
            (item) => item.nodeType === "PROCESS" && !excluded.has(item.id),
        );
    }, [allItems, value]);
    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? null
        : null;
    const parentLabel = selectedParent
        ? `${selectedParent.code} - ${selectedParent.title}`
        : t("process.parent.none", { defaultValue: "بدون والد" });
    const headerTitle =
        form.title || value?.title || t("process.object.modalTitle", {
            defaultValue: "مرکز فرآیند",
        });

    const handleActiveTabChange = (tab: ProcessTabKey) => {
        if (controlledActiveTab === undefined) {
            setInternalActiveTab(tab);
        }

        onActiveTabChange?.(tab);
    };

    const handleChange = (key: keyof ProcessFormState, nextValue: string | null) => {
        setForm((current) => ({
            ...current,
            [key]: nextValue,
        }));
    };

    const validate = () => {
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

        const sortOrder = parseSortOrder(form.sortOrder);
        if (sortOrder === null) {
            setValidationError(
                t("process.validation.sortOrderInvalid", {
                    defaultValue: "ترتیب نمایش باید عدد صحیح نامنفی باشد",
                }),
            );
            return false;
        }

        if (form.nodeType === "SUBPROCESS" && !form.parentId) {
            setValidationError(
                t("process.validation.processRequired", {
                    defaultValue: "فرآیند مالک برای زیر فرآیند الزامی است",
                }),
            );
            return false;
        }

        const validFrom = normalizeOptionalText(form.validFrom);
        const validTo = normalizeOptionalText(form.validTo);

        if (validFrom && validTo && validFrom > validTo) {
            setValidationError(
                t("process.validation.invalidValidityRange", {
                    defaultValue: "بازه اعتبار معتبر نیست",
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

        const sortOrder = parseSortOrder(form.sortOrder) ?? 0;

        if (mode === "create") {
            await onSubmit({
                nodeType: form.nodeType,
                code: form.code.trim(),
                title: form.title.trim(),
                parentId: form.parentId,
                sortOrder,
                description: normalizeOptionalText(form.description),
                validFrom: normalizeOptionalText(form.validFrom),
                validTo: normalizeOptionalText(form.validTo),
            });
            return;
        }

        await onSubmit({
            version: value?.version ?? 0,
            title: form.title.trim(),
            sortOrder,
            description: normalizeOptionalText(form.description),
            validFrom: normalizeOptionalText(form.validFrom),
            validTo: normalizeOptionalText(form.validTo),
        });
    };

    const renderGeneralTab = () => (
        <div style={FORM_GRID_STYLE}>
            <FormField label={t("process.fields.code", { defaultValue: "کد" })} required>
                <Input
                    value={form.code}
                    disabled={readOnly || busy || mode !== "create"}
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

            <FormField label={t("process.fields.nodeType", { defaultValue: "نوع آیتم" })}>
                <Input value={resolveNodeTypeLabel(form.nodeType, t)} readonly />
            </FormField>

            <FormField
                label={
                    form.nodeType === "PROCESS"
                        ? t("process.fields.parentProcess", { defaultValue: "والد فرآیند" })
                        : t("process.fields.owningProcess", { defaultValue: "فرآیند مالک" })
                }
                required={form.nodeType === "SUBPROCESS"}
            >
                <Select
                    disabled={readOnly || busy || mode !== "create"}
                    onChange={(event) => {
                        const nextValue = readSelectedDataValue(event, form.parentId ?? "");
                        handleChange("parentId", nextValue || null);
                    }}
                >
                    {form.nodeType === "PROCESS" ? (
                        <Option data-value="" selected={!form.parentId}>
                            {t("process.parent.none", { defaultValue: "بدون والد" })}
                        </Option>
                    ) : null}
                    {processParents.map((item) => (
                        <Option
                            key={item.id}
                            data-value={item.id}
                            selected={item.id === form.parentId}
                        >
                            {item.code} - {item.title}
                        </Option>
                    ))}
                </Select>
            </FormField>

            <FormField label={t("process.fields.status", { defaultValue: "وضعیت" })}>
                <Input value={resolveStatusLabel(value?.status, t)} readonly />
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

            <FormField label={t("process.fields.validFrom", { defaultValue: "از تاریخ" })}>
                <DatePicker
                    value={form.validFrom}
                    valueFormat={DATE_VALUE_FORMAT}
                    formatPattern={DATE_DISPLAY_FORMAT}
                    disabled={readOnly || busy}
                    onChange={(event) => handleChange("validFrom", readInputValue(event))}
                />
            </FormField>

            <FormField label={t("process.fields.validTo", { defaultValue: "تا تاریخ" })}>
                <DatePicker
                    value={form.validTo}
                    valueFormat={DATE_VALUE_FORMAT}
                    formatPattern={DATE_DISPLAY_FORMAT}
                    disabled={readOnly || busy}
                    onChange={(event) => handleChange("validTo", readInputValue(event))}
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
    );

    const renderDocumentsTab = () => (
        <DocumentManager
            title={t("process.tabs.documents", { defaultValue: "مستندات" })}
            targetType={resolveDocumentTargetType(form.nodeType)}
            targetId={value?.id || null}
            readOnly={readOnly}
            showActions={!readOnly}
            saveFirstMessage={t("process.documents.saveFirst", {
                defaultValue: "ابتدا آیتم فرآیندی را ذخیره کنید، سپس مستندات را نهایی کنید.",
            })}
        />
    );

    const renderTabContent = (tab: ProcessTabKey) => {
        if (tab === "general") {
            return renderGeneralTab();
        }

        if (tab === "documents") {
            return renderDocumentsTab();
        }

        return (
            <DocumentIntegrationDeferredMessage
                title={resolveTabLabel(tab, t)}
            />
        );
    };

    const renderFooterActions = () => (
        <div style={FOOTER_STYLE}>
            {mode === "view" ? (
                <>
                    <Button
                        design="Emphasized"
                        disabled={busy || !onEdit}
                        style={ACTION_BUTTON_STYLE}
                        onClick={onEdit}
                    >
                        {t("common.edit", { defaultValue: "Edit" })}
                    </Button>
                    <Button
                        disabled={busy || !onMove}
                        style={ACTION_BUTTON_STYLE}
                        onClick={() => {
                            setMoveParentId(value?.parentId ?? null);
                            setMoveDialogOpen(true);
                        }}
                    >
                        {t("process.move.action", { defaultValue: "Move" })}
                    </Button>
                </>
            ) : (
                <Button
                    design="Emphasized"
                    disabled={busy}
                    style={ACTION_BUTTON_STYLE}
                    onClick={() => {
                        void handleSubmit();
                    }}
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

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {mode === "create"
                            ? t("process.object.createModalTitle", { defaultValue: "ایجاد" })
                            : headerTitle}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("process.fields.parentProcess", {
                            defaultValue: "والد فرآیند",
                        })}
                        value={parentLabel}
                    />
                    <HeaderItem
                        label={t("process.fields.identifier", { defaultValue: "شناسه" })}
                        value={form.code || value?.id}
                    />
                    <HeaderItem
                        label={t("process.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                        value={formatPersianDateTime(value?.createdAt)}
                    />
                    <HeaderItem
                        label={t("process.fields.nodeType", { defaultValue: "نوع آیتم" })}
                        value={resolveNodeTypeLabel(form.nodeType, t)}
                    />
                    <HeaderItem
                        label={t("process.fields.status", { defaultValue: "وضعیت" })}
                        value={resolveStatusLabel(value?.status, t)}
                    />
                    <HeaderItem
                        label={t("process.fields.validity", { defaultValue: "اعتبار" })}
                        value={`${formatPersianDate(form.validFrom)} - ${formatPersianDate(
                            form.validTo,
                        )}`}
                    />
                </div>
            </div>

            <ProcessTabs
                tabs={tabs}
                activeTab={tabs.includes(activeTab) ? activeTab : "general"}
                onChange={handleActiveTabChange}
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

            <Dialog
                open={moveDialogOpen}
                accessibleName={t("process.move.title", { defaultValue: "Move" })}
                onClose={() => setMoveDialogOpen(false)}
            >
                <ModalDialogHeader
                    title={t("process.move.title", { defaultValue: "Move" })}
                    onClose={() => setMoveDialogOpen(false)}
                />
                <div style={{ display: "grid", gap: "1rem", minWidth: "28rem" }}>
                    <Select
                        disabled={busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, moveParentId ?? "");
                            setMoveParentId(nextValue || null);
                        }}
                    >
                        {value?.nodeType === "PROCESS" ? (
                            <Option data-value="" selected={!moveParentId}>
                                {t("process.parent.none", { defaultValue: "No parent" })}
                            </Option>
                        ) : null}
                        {processParents.map((item) => (
                            <Option
                                key={item.id}
                                data-value={item.id}
                                selected={item.id === moveParentId}
                            >
                                {item.code} - {item.title}
                            </Option>
                        ))}
                    </Select>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                        <Button
                            design="Emphasized"
                            disabled={busy || !value || (value.nodeType === "SUBPROCESS" && !moveParentId)}
                            onClick={() => {
                                if (!value || !onMove) return;
                                setMoveDialogOpen(false);
                                void onMove({ parentId: moveParentId, version: value.version });
                            }}
                        >
                            {t("process.move.confirm", { defaultValue: "Move" })}
                        </Button>
                        <Button design="Transparent" onClick={() => setMoveDialogOpen(false)}>
                            {t("common.cancel", { defaultValue: "Cancel" })}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
