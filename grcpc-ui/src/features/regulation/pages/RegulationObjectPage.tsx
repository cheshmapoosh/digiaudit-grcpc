import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
    TabContainer,
    TabSeparator,
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeType,
    RegulationNodeUpdate,
    RegulationStatus,
} from "../domain/regulation.model";

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
        effectiveDate: value?.effectiveDate ?? "",
        validTo: value?.validTo ?? "",
        issuer: value?.issuer ?? "",
        ownerName: value?.ownerName ?? "",
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
        lawGroup: t("regulation.nodeType.lawGroup", { defaultValue: "گروه قانون" }),
        law: t("regulation.nodeType.law", { defaultValue: "قانون" }),
        lawRequirement: t("regulation.nodeType.lawRequirement", {
            defaultValue: "الزامات قانون",
        }),
    };

    return map[nodeType];
}

function resolveStatusLabel(
    status: RegulationStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
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
        general: t("regulation.tabs.general", { defaultValue: "اطلاعات کلی" }),
        requirements: t("regulation.tabs.requirements", { defaultValue: "الزامات" }),
        documents: t("regulation.tabs.documents", { defaultValue: "مستندات" }),
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
        <TabContainer
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
        </TabContainer>
    );
}

function TablePlaceholder({ title, columns }: { title: string; columns: string[] }) {
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

function resolveParentLabel(
    nodeType: RegulationNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (nodeType === "lawGroup") {
        return t("regulation.fields.parentLawGroup", { defaultValue: "والد گروه قانون" });
    }

    if (nodeType === "law") {
        return t("regulation.fields.parentLaw", { defaultValue: "والد قانون" });
    }

    return t("regulation.fields.parentRequirement", { defaultValue: "والد قانون" });
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

    const headerTitle = form.title || value?.title || "";
    const headerParent = selectedParent
        ? `${selectedParent.code} - ${selectedParent.title}`
        : t("common.none", { defaultValue: "ندارد" });
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
                t("regulation.validation.codeRequired", { defaultValue: "کد الزامی است" }),
            );
            return false;
        }

        if (!form.title.trim()) {
            setValidationError(
                t("regulation.validation.titleRequired", { defaultValue: "نام الزامی است" }),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseSortOrder(form.sortOrder) === undefined) {
            setValidationError(
                t("regulation.validation.sortOrderInvalid", {
                    defaultValue: "ترتیب نمایش باید عدد صحیح نامنفی باشد",
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
                <FormField label={t("regulation.fields.code", { defaultValue: "شناسه" })} required>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("regulation.fields.name", { defaultValue: "نام" })} required>
                    <Input
                        value={form.title}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("title", readInputValue(event))}
                    />
                </FormField>

                <FormField label={parentLabel}>
                    <Input value={headerParent} readonly />
                </FormField>

                <FormField label={t("regulation.fields.type", { defaultValue: "نوع" })}>
                    <Input value={headerType} readonly />
                </FormField>

                <FormField label={t("regulation.fields.status", { defaultValue: "وضعیت" })}>
                    <Select
                        disabled={readOnly || busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.status);
                            handleChange("status", nextValue as RegulationStatus);
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
                    label={t("regulation.fields.sortOrder", { defaultValue: "ترتیب نمایش" })}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("regulation.fields.effectiveDate", { defaultValue: "تاریخ ایجاد" })}
                >
                    <Input
                        value={form.effectiveDate}
                        disabled={readOnly || busy}
                        placeholder="1404/01/01"
                        onInput={(event) => handleChange("effectiveDate", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("regulation.fields.validTo", { defaultValue: "تاریخ اعتبار" })}
                >
                    <Input
                        value={form.validTo}
                        disabled={readOnly || busy}
                        placeholder="1404/12/29"
                        onInput={(event) => handleChange("validTo", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("regulation.fields.issuer", { defaultValue: "مرجع صادرکننده" })}
                >
                    <Input
                        value={form.issuer}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("issuer", readInputValue(event))}
                    />
                </FormField>

                <FormField label={t("regulation.fields.owner", { defaultValue: "مالک" })}>
                    <Input
                        value={form.ownerName}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("ownerName", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("regulation.fields.description", { defaultValue: "شرح" })}
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
        </>
    );

    const renderTabContent = () => {
        if (effectiveActiveTab === "general") {
            return renderGeneralTab();
        }

        if (effectiveActiveTab === "requirements") {
            return (
                <TablePlaceholder
                    title={t("regulation.tabs.requirements", { defaultValue: "الزامات" })}
                    columns={[
                        t("regulation.fields.requirement", { defaultValue: "الزامات" }),
                        t("regulation.fields.description", { defaultValue: "شرح" }),
                        t("regulation.fields.lawName", { defaultValue: "نام قانون" }),
                        t("regulation.fields.effectiveDate", { defaultValue: "تاریخ ایجاد" }),
                        t("regulation.fields.validTo", { defaultValue: "تاریخ اعتبار" }),
                    ]}
                />
            );
        }

        return (
            <TablePlaceholder
                title={t("regulation.tabs.documents", { defaultValue: "مستندات" })}
                columns={[
                    t("regulation.fields.name", { defaultValue: "نام" }),
                    t("regulation.fields.type", { defaultValue: "نوع" }),
                    t("regulation.fields.effectiveDate", { defaultValue: "تاریخ ایجاد" }),
                ]}
            />
        );
    };

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {mode === "create"
                            ? t("regulation.object.createModalTitle", { defaultValue: "ایجاد" })
                            : resolveNodeTypeLabel(form.nodeType, t)}
                    </Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem label={parentLabel} value={headerParent} />
                    <HeaderItem
                        label={t("regulation.fields.identifier", { defaultValue: "شناسه" })}
                        value={form.code || value?.id}
                    />
                    <HeaderItem
                        label={t("regulation.fields.effectiveDate", {
                            defaultValue: "تاریخ ایجاد",
                        })}
                        value={form.effectiveDate || value?.effectiveDate}
                    />
                    <HeaderItem
                        label={t("regulation.fields.validTo", { defaultValue: "تاریخ اعتبار" })}
                        value={form.validTo || value?.validTo}
                    />
                    <HeaderItem
                        label={t("regulation.fields.nodeType", { defaultValue: "نوع آیتم" })}
                        value={headerType}
                    />
                    <HeaderItem
                        label={t("regulation.fields.status", { defaultValue: "وضعیت" })}
                        value={headerStatus}
                    />
                    {headerTitle ? (
                        <HeaderItem
                            label={t("regulation.fields.name", { defaultValue: "نام" })}
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
        </div>
    );
}
