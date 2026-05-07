import { useState, type CSSProperties, type ReactNode } from "react";
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
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
    OrganizationStatus,
    OrganizationType,
} from "../domain/organization.model";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";

export type OrganizationObjectMode = "create" | "edit" | "view";

type OrganizationTabKey =
    | "general"
    | "process"
    | "risk"
    | "control"
    | "rules"
    | "policies"
    | "goals"
    | "kpi"
    | "kri"
    | "exceptions"
    | "owner"
    | "documents";

interface OrganizationFormState {
    code: string;
    name: string;
    type: OrganizationType;
    description: string;
    parentId: string | null;
    status: OrganizationStatus;
    validFrom: string;
    validTo: string;
}

export interface OrganizationObjectPageProps {
    mode: OrganizationObjectMode;
    allItems: OrganizationNode[];
    value: OrganizationNode | null;
    busy?: boolean;
    error?: string | null;
    onSubmit: (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => Promise<void> | void;
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
    gridTemplateColumns: "1fr 1fr",
    gap: "0.25rem 2rem",
    padding: "0.75rem 1rem",
    minHeight: "4.5rem",
};

const HEADER_ROW_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "7rem minmax(0, 1fr)",
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

const PARENT_PICKER_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto auto",
    gap: "0.75rem",
    alignItems: "end",
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

const EMPTY_TAB_STYLE: CSSProperties = {
    minHeight: "16rem",
    background: "var(--sapGroup_ContentBackground)",
    border: "1px solid var(--sapList_BorderColor)",
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
            <span>{value?.trim() ? value : "-"}</span>
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
        company: t("organization.type.company", { defaultValue: "شرکت" }),
        holding: t("organization.type.holding", { defaultValue: "هلدینگ" }),
        department: t("organization.type.department", { defaultValue: "دپارتمان" }),
        management: t("organization.type.management", { defaultValue: "مدیریت" }),
        branch: t("organization.type.branch", { defaultValue: "شعبه" }),
        unit: t("organization.type.unit", { defaultValue: "واحد" }),
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

function OrganizationTabs({
                              activeTab,
                              onChange,
                          }: {
    activeTab: OrganizationTabKey;
    onChange: (tab: OrganizationTabKey) => void;
}) {
    const { t } = useTranslation();

    const handleTabSelect = (event: any) => {
        const selectedTab = event.detail?.tab as HTMLElement | undefined;
        const key = selectedTab?.getAttribute("data-tab-key") as OrganizationTabKey | null;

        if (key) {
            onChange(key);
        }
    };

    return (
        <TabContainer
            className={ORGANIZATION_TAB_CONTAINER_CLASS}
            onTabSelect={handleTabSelect}
            style={TAB_CONTAINER_STYLE}
        >
            <Tab
                text={t("organization.tabs.general", { defaultValue: "اطلاعات کلی" })}
                selected={activeTab === "general"}
                data-tab-key="general"
            />

            <TabSeparator />

            <Tab
                text={t("organization.tabs.process", { defaultValue: "فرآیند" })}
                selected={activeTab === "process"}
                data-tab-key="process"
            />

            <Tab
                text={t("organization.tabs.risk", { defaultValue: "ریسک" })}
                selected={activeTab === "risk"}
                data-tab-key="risk"
            />

            <Tab
                text={t("organization.tabs.control", { defaultValue: "کنترل" })}
                selected={activeTab === "control"}
                data-tab-key="control"
            />

            <Tab
                text={t("organization.tabs.rules", { defaultValue: "قوانین" })}
                selected={activeTab === "rules"}
                data-tab-key="rules"
            />

            <Tab
                text={t("organization.tabs.policies", { defaultValue: "سیاست‌ها" })}
                selected={activeTab === "policies"}
                data-tab-key="policies"
            />

            <Tab
                text={t("organization.tabs.goals", { defaultValue: "اهداف" })}
                selected={activeTab === "goals"}
                data-tab-key="goals"
            />

            <Tab text="KPI" selected={activeTab === "kpi"} data-tab-key="kpi" />

            <Tab text="KRI" selected={activeTab === "kri"} data-tab-key="kri" />

            <Tab
                text={t("organization.tabs.exceptions", { defaultValue: "استثناها" })}
                selected={activeTab === "exceptions"}
                data-tab-key="exceptions"
            />

            <Tab
                text={t("organization.tabs.owner", { defaultValue: "مالک" })}
                selected={activeTab === "owner"}
                data-tab-key="owner"
            />

            <Tab
                text={t("organization.tabs.documents", { defaultValue: "مستندات" })}
                selected={activeTab === "documents"}
                data-tab-key="documents"
            />
        </TabContainer>
    );
}

export default function OrganizationObjectPage({
                                                   mode,
                                                   allItems,
                                                   value,
                                                   busy = false,
                                                   error,
                                                   onSubmit,
                                                   onCancel,
                                                   onEdit,
                                               }: OrganizationObjectPageProps) {
    const { t } = useTranslation();

    const readOnly = mode === "view";
    const defaultParentId = value?.parentId ?? null;

    /*
     * این state با key در OrganizationsFclShellPage ریست می‌شود.
     * برای جلوگیری از خطای react-hooks/set-state-in-effect اینجا useEffect sync نگذار.
     */
    const [form, setForm] = useState<OrganizationFormState>(() =>
        toFormState(value, defaultParentId),
    );

    const [validationError, setValidationError] = useState<string | null>(null);
    const [parentDialogOpen, setParentDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<OrganizationTabKey>("general");

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? null
        : null;

    const selectedParentTitle = selectedParent
        ? `${selectedParent.code} — ${selectedParent.name}`
        : t("common.none", { defaultValue: "ندارد" });

    const headerName = form.name || value?.name || "";
    const headerParent = selectedParent
        ? selectedParent.name
        : t("common.none", { defaultValue: "ندارد" });
    const headerStatus = resolveStatusLabel(form.status, t);
    const headerType = resolveTypeLabel(form.type, t);

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
            description: form.description.trim() || undefined,
            parentId: form.parentId,
            status: form.status,
            validFrom: form.validFrom || undefined,
            validTo: form.validTo || undefined,
        };

        await onSubmit(payload);
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
                        label={t("organization.fields.validFrom", { defaultValue: "تاریخ ایجاد" })}
                        value={form.validFrom}
                    />

                    <HeaderItem
                        label={t("organization.fields.status", { defaultValue: "وضعیت" })}
                        value={headerStatus}
                    />

                    <HeaderItem
                        label={t("organization.fields.location", { defaultValue: "موقعیت" })}
                        value=""
                    />

                    <HeaderItem
                        label={t("organization.fields.type", { defaultValue: "نوع سازمان" })}
                        value={headerType}
                    />

                    <HeaderItem
                        label={t("organization.fields.documents", { defaultValue: "مستندات" })}
                        value="0"
                    />
                </div>
            </div>

            <OrganizationTabs activeTab={activeTab} onChange={setActiveTab} />

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

            <div style={BODY_STYLE}>
                {activeTab === "general" ? (
                    <>
                        <div style={FORM_GRID_STYLE}>
                            <FormField
                                label={t("organization.fields.code", { defaultValue: "کد" })}
                                required
                            >
                                <Input
                                    value={form.code}
                                    disabled={readOnly || busy}
                                    onInput={(event) =>
                                        handleChange("code", readInputValue(event))
                                    }
                                />
                            </FormField>

                            <FormField
                                label={t("organization.fields.name", { defaultValue: "نام" })}
                                required
                            >
                                <Input
                                    value={form.name}
                                    disabled={readOnly || busy}
                                    onInput={(event) =>
                                        handleChange("name", readInputValue(event))
                                    }
                                />
                            </FormField>

                            <FormField
                                label={t("organization.fields.type", { defaultValue: "نوع" })}
                            >
                                <Select
                                    disabled={readOnly || busy}
                                    onChange={(event) => {
                                        const nextValue = readSelectedDataValue(event, form.type);
                                        handleChange("type", nextValue as OrganizationType);
                                    }}
                                >
                                    <Option data-value="company" selected={form.type === "company"}>
                                        {t("organization.type.company", { defaultValue: "شرکت" })}
                                    </Option>

                                    <Option data-value="holding" selected={form.type === "holding"}>
                                        {t("organization.type.holding", { defaultValue: "هلدینگ" })}
                                    </Option>

                                    <Option
                                        data-value="department"
                                        selected={form.type === "department"}
                                    >
                                        {t("organization.type.department", {
                                            defaultValue: "دپارتمان",
                                        })}
                                    </Option>

                                    <Option
                                        data-value="management"
                                        selected={form.type === "management"}
                                    >
                                        {t("organization.type.management", {
                                            defaultValue: "مدیریت",
                                        })}
                                    </Option>

                                    <Option data-value="branch" selected={form.type === "branch"}>
                                        {t("organization.type.branch", { defaultValue: "شعبه" })}
                                    </Option>

                                    <Option data-value="unit" selected={form.type === "unit"}>
                                        {t("organization.type.unit", { defaultValue: "واحد" })}
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

                                    <Option
                                        data-value="inactive"
                                        selected={form.status === "inactive"}
                                    >
                                        {t("common.inactive", { defaultValue: "غیرفعال" })}
                                    </Option>
                                </Select>
                            </FormField>

                            <FormField
                                label={t("organization.fields.parent", { defaultValue: "والد" })}
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
                                label={t("organization.fields.validFrom", {
                                    defaultValue: "از تاریخ",
                                })}
                            >
                                <DatePicker
                                    value={form.validFrom}
                                    disabled={readOnly || busy}
                                    onChange={(event) =>
                                        handleChange("validFrom", readInputValue(event))
                                    }
                                />
                            </FormField>

                            <FormField
                                label={t("organization.fields.validTo", {
                                    defaultValue: "تا تاریخ",
                                })}
                            >
                                <DatePicker
                                    value={form.validTo}
                                    disabled={readOnly || busy}
                                    onChange={(event) =>
                                        handleChange("validTo", readInputValue(event))
                                    }
                                />
                            </FormField>

                            <FormField
                                label={t("organization.fields.description", {
                                    defaultValue: "توضیحات",
                                })}
                                fullWidth
                            >
                                <TextArea
                                    rows={5}
                                    value={form.description}
                                    disabled={readOnly || busy}
                                    onInput={(event) =>
                                        handleChange("description", readInputValue(event))
                                    }
                                />
                            </FormField>
                        </div>

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
                                    {t("common.save", { defaultValue: "ثبت" })}
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
                    </>
                ) : (
                    <div style={EMPTY_TAB_STYLE} />
                )}
            </div>

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