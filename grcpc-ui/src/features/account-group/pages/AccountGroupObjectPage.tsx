import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
import {
    Button,
    CheckBox,
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
    AccountGroupAssertions,
    AccountGroupImportance,
    AccountGroupNode,
    AccountGroupNodeCreate,
    AccountGroupNodeUpdate,
    AccountGroupStatus,
} from "../domain/accountGroup.model";
import { toEnglishDigits } from "@/shared/utils/date.utils";

export type AccountGroupObjectMode = "create" | "edit" | "view";

type AccountGroupTabKey = "general" | "objectives" | "accounts" | "risks";

interface AccountGroupFormState {
    code: string;
    title: string;
    parentId: string | null;
    status: AccountGroupStatus;
    sortOrder: string;
    description: string;
    importance: AccountGroupImportance;
    reasonableAssurance: boolean;
    effectiveDate: string;
    documentsCount: string;
    assertions: AccountGroupAssertions;
}

export interface AccountGroupObjectPageProps {
    mode: AccountGroupObjectMode;
    allItems: AccountGroupNode[];
    value: AccountGroupNode | null;
    parent?: AccountGroupNode | null;
    busy?: boolean;
    error?: string | null;
    onSubmit: (payload: AccountGroupNodeCreate | AccountGroupNodeUpdate) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
}

const DEFAULT_ASSERTIONS: AccountGroupAssertions = {
    existence: false,
    completeness: false,
    valuation: false,
    disclosure: false,
};

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

const ACCOUNT_GROUP_TAB_CONTAINER_CLASS = "accountGroupObjectTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${ACCOUNT_GROUP_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${ACCOUNT_GROUP_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${ACCOUNT_GROUP_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${ACCOUNT_GROUP_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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

const CHECKBOX_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.5rem 1rem",
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
    value: AccountGroupNode | null,
    parent: AccountGroupNode | null | undefined,
): AccountGroupFormState {
    return {
        code: value?.code ?? "",
        title: value?.title ?? "",
        parentId: value?.parentId ?? parent?.id ?? null,
        status: value?.status ?? "active",
        sortOrder: value?.sortOrder?.toString() ?? "",
        description: value?.description ?? "",
        importance: value?.importance ?? "medium",
        reasonableAssurance: value?.reasonableAssurance ?? true,
        effectiveDate: toEnglishDigits(value?.effectiveDate ?? ""),
        documentsCount: value?.documentsCount?.toString() ?? "0",
        assertions: value?.assertions ?? DEFAULT_ASSERTIONS,
    };
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

function readDatePickerValue(event: unknown): string {
    const detailValue = (event as { detail?: { value?: string } }).detail?.value;

    return toEnglishDigits(detailValue ?? readInputValue(event));
}

function readCheckedValue(event: unknown): boolean {
    return Boolean((event as { target?: { checked?: boolean } }).target?.checked);
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

function readSelectedTabKey(event: unknown): AccountGroupTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as AccountGroupTabKey | null) ?? null;
}

