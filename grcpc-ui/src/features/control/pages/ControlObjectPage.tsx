import {
    Fragment,
    useCallback,
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
    ControlAssignmentStatus,
    ControlDetails,
    UpdateControlAssignmentRequest,
} from "../domain/control.model";
import {
    formatPersianDate,
    formatPersianDateTime,
    toEnglishDigits,
} from "@/shared/utils/date.utils";
import ControlAccountGroupsTab from "../components/tabs/ControlAccountGroupsTab";
import ControlDocumentsTab from "../components/tabs/ControlDocumentsTab";
import ControlRegulationsTab from "../components/tabs/ControlRegulationsTab";
import ControlRisksTab from "../components/tabs/ControlRisksTab";
import type { DocumentBeforeParentSubmitHandler } from "@/features/document";

export type ControlObjectMode = "view" | "edit";

type ControlTabKey =
    | "general"
    | "regulations"
    | "risks"
    | "accountGroups"
    | "documents";

const CONTROL_TABS: ControlTabKey[] = [
    "general",
    "regulations",
    "risks",
    "accountGroups",
    "documents",
];

interface ControlAssignmentFormState {
    ownerName: string;
    validFrom: string;
    validTo: string;
    sortOrder: string;
    operationPeriod: string;
    testMethod: string;
    testPlan: string;
    assignmentStatus: ControlAssignmentStatus;
}

export interface ControlObjectPageProps {
    mode: ControlObjectMode;
    value: ControlDetails;
    busy?: boolean;
    error?: string | null;
    documentTempSessionId?: string;
    onErrorClose?: () => void;
    onSubmit: (payload: UpdateControlAssignmentRequest) => Promise<void> | void;
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

const CONTROL_TAB_CONTAINER_CLASS = "controlObjectTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${CONTROL_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${CONTROL_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${CONTROL_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${CONTROL_TAB_CONTAINER_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
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

const DETAIL_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(8rem, max-content) minmax(0, 1fr)",
    gap: "0.6rem 1rem",
    alignItems: "start",
};

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "d MMMM y";

