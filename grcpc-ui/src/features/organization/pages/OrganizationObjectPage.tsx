import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
import {
    Button,
    DatePicker,
    Input,
    Label,
    MessageStrip,
    Tab,
    TabSeparator,
    Title,
} from "@ui5/webcomponents-react";

import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { DocumentIntegrationDeferredMessage, DocumentManager } from "@/features/document";
import {
    formatPersianDate,
    formatPersianDateTime,
    toEnglishDigits,
} from "@/shared/utils/date.utils";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";
import type {
    OrganizationMoveCommand,
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "../domain/organization.model";
import { buildTree, collectDescendantIds } from "../utils/organization.tree";

export type OrganizationObjectMode = "create" | "edit" | "view";

export type OrganizationTabKey =
    | "general"
    | "subProcesses"
    | "risks"
    | "controls"
    | "rules"
    | "policies"
    | "goals"
    | "documents";

interface OrganizationFormState {
    code: string;
    parentOrganizationId: string | null;
    validFrom: string;
    validTo: string;
}

export interface OrganizationObjectPageProps {
    mode: OrganizationObjectMode;
    allItems: OrganizationNode[];
    value: OrganizationNode | null;
    activeTab?: OrganizationTabKey;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onSubmit: (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => Promise<void> | void;
    onMove?: (payload: OrganizationMoveCommand) => Promise<boolean>;
    onCancel: () => void;
    onEdit?: () => void;
    onActiveTabChange?: (tab: OrganizationTabKey) => void;
    onPendingDocumentsChange?: (hasPending: boolean) => void;
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

const PARENT_PICKER_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto auto",
    gap: "0.75rem",
    alignItems: "end",
};

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "d MMMM y";

const TAB_SEQUENCE: readonly OrganizationTabKey[] = [
    "general",
    "subProcesses",
    "risks",
    "controls",
    "rules",
    "policies",
    "goals",
    "documents",
];

function toFormState(value: OrganizationNode | null): OrganizationFormState {
    return {
        code: value?.code ?? "",
        parentOrganizationId: value?.parentOrganizationId ?? null,
        validFrom: value?.validFrom ?? "",
        validTo: value?.validTo ?? "",
    };
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

function readSelectedTabKey(event: unknown): OrganizationTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as OrganizationTabKey | null) ?? null;
}

function normalizeOptionalText(value: string): string | null {
    const trimmed = toEnglishDigits(value).trim();
    return trimmed ? trimmed : null;
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
    children,
}: {
    label: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <div style={FIELD_STYLE}>
            <Label showColon required={required}>
                {label}
            </Label>
            {children}
        </div>
    );
}