function normalizeOptionalText(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function parseNonNegativeInteger(value: string): number | undefined {
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
    status: AccountGroupStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function resolveImportanceLabel(
    importance: AccountGroupImportance,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<AccountGroupImportance, string> = {
        low: t("accountGroup.importance.low", { defaultValue: "کم" }),
        medium: t("accountGroup.importance.medium", { defaultValue: "متوسط" }),
        high: t("accountGroup.importance.high", { defaultValue: "زیاد" }),
        critical: t("accountGroup.importance.critical", { defaultValue: "بحرانی" }),
    };

    return map[importance];
}

function resolveBooleanLabel(
    value: boolean,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return value
        ? t("common.yes", { defaultValue: "بله" })
        : t("common.no", { defaultValue: "خیر" });
}

function defaultTabs(): AccountGroupTabKey[] {
    return ["general", "objectives", "accounts", "risks"];
}

function resolveTabLabel(
    tab: AccountGroupTabKey,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<AccountGroupTabKey, string> = {
        general: t("accountGroup.tabs.general", { defaultValue: "اطلاعات کلی" }),
        objectives: t("accountGroup.tabs.objectives", { defaultValue: "اهداف" }),
        accounts: t("accountGroup.tabs.accounts", { defaultValue: "حساب‌های معین" }),
        risks: t("accountGroup.tabs.risks", { defaultValue: "ریسک‌ها" }),
    };

    return labels[tab];
}

function AccountGroupTabs({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: AccountGroupTabKey[];
    activeTab: AccountGroupTabKey;
    onChange: (tab: AccountGroupTabKey) => void;
}) {
    const { t } = useTranslation();

    return (
        <DetailTabContainer
            className={ACCOUNT_GROUP_TAB_CONTAINER_CLASS}
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

function TablePlaceholder({
    title,
    columns,
    rows,
}: {
    title: string;
    columns: string[];
    rows?: ReactNode[][];
}) {
    const rowsToRender = rows?.length ? rows : [["", "", ""], ["", "", ""], ["", "", ""]];

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
                    {rowsToRender.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {columns.map((column, columnIndex) => (
                                <td key={`${column}-${columnIndex}`} style={TABLE_CELL_STYLE}>
                                    {row[columnIndex] ?? ""}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AccountGroupObjectPage({
    mode,
    allItems,
    value,
    parent,
    busy = false,
    error,
    onSubmit,
    onCancel,
    onEdit,
}: AccountGroupObjectPageProps) {
    const { t } = useTranslation();
    const readOnly = mode === "view";

    /*
     * این state با key در AccountGroupsFclShellPage ریست می‌شود.
     * برای جلوگیری از خطای react-hooks/set-state-in-effect اینجا useEffect sync نگذار.
     */
    const [form, setForm] = useState<AccountGroupFormState>(() =>
        toFormState(value, parent),
    );

    const [validationError, setValidationError] = useState<string | null>(null);
    const tabs = useMemo(() => defaultTabs(), []);
    const [activeTab, setActiveTab] = useState<AccountGroupTabKey>("general");

    const selectedParent = form.parentId
        ? allItems.find((item) => item.id === form.parentId) ?? parent ?? null
        : null;

    const headerTitle = form.title || value?.title || "";
    const headerParent = selectedParent
        ? `${selectedParent.code} - ${selectedParent.title}`
        : t("common.none", { defaultValue: "ندارد" });
    const headerStatus = resolveStatusLabel(form.status, t);
    const headerImportance = resolveImportanceLabel(form.importance, t);
    const headerReasonableAssurance = resolveBooleanLabel(form.reasonableAssurance, t);

    const handleChange = <K extends keyof AccountGroupFormState>(
        key: K,
        nextValue: AccountGroupFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const handleAssertionChange = (
        key: keyof AccountGroupAssertions,
        nextValue: boolean,
    ) => {
        setForm((prev) => ({
            ...prev,
            assertions: {
                ...prev.assertions,
                [key]: nextValue,
            },
        }));
    };

    const validate = (): boolean => {
        if (!form.code.trim()) {
            setValidationError(
                t("accountGroup.validation.codeRequired", { defaultValue: "کد الزامی است" }),
            );
            return false;
        }

        if (!form.title.trim()) {
            setValidationError(
                t("accountGroup.validation.titleRequired", { defaultValue: "نام الزامی است" }),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseNonNegativeInteger(form.sortOrder) === undefined) {
            setValidationError(
                t("accountGroup.validation.sortOrderInvalid", {
                    defaultValue: "ترتیب نمایش باید عدد صحیح نامنفی باشد",
                }),
            );
            return false;
        }

        if (
            form.documentsCount.trim() &&
            parseNonNegativeInteger(form.documentsCount) === undefined
        ) {
            setValidationError(
                t("accountGroup.validation.documentsCountInvalid", {
                    defaultValue: "تعداد مستندات باید عدد صحیح نامنفی باشد",
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

        const payload: AccountGroupNodeCreate | AccountGroupNodeUpdate = {
            code: form.code.trim(),
            title: form.title.trim(),
            parentId: form.parentId,
            status: form.status,
            sortOrder: parseNonNegativeInteger(form.sortOrder),
            description: normalizeOptionalText(form.description),
            importance: form.importance,
            reasonableAssurance: form.reasonableAssurance,
            effectiveDate: normalizeOptionalText(form.effectiveDate),
            documentsCount: parseNonNegativeInteger(form.documentsCount) ?? 0,
            assertions: form.assertions,
        };

        if (mode === "create") {
            await onSubmit({
                ...payload,
                objectives: [],
                accountRanges: [],
                risks: [],
            } as AccountGroupNodeCreate);
            return;
        }

        await onSubmit(payload);
    };

    const renderGeneralTab = () => (
        <div style={FORM_GRID_STYLE}>
            <FormField label={t("accountGroup.fields.code", { defaultValue: "کد" })} required>
                <Input
                    value={form.code}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("code", readInputValue(event))}
                />
            </FormField>

            <FormField label={t("accountGroup.fields.name", { defaultValue: "نام" })} required>
                <Input
                    value={form.title}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("title", readInputValue(event))}
                />
            </FormField>

            <FormField label={t("accountGroup.fields.parent", { defaultValue: "والد" })}>
                <Select
                    disabled={readOnly || busy}
                    onChange={(event) => {
                        const nextValue = readSelectedDataValue(event, form.parentId ?? "");
                        handleChange("parentId", nextValue || null);
                    }}
                >
                    <Option data-value="" selected={!form.parentId}>
                        {t("common.none", { defaultValue: "ندارد" })}
                    </Option>
                    {allItems
                        .filter((item) => item.id !== value?.id)
                        .map((item) => (
                            <Option
                                key={item.id}
                                data-value={item.id}
                                selected={form.parentId === item.id}
                            >
                                {`${item.code} - ${item.title}`}
                            </Option>
                        ))}
                </Select>
            </FormField>

            <FormField label={t("accountGroup.fields.status", { defaultValue: "وضعیت" })}>
                <Select
                    disabled={readOnly || busy}
                    onChange={(event) => {
                        const nextValue = readSelectedDataValue(event, form.status);
                        handleChange("status", nextValue as AccountGroupStatus);
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

            <FormField label={t("accountGroup.fields.sortOrder", { defaultValue: "ترتیب نمایش" })}>
                <Input
                    value={form.sortOrder}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                />
            </FormField>

            <FormField label={t("accountGroup.fields.importance", { defaultValue: "اهمیت" })}>
                <Select
                    disabled={readOnly || busy}
                    onChange={(event) => {
                        const nextValue = readSelectedDataValue(event, form.importance);
                        handleChange("importance", nextValue as AccountGroupImportance);
                    }}
                >
                    {(["low", "medium", "high", "critical"] as AccountGroupImportance[]).map(
                        (importance) => (
                            <Option
                                key={importance}
                                data-value={importance}
                                selected={form.importance === importance}
                            >
                                {resolveImportanceLabel(importance, t)}
                            </Option>
                        ),
                    )}
                </Select>
            </FormField>

            <FormField
                label={t("accountGroup.fields.reasonableAssurance", {
                    defaultValue: "اطمینان معقول",
                })}
            >
                <Select
                    disabled={readOnly || busy}
                    onChange={(event) => {
                        const nextValue = readSelectedDataValue(
                            event,
                            form.reasonableAssurance ? "true" : "false",
                        );
                        handleChange("reasonableAssurance", nextValue === "true");
                    }}
                >
                    <Option data-value="true" selected={form.reasonableAssurance}>
                        {t("common.yes", { defaultValue: "بله" })}
                    </Option>
                    <Option data-value="false" selected={!form.reasonableAssurance}>
                        {t("common.no", { defaultValue: "خیر" })}
                    </Option>
                </Select>
            </FormField>

            <FormField
                label={t("accountGroup.fields.effectiveDate", { defaultValue: "تاریخ اعتبار" })}
            >
                <DatePicker
                    value={form.effectiveDate}
                    valueFormat={DATE_VALUE_FORMAT}
                    displayFormat={DATE_DISPLAY_FORMAT}
                    primaryCalendarType="Persian"
                    disabled={readOnly || busy}
                    placeholder={t("organization.fields.datePlaceholder", {
                        defaultValue: "سال/ماه/روز",
                    })}
                    onChange={(event) =>
                        handleChange("effectiveDate", readDatePickerValue(event))
                    }
                />
            </FormField>

            <FormField label={t("accountGroup.fields.documents", { defaultValue: "مستندات" })}>
                <Input
                    value={form.documentsCount}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("documentsCount", readInputValue(event))}
                />
            </FormField>

            <FormField
                label={t("accountGroup.fields.description", { defaultValue: "شرح" })}
                fullWidth
            >
                <TextArea
                    rows={4}
                    value={form.description}
                    disabled={readOnly || busy}
                    onInput={(event) => handleChange("description", readInputValue(event))}
                />
            </FormField>

            <FormField
                label={t("accountGroup.sections.assertions", { defaultValue: "ادعاها" })}
                fullWidth
            >
                <div style={CHECKBOX_GRID_STYLE}>
                    <CheckBox
                        text={t("accountGroup.assertions.existence", {
                            defaultValue: "وجود داشتن",
                        })}
                        checked={form.assertions.existence}
                        disabled={readOnly || busy}
                        onChange={(event) =>
                            handleAssertionChange("existence", readCheckedValue(event))
                        }
                    />
                    <CheckBox
                        text={t("accountGroup.assertions.completeness", {
                            defaultValue: "کامل بودن",
                        })}
                        checked={form.assertions.completeness}
                        disabled={readOnly || busy}
                        onChange={(event) =>
                            handleAssertionChange("completeness", readCheckedValue(event))
                        }
                    />
                    <CheckBox
                        text={t("accountGroup.assertions.valuation", {
                            defaultValue: "ارزشگذاری",
                        })}
                        checked={form.assertions.valuation}
                        disabled={readOnly || busy}
                        onChange={(event) =>
                            handleAssertionChange("valuation", readCheckedValue(event))
                        }
                    />
                    <CheckBox
                        text={t("accountGroup.assertions.disclosure", { defaultValue: "افشا" })}
                        checked={form.assertions.disclosure}
                        disabled={readOnly || busy}
                        onChange={(event) =>
                            handleAssertionChange("disclosure", readCheckedValue(event))
                        }
                    />
                </div>
            </FormField>
        </div>
    );

    const renderTabBody = () => {
        if (activeTab === "general") {
            return renderGeneralTab();
        }

        if (activeTab === "objectives") {
            return (
                <TablePlaceholder
                    title={t("accountGroup.tabs.objectives", { defaultValue: "اهداف" })}
                    columns={[
                        t("accountGroup.fields.name", { defaultValue: "نام" }),
                        t("accountGroup.fields.description", { defaultValue: "شرح" }),
                    ]}
                    rows={(value?.objectives ?? []).map((objective) => [
                        objective.title,
                        objective.description ?? "",
                    ])}
                />
            );
        }

        if (activeTab === "accounts") {
            return (
                <TablePlaceholder
                    title={t("accountGroup.tabs.accounts", { defaultValue: "حساب‌های معین" })}
                    columns={[
                        t("accountGroup.fields.fromAccount", { defaultValue: "از" }),
                        t("accountGroup.fields.toAccount", { defaultValue: "تا" }),
                        t("accountGroup.fields.description", { defaultValue: "شرح" }),
                    ]}
                    rows={(value?.accountRanges ?? []).map((range) => [
                        range.fromAccount,
                        range.toAccount,
                        range.description ?? "",
                    ])}
                />
            );
        }

        return (
            <TablePlaceholder
                title={t("accountGroup.tabs.risks", { defaultValue: "ریسک‌ها" })}
                columns={[
                    t("accountGroup.fields.name", { defaultValue: "نام" }),
                    t("accountGroup.fields.description", { defaultValue: "شرح" }),
                    t("accountGroup.fields.source", { defaultValue: "منبع" }),
                ]}
                rows={(value?.risks ?? []).map((risk) => [
                    risk.name,
                    risk.description ?? "",
                    risk.source ?? "",
                ])}
            />
        );
    };

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">
                        {headerTitle ||
                            t("accountGroup.object.title", {
                                defaultValue: "گروه حساب‌ها",
                            })}
                    </Title>
                </div>
                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("accountGroup.fields.parent", { defaultValue: "والد" })}
                        value={headerParent}
                    />
                    <HeaderItem
                        label={t("accountGroup.fields.status", { defaultValue: "وضعیت" })}
                        value={headerStatus}
                    />
                    <HeaderItem
                        label={t("accountGroup.fields.importance", { defaultValue: "اهمیت" })}
                        value={headerImportance}
                    />
                    <HeaderItem
                        label={t("accountGroup.fields.reasonableAssurance", {
                            defaultValue: "اطمینان معقول",
                        })}
                        value={headerReasonableAssurance}
                    />
                </div>
            </div>

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

            <AccountGroupTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div style={BODY_STYLE}>{renderTabBody()}</div>

            <div style={FOOTER_STYLE}>
                {readOnly ? (
                    <Button
                        design="Emphasized"
                        disabled={busy}
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
                    {t("common.cancel", { defaultValue: "انصراف" })}
                </Button>
            </div>
        </div>
    );
}