function toFormState(value: ControlDetails): ControlAssignmentFormState {
    return {
        ownerName: value.ownerName ?? "",
        validFrom: toEnglishDigits(value.validFrom ?? ""),
        validTo: toEnglishDigits(value.validTo ?? ""),
        sortOrder: value.sortOrder?.toString() ?? "",
        operationPeriod: value.operationPeriod ?? "",
        testMethod: value.testMethod ?? "",
        testPlan: value.testPlan ?? "",
        assignmentStatus: value.assignmentStatus,
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

function readSelectedTabKey(event: unknown): ControlTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return (selectedTab?.getAttribute("data-tab-key") as ControlTabKey | null) ?? null;
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
    fullWidth = false,
    children,
}: {
    label: string;
    fullWidth?: boolean;
    children: ReactNode;
}) {
    return (
        <div style={{ ...FIELD_STYLE, ...(fullWidth ? FULL_WIDTH_STYLE : undefined) }}>
            <Label showColon>{label}</Label>
            {children}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
    return (
        <>
            <Label showColon wrappingType="None">{label}</Label>
            <span
                style={{
                    minWidth: 0,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: 1.7,
                }}
            >
                {value || "-"}
            </span>
        </>
    );
}

function resolveStatusLabel(
    status: ControlAssignmentStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function resolveControlStatusLabel(
    status: ControlDetails["status"],
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function formatValidityRange(validFrom?: string | null, validTo?: string | null): string {
    if (!validFrom && !validTo) {
        return "-";
    }

    return `${formatPersianDate(validFrom)} - ${formatPersianDate(validTo)}`;
}

function resolveTabLabel(
    tab: ControlTabKey,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<ControlTabKey, string> = {
        general: t("control.tabs.general", { defaultValue: "اطلاعات کلی" }),
        regulations: t("control.tabs.regulations", { defaultValue: "قوانین" }),
        risks: t("control.tabs.risks", { defaultValue: "ریسک‌ها" }),
        accountGroups: t("control.tabs.accountGroups", { defaultValue: "گروه حساب‌ها" }),
        documents: t("control.tabs.documents", { defaultValue: "مستندات" }),
    };

    return labels[tab];
}

function ControlTabs({
    activeTab,
    onChange,
}: {
    activeTab: ControlTabKey;
    onChange: (tab: ControlTabKey) => void;
}) {
    const { t } = useTranslation();

    return (
        <TabContainer
            className={CONTROL_TAB_CONTAINER_CLASS}
            onTabSelect={(event) => {
                const nextTab = readSelectedTabKey(event);
                if (nextTab) {
                    onChange(nextTab);
                }
            }}
            style={TAB_CONTAINER_STYLE}
        >
            {CONTROL_TABS.map((tab, index) => (
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

export default function ControlObjectPage({
    mode,
    value,
    busy = false,
    error,
    documentTempSessionId,
    onErrorClose,
    onSubmit,
    onCancel,
    onEdit,
}: ControlObjectPageProps) {
    const { t } = useTranslation();
    const readOnly = mode === "view";
    const [form, setForm] = useState<ControlAssignmentFormState>(() => toFormState(value));
    const [validationError, setValidationError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ControlTabKey>("general");
    const [hasPendingDocumentUploads, setHasPendingDocumentUploads] = useState(false);
    const documentBeforeSubmitRef = useRef<DocumentBeforeParentSubmitHandler | null>(null);

    const handleChange = <K extends keyof ControlAssignmentFormState>(
        key: K,
        nextValue: ControlAssignmentFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const validate = (): boolean => {
        if (form.sortOrder.trim() && parseSortOrder(form.sortOrder) === undefined) {
            setValidationError(
                t("control.validation.sortOrderInvalid", {
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

        const payload: UpdateControlAssignmentRequest = {
            ownerName: normalizeOptionalText(form.ownerName),
            validFrom: normalizeOptionalText(form.validFrom),
            validTo: normalizeOptionalText(form.validTo),
            sortOrder: parseSortOrder(form.sortOrder),
            operationPeriod: normalizeOptionalText(form.operationPeriod),
            testMethod: normalizeOptionalText(form.testMethod),
            testPlan: normalizeOptionalText(form.testPlan),
            assignmentStatus: form.assignmentStatus || value.assignmentStatus,
        };

        await onSubmit(payload);
    };

    const renderViewContent = () => (
        <div style={{ display: "grid", gap: "1rem" }}>
            <Title level="H5">
                {t("control.sections.assignmentInfo", {
                    defaultValue: "اطلاعات اتصال کنترل",
                })}
            </Title>

            <div style={DETAIL_GRID_STYLE}>
                <DetailRow label={t("control.fields.code", { defaultValue: "کد" })} value={value.code} />
                <DetailRow label={t("control.fields.name", { defaultValue: "نام" })} value={value.name} />
                <DetailRow
                    label={t("control.fields.controlClass", { defaultValue: "طبقه کنترل" })}
                    value={value.controlClass}
                />
                <DetailRow
                    label={t("control.fields.controlNature", { defaultValue: "ماهیت کنترل" })}
                    value={value.controlNature ? t(`control.nature.${value.controlNature}`) : undefined}
                />
                <DetailRow
                    label={t("control.fields.automationType", { defaultValue: "نوع اجرا" })}
                    value={
                        value.automationType
                            ? t(`control.automation.${value.automationType}`)
                            : undefined
                    }
                />
                <DetailRow
                    label={t("control.fields.importance", { defaultValue: "اهمیت" })}
                    value={value.importance ? t(`control.importance.${value.importance}`) : undefined}
                />
                <DetailRow
                    label={t("control.fields.ownerName", { defaultValue: "مسئول" })}
                    value={value.ownerName}
                />
                <DetailRow
                    label={t("control.fields.validity", { defaultValue: "اعتبار" })}
                    value={formatValidityRange(value.validFrom, value.validTo)}
                />
                <DetailRow
                    label={t("control.fields.sortOrder", { defaultValue: "ترتیب نمایش" })}
                    value={value.sortOrder?.toString()}
                />
                <DetailRow
                    label={t("control.fields.operationPeriod", { defaultValue: "دوره عملیات" })}
                    value={value.operationPeriod}
                />
                <DetailRow
                    label={t("control.fields.testMethod", { defaultValue: "روش آزمون" })}
                    value={value.testMethod}
                />
                <DetailRow
                    label={t("control.fields.testPlan", { defaultValue: "برنامه آزمون" })}
                    value={value.testPlan}
                />
                <DetailRow
                    label={t("control.fields.assignmentStatus", { defaultValue: "وضعیت اتصال" })}
                    value={resolveStatusLabel(value.assignmentStatus, t)}
                />
                <DetailRow
                    label={t("control.fields.status", { defaultValue: "وضعیت کنترل" })}
                    value={resolveControlStatusLabel(value.status, t)}
                />
                <DetailRow
                    label={t("control.fields.objective", { defaultValue: "هدف" })}
                    value={value.objective}
                />
                <DetailRow
                    label={t("control.fields.description", { defaultValue: "شرح" })}
                    value={value.description}
                />
                <DetailRow
                    label={t("control.fields.updatedAt", { defaultValue: "آخرین بروزرسانی" })}
                    value={formatPersianDateTime(value.updatedAt)}
                />
            </div>
        </div>
    );

    const renderEditContent = () => (
        <>
            <Title level="H5">
                {t("control.sections.assignmentInfo", {
                    defaultValue: "اطلاعات اتصال کنترل",
                })}
            </Title>

            <div style={{ height: "0.75rem" }} />

            <div style={FORM_GRID_STYLE}>
                <FormField label={t("control.fields.ownerName", { defaultValue: "مسئول" })}>
                    <Input
                        value={form.ownerName}
                        disabled={busy}
                        onInput={(event) => handleChange("ownerName", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.assignmentStatus", {
                        defaultValue: "وضعیت اتصال",
                    })}
                >
                    <Select
                        disabled={busy}
                        onChange={(event) => {
                            const nextValue = readSelectedDataValue(event, form.assignmentStatus);
                            handleChange("assignmentStatus", nextValue as ControlAssignmentStatus);
                        }}
                    >
                        <Option data-value="active" selected={form.assignmentStatus === "active"}>
                            {t("common.active", { defaultValue: "فعال" })}
                        </Option>
                        <Option data-value="inactive" selected={form.assignmentStatus === "inactive"}>
                            {t("common.inactive", { defaultValue: "غیرفعال" })}
                        </Option>
                    </Select>
                </FormField>

                <FormField label={t("control.fields.validFrom", { defaultValue: "اعتبار از" })}>
                    <DatePicker
                        value={form.validFrom}
                        valueFormat={DATE_VALUE_FORMAT}
                        formatPattern={DATE_DISPLAY_FORMAT}
                        disabled={busy}
                        onChange={(event) => handleChange("validFrom", readDatePickerValue(event))}
                    />
                </FormField>

                <FormField label={t("control.fields.validTo", { defaultValue: "اعتبار تا" })}>
                    <DatePicker
                        value={form.validTo}
                        valueFormat={DATE_VALUE_FORMAT}
                        formatPattern={DATE_DISPLAY_FORMAT}
                        disabled={busy}
                        onChange={(event) => handleChange("validTo", readDatePickerValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.sortOrder", { defaultValue: "ترتیب نمایش" })}
                >
                    <Input
                        value={form.sortOrder}
                        disabled={busy}
                        onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.operationPeriod", {
                        defaultValue: "دوره عملیات",
                    })}
                >
                    <Input
                        value={form.operationPeriod}
                        disabled={busy}
                        onInput={(event) => handleChange("operationPeriod", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.testMethod", { defaultValue: "روش آزمون" })}
                    fullWidth
                >
                    <TextArea
                        rows={3}
                        value={form.testMethod}
                        disabled={busy}
                        onInput={(event) => handleChange("testMethod", readInputValue(event))}
                    />
                </FormField>

                <FormField
                    label={t("control.fields.testPlan", { defaultValue: "برنامه آزمون" })}
                    fullWidth
                >
                    <TextArea
                        rows={4}
                        value={form.testPlan}
                        disabled={busy}
                        onInput={(event) => handleChange("testPlan", readInputValue(event))}
                    />
                </FormField>
            </div>
        </>
    );

    const renderGeneralTab = () => (
        <>
            {mode === "view" ? renderViewContent() : renderEditContent()}
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

    const renderTabContent = () => {
        switch (activeTab) {
            case "regulations":
                return (
                    <ControlRegulationsTab
                        controlAssignmentId={value.controlAssignmentId}
                        readOnly={readOnly}
                    />
                );
            case "risks":
                return (
                    <ControlRisksTab
                        controlAssignmentId={value.controlAssignmentId}
                        readOnly={readOnly}
                    />
                );
            case "accountGroups":
                return (
                    <ControlAccountGroupsTab
                        controlAssignmentId={value.controlAssignmentId}
                        readOnly={readOnly}
                    />
                );
            case "documents":
                return (
                    <ControlDocumentsTab
                        controlAssignmentId={value.controlAssignmentId}
                        tempSessionId={documentTempSessionId}
                        readOnly={readOnly}
                        onBeforeParentSubmitChange={handleDocumentBeforeParentSubmitChange}
                        onPendingUploadsChange={setHasPendingDocumentUploads}
                    />
                );
            case "general":
            default:
                return renderGeneralTab();
        }
    };

    return (
        <div style={ROOT_STYLE}>
            <div style={HEADER_STYLE}>
                <div style={HEADER_TITLE_STYLE}>
                    <Title level="H4">{`${value.code} - ${value.name}`}</Title>
                </div>

                <div style={HEADER_GRID_STYLE}>
                    <HeaderItem
                        label={t("control.fields.parentProcess", {
                            defaultValue: "فرآیند والد",
                        })}
                        value={value.parentProcessTitle}
                    />
                    <HeaderItem
                        label={t("control.fields.parentSubProcess", {
                            defaultValue: "زیر فرآیند",
                        })}
                        value={value.parentSubProcessTitle}
                    />
                    <HeaderItem
                        label={t("control.fields.validity", { defaultValue: "اعتبار" })}
                        value={formatValidityRange(value.validFrom, value.validTo)}
                    />
                    <HeaderItem
                        label={t("control.fields.status", { defaultValue: "وضعیت کنترل" })}
                        value={resolveControlStatusLabel(value.status, t)}
                    />
                </div>
            </div>

            <ControlTabs activeTab={activeTab} onChange={setActiveTab} />

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

            <div style={BODY_STYLE}>{renderTabContent()}</div>

            {renderFooterActions()}
        </div>
    );
}