function resolveStatusLabel(
    status: OrganizationNode["status"] | undefined,
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

function resolveTabLabel(
    tab: OrganizationTabKey,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<OrganizationTabKey, string> = {
        general: t("organization.tabs.general", { defaultValue: "اطلاعات کلی" }),
        subProcesses: t("organization.tabs.subProcesses", { defaultValue: "زیر فرآیند" }),
        risks: t("organization.tabs.risks", { defaultValue: "ریسک‌ها" }),
        controls: t("organization.tabs.controls", { defaultValue: "کنترل‌ها" }),
        rules: t("organization.tabs.rules", { defaultValue: "قوانین" }),
        policies: t("organization.tabs.policies", { defaultValue: "سیاست‌ها" }),
        goals: t("organization.tabs.goals.label", { defaultValue: "اهداف" }),
        documents: t("organization.tabs.documents", { defaultValue: "مستندات" }),
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
            {TAB_SEQUENCE.map((tab, index) => {
                const tabItem = (
                    <Tab
                        key={tab}
                        text={resolveTabLabel(tab, t)}
                        selected={activeTab === tab}
                        data-tab-key={tab}
                    />
                );

                if (index === 1) {
                    return [<TabSeparator key="general-separator" />, tabItem];
                }

                return tabItem;
            })}
        </DetailTabContainer>
    );
}

function DeferredRelationTab({ title }: { title: string }) {
    return <DocumentIntegrationDeferredMessage title={title} />;
}

export default function OrganizationObjectPage({
    mode,
    allItems,
    value,
    activeTab: controlledActiveTab,
    busy = false,
    error,
    onErrorClose,
    onSubmit,
    onMove,
    onCancel,
    onEdit,
    onActiveTabChange,
    onPendingDocumentsChange,
}: OrganizationObjectPageProps) {
    const { t } = useTranslation();
    const [form, setForm] = useState<OrganizationFormState>(() => toFormState(value));
    const [validationError, setValidationError] = useState<string | null>(null);
    const [parentDialogOpen, setParentDialogOpen] = useState(false);
    const [parentDialogPurpose, setParentDialogPurpose] = useState<"create" | "move">("create");
    const [moveParentId, setMoveParentId] = useState<string | null>(value?.parentOrganizationId ?? null);
    const [internalActiveTab, setInternalActiveTab] = useState<OrganizationTabKey>("general");
    const [formSourceId, setFormSourceId] = useState(value?.id || null);

    const readOnly = mode === "view";
    const activeTab = controlledActiveTab ?? internalActiveTab;
    const descendantIds = useMemo(
        () => new Set(collectDescendantIds(buildTree(allItems), value?.id)),
        [allItems, value?.id],
    );
    const moveCandidateInvalid = !value
        || (moveParentId !== null && (
            moveParentId === value.id
            || descendantIds.has(moveParentId)
            || !allItems.some((item) => item.id === moveParentId)
        ));
    const moveCandidateUnchanged = moveParentId === (value?.parentOrganizationId ?? null);
    const selectedParent = form.parentOrganizationId
        ? allItems.find((item) => item.id === form.parentOrganizationId) ?? null
        : null;
    const parentLabel = selectedParent
        ? `${selectedParent.code}`
        : t("organization.parent.none", { defaultValue: "بدون والد" });
    const headerTitle =
        form.code || value?.displayLabel || t("organization.object.modalTitle", {
            defaultValue: "واحد سازمانی",
        });

    if (!formSourceId && value?.id) {
        setFormSourceId(value.id);
        setForm(toFormState(value));
        setMoveParentId(value.parentOrganizationId ?? null);
    }

    const handleActiveTabChange = (tab: OrganizationTabKey) => {
        if (controlledActiveTab === undefined) {
            setInternalActiveTab(tab);
        }

        onActiveTabChange?.(tab);
    };

    const handleChange = (key: keyof OrganizationFormState, nextValue: string | null) => {
        setForm((current) => ({
            ...current,
            [key]: nextValue,
        }));
    };

    const validate = () => {
        if (!form.code.trim()) {
            setValidationError(
                t("organization.validation.codeRequired", { defaultValue: "کد الزامی است" }),
            );
            return false;
        }

        const validFrom = normalizeOptionalText(form.validFrom);
        const validTo = normalizeOptionalText(form.validTo);

        if (validFrom && validTo && validFrom > validTo) {
            setValidationError(
                t("organization.validation.invalidValidityRange", {
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

        if (mode === "create") {
            await onSubmit({
                code: form.code.trim(),
                parentOrganizationId: form.parentOrganizationId,
                validFrom: normalizeOptionalText(form.validFrom),
                validTo: normalizeOptionalText(form.validTo),
            });
            return;
        }

        await onSubmit({
            version: value?.version ?? 0,
            validFrom: normalizeOptionalText(form.validFrom),
            validTo: normalizeOptionalText(form.validTo),
        });
    };

    const handleMoveConfirm = async () => {
        if (!value || !onMove || moveCandidateInvalid || moveCandidateUnchanged) return;
        const succeeded = await onMove({
            parentOrganizationId: moveParentId,
            version: value.version,
        });
        if (!succeeded) return;
        setForm((current) => ({ ...current, parentOrganizationId: moveParentId }));
        setParentDialogOpen(false);
    };

    const renderGeneralTab = () => (
        <div style={FORM_GRID_STYLE}>
            <FormField label={t("organization.fields.code", { defaultValue: "کد" })} required>
                <Input
                    value={form.code}
                    disabled={readOnly || busy || mode !== "create"}
                    onInput={(event) => handleChange("code", readInputValue(event))}
                />
            </FormField>

            <FormField label={t("organization.fields.status", { defaultValue: "وضعیت" })}>
                <Input value={resolveStatusLabel(value?.status, t)} readonly />
            </FormField>

            <FormField label={t("organization.fields.parent", { defaultValue: "والد" })}>
                <div style={PARENT_PICKER_STYLE}>
                    <Input value={parentLabel} readonly />
                    {mode === "create" ? (
                        <>
                            <Button
                                disabled={busy}
                                onClick={() => {
                                    setParentDialogPurpose("create");
                                    setParentDialogOpen(true);
                                }}
                            >
                                {t("organization.parent.select", { defaultValue: "Select" })}
                            </Button>
                            <Button
                                disabled={busy || !form.parentOrganizationId}
                                design="Transparent"
                                onClick={() => handleChange("parentOrganizationId", null)}
                            >
                                {t("organization.parent.clear", { defaultValue: "Clear" })}
                            </Button>
                        </>
                    ) : null}
                </div>
            </FormField>

            <FormField label={t("organization.fields.version", { defaultValue: "نسخه" })}>
                <Input value={value?.version === undefined ? "-" : String(value.version)} readonly />
            </FormField>

            <FormField label={t("organization.fields.validFrom", { defaultValue: "از تاریخ" })}>
                <DatePicker
                    value={form.validFrom}
                    valueFormat={DATE_VALUE_FORMAT}
                    formatPattern={DATE_DISPLAY_FORMAT}
                    disabled={readOnly || busy}
                    onChange={(event) => handleChange("validFrom", readInputValue(event))}
                />
            </FormField>

            <FormField label={t("organization.fields.validTo", { defaultValue: "تا تاریخ" })}>
                <DatePicker
                    value={form.validTo}
                    valueFormat={DATE_VALUE_FORMAT}
                    formatPattern={DATE_DISPLAY_FORMAT}
                    disabled={readOnly || busy}
                    onChange={(event) => handleChange("validTo", readInputValue(event))}
                />
            </FormField>
        </div>
    );

    const renderDocumentsTab = () => (
        <DocumentManager
            title={t("organization.tabs.documents", { defaultValue: "مستندات" })}
            targetType="ORG"
            targetId={value?.id || null}
            readOnly={readOnly}
            showActions={!readOnly}
            onPendingUploadsChange={onPendingDocumentsChange}
            saveFirstMessage={t("organization.documents.saveFirst", {
                defaultValue: "ابتدا سازمان را ذخیره کنید، سپس مستندات را نهایی کنید.",
            })}
        />
    );

    const renderTabPanels = () => (
        <>
            <div style={{ display: activeTab === "general" ? "block" : "none" }}>
                {renderGeneralTab()}
            </div>
            {TAB_SEQUENCE.filter((tab) => tab !== "general" && tab !== "documents").map((tab) => (
                <div key={tab} style={{ display: activeTab === tab ? "block" : "none" }}>
                    <DeferredRelationTab title={resolveTabLabel(tab, t)} />
                </div>
            ))}
            <div style={{ display: activeTab === "documents" ? "block" : "none" }}>
                {renderDocumentsTab()}
            </div>
        </>
    );

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
                            setParentDialogPurpose("move");
                            setMoveParentId(value?.parentOrganizationId ?? null);
                            setParentDialogOpen(true);
                        }}
                    >
                        {t("organization.move.action", { defaultValue: "Move" })}
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
                    <Title level="H4">{headerTitle}</Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("organization.fields.code", { defaultValue: "کد" })}
                        value={form.code || value?.code}
                    />
                    <HeaderItem
                        label={t("organization.fields.parent", { defaultValue: "والد" })}
                        value={parentLabel}
                    />
                    <HeaderItem
                        label={t("organization.fields.status", { defaultValue: "وضعیت" })}
                        value={resolveStatusLabel(value?.status, t)}
                    />
                    <HeaderItem
                        label={t("organization.fields.validity", { defaultValue: "اعتبار" })}
                        value={`${formatPersianDate(form.validFrom)} - ${formatPersianDate(
                            form.validTo,
                        )}`}
                    />
                    <HeaderItem
                        label={t("organization.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
                        value={formatPersianDateTime(value?.createdAt)}
                    />
                    <HeaderItem
                        label={t("organization.fields.updatedAt", {
                            defaultValue: "تاریخ بروزرسانی",
                        })}
                        value={formatPersianDateTime(value?.updatedAt)}
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
                <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
                    {validationError}
                </MessageStrip>
            ) : null}

            <div style={BODY_STYLE}>{renderTabPanels()}</div>

            {renderFooterActions()}

            <ParentValueHelpDialog
                open={parentDialogOpen}
                items={allItems}
                currentId={value?.id || null}
                selectedParentId={
                    parentDialogPurpose === "create"
                        ? form.parentOrganizationId
                        : moveParentId
                }
                busy={busy}
                confirmDisabled={moveCandidateInvalid || moveCandidateUnchanged}
                onConfirm={parentDialogPurpose === "move" ? () => { void handleMoveConfirm(); } : undefined}
                onClose={() => {
                    if (!busy) setParentDialogOpen(false);
                }}
                onSelect={(parentId) => {
                    if (parentDialogPurpose === "create") {
                        setParentDialogOpen(false);
                        handleChange("parentOrganizationId", parentId);
                        return;
                    }
                    setMoveParentId(parentId);
                }}
            />
        </div>
    );
}
