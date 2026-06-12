import { useState, type ReactNode } from "react";
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
    TextArea,
} from "@ui5/webcomponents-react";

import type {
    ControlAutomationType,
    ControlImportance,
    ControlNature,
    CreateControlAndAssignRequest,
} from "../domain/control.model";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { toEnglishDigits } from "@/shared/utils/date.utils";

interface CreateControlFormState {
    code: string;
    name: string;
    description: string;
    controlClass: string;
    controlNature: "" | ControlNature;
    automationType: "" | ControlAutomationType;
    importance: "" | ControlImportance;
    objective: string;
    ownerName: string;
    validFrom: string;
    validTo: string;
    sortOrder: string;
    operationPeriod: string;
    testMethod: string;
    testPlan: string;
}

export interface CreateControlDialogProps {
    open: boolean;
    busy?: boolean;
    error?: string | null;
    subProcessTitle?: string | null;
    subProcessId?: string | null;
    onErrorClose?: () => void;
    onClose: () => void;
    onSubmit: (payload: CreateControlAndAssignRequest) => Promise<void> | void;
}

const EMPTY_FORM: CreateControlFormState = {
    code: "",
    name: "",
    description: "",
    controlClass: "",
    controlNature: "",
    automationType: "",
    importance: "",
    objective: "",
    ownerName: "",
    validFrom: "",
    validTo: "",
    sortOrder: "",
    operationPeriod: "",
    testMethod: "",
    testPlan: "",
};

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "d MMMM y";

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

function resolveSubProcessLabel(
    title?: string | null,
    id?: string | null,
): string {
    return title?.trim() || id?.trim() || "-";
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
        <div
            style={{
                display: "grid",
                gap: "0.35rem",
                gridColumn: fullWidth ? "1 / -1" : undefined,
            }}
        >
            <Label showColon>{label}</Label>
            {children}
        </div>
    );
}

export default function CreateControlDialog({
    open,
    busy = false,
    error,
    subProcessTitle,
    subProcessId,
    onErrorClose,
    onClose,
    onSubmit,
}: CreateControlDialogProps) {
    const { t } = useTranslation();
    const [form, setForm] = useState<CreateControlFormState>(EMPTY_FORM);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleChange = <K extends keyof CreateControlFormState>(
        key: K,
        value: CreateControlFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const validate = (): boolean => {
        if (!form.code.trim()) {
            setValidationError(
                t("control.validation.codeRequired", { defaultValue: "کد کنترل الزامی است" }),
            );
            return false;
        }

        if (!form.name.trim()) {
            setValidationError(
                t("control.validation.nameRequired", { defaultValue: "نام کنترل الزامی است" }),
            );
            return false;
        }

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

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        await onSubmit({
            code: form.code.trim(),
            name: form.name.trim(),
            description: normalizeOptionalText(form.description),
            controlClass: normalizeOptionalText(form.controlClass),
            controlNature: form.controlNature || undefined,
            automationType: form.automationType || undefined,
            importance: form.importance || undefined,
            objective: normalizeOptionalText(form.objective),
            ownerId: undefined,
            ownerName: normalizeOptionalText(form.ownerName),
            validFrom: normalizeOptionalText(form.validFrom),
            validTo: normalizeOptionalText(form.validTo),
            sortOrder: parseSortOrder(form.sortOrder),
            operationPeriod: normalizeOptionalText(form.operationPeriod),
            testMethod: normalizeOptionalText(form.testMethod),
            testPlan: normalizeOptionalText(form.testPlan),
        });
    };

    return (
        <Dialog
            open={open}
            accessibleName={t("control.create.title", { defaultValue: "تعریف کنترل جدید" })}
            style={{ width: "64rem", maxWidth: "96vw" }}
            onClose={onClose}
            footer={
                <>
                    <Button design="Emphasized" disabled={busy} onClick={() => void handleSubmit()}>
                        {t("common.save", { defaultValue: "ذخیره" })}
                    </Button>
                    <Button design="Transparent" disabled={busy} onClick={onClose}>
                        {t("common.cancel", { defaultValue: "انصراف" })}
                    </Button>
                </>
            }
        >
            <ModalDialogHeader
                title={t("control.create.title", { defaultValue: "تعریف کنترل جدید" })}
                onClose={onClose}
            />

            <div
                style={{
                    display: "grid",
                    gap: "1rem",
                    maxHeight: "calc(92vh - 9rem)",
                    overflow: "auto",
                    padding: "0.25rem",
                }}
            >
                <div
                    style={{
                        border: "1px solid var(--sapGroup_ContentBorderColor)",
                        background: "var(--sapGroup_ContentBackground)",
                        padding: "0.75rem",
                    }}
                >
                    <Label showColon>
                        {t("control.fields.parentSubProcess", { defaultValue: "زیر فرآیند" })}
                    </Label>{" "}
                    <span>{resolveSubProcessLabel(subProcessTitle, subProcessId)}</span>
                </div>

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

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "1rem",
                    }}
                >
                    <FormField label={t("control.fields.code", { defaultValue: "کد" })}>
                        <Input
                            value={form.code}
                            disabled={busy}
                            onInput={(event) => handleChange("code", readInputValue(event))}
                        />
                    </FormField>

                    <FormField label={t("control.fields.name", { defaultValue: "نام" })}>
                        <Input
                            value={form.name}
                            disabled={busy}
                            onInput={(event) => handleChange("name", readInputValue(event))}
                        />
                    </FormField>

                    <FormField
                        label={t("control.fields.controlClass", {
                            defaultValue: "طبقه کنترل",
                        })}
                    >
                        <Input
                            value={form.controlClass}
                            disabled={busy}
                            onInput={(event) => handleChange("controlClass", readInputValue(event))}
                        />
                    </FormField>

                    <FormField
                        label={t("control.fields.controlNature", {
                            defaultValue: "ماهیت کنترل",
                        })}
                    >
                        <Select
                            disabled={busy}
                            onChange={(event) =>
                                handleChange(
                                    "controlNature",
                                    readSelectedDataValue(event, form.controlNature) as
                                        | ""
                                        | ControlNature,
                                )
                            }
                        >
                            <Option data-value="" selected={form.controlNature === ""}>
                                {t("common.none", { defaultValue: "ندارد" })}
                            </Option>
                            <Option
                                data-value="preventive"
                                selected={form.controlNature === "preventive"}
                            >
                                {t("control.nature.preventive", { defaultValue: "پیشگیرانه" })}
                            </Option>
                            <Option
                                data-value="detective"
                                selected={form.controlNature === "detective"}
                            >
                                {t("control.nature.detective", { defaultValue: "کشفی" })}
                            </Option>
                        </Select>
                    </FormField>

                    <FormField
                        label={t("control.fields.automationType", {
                            defaultValue: "نوع اجرا",
                        })}
                    >
                        <Select
                            disabled={busy}
                            onChange={(event) =>
                                handleChange(
                                    "automationType",
                                    readSelectedDataValue(event, form.automationType) as
                                        | ""
                                        | ControlAutomationType,
                                )
                            }
                        >
                            <Option data-value="" selected={form.automationType === ""}>
                                {t("common.none", { defaultValue: "ندارد" })}
                            </Option>
                            <Option data-value="manual" selected={form.automationType === "manual"}>
                                {t("control.automation.manual", { defaultValue: "دستی" })}
                            </Option>
                            <Option data-value="system" selected={form.automationType === "system"}>
                                {t("control.automation.system", { defaultValue: "سیستمی" })}
                            </Option>
                            <Option
                                data-value="semiManualSystem"
                                selected={form.automationType === "semiManualSystem"}
                            >
                                {t("control.automation.semiManualSystem", {
                                    defaultValue: "نیمه‌دستی/سیستمی",
                                })}
                            </Option>
                        </Select>
                    </FormField>

                    <FormField label={t("control.fields.importance", { defaultValue: "اهمیت" })}>
                        <Select
                            disabled={busy}
                            onChange={(event) =>
                                handleChange(
                                    "importance",
                                    readSelectedDataValue(event, form.importance) as
                                        | ""
                                        | ControlImportance,
                                )
                            }
                        >
                            <Option data-value="" selected={form.importance === ""}>
                                {t("common.none", { defaultValue: "ندارد" })}
                            </Option>
                            <Option data-value="low" selected={form.importance === "low"}>
                                {t("control.importance.low", { defaultValue: "کم" })}
                            </Option>
                            <Option data-value="medium" selected={form.importance === "medium"}>
                                {t("control.importance.medium", { defaultValue: "متوسط" })}
                            </Option>
                            <Option data-value="high" selected={form.importance === "high"}>
                                {t("control.importance.high", { defaultValue: "زیاد" })}
                            </Option>
                            <Option
                                data-value="critical"
                                selected={form.importance === "critical"}
                            >
                                {t("control.importance.critical", { defaultValue: "بحرانی" })}
                            </Option>
                        </Select>
                    </FormField>

                    <FormField label={t("control.fields.ownerName", { defaultValue: "مسئول" })}>
                        <Input
                            value={form.ownerName}
                            disabled={busy}
                            onInput={(event) => handleChange("ownerName", readInputValue(event))}
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
                        label={t("control.fields.operationPeriod", {
                            defaultValue: "دوره عملیات",
                        })}
                    >
                        <Input
                            value={form.operationPeriod}
                            disabled={busy}
                            onInput={(event) =>
                                handleChange("operationPeriod", readInputValue(event))
                            }
                        />
                    </FormField>

                    <FormField
                        label={t("control.fields.testMethod", {
                            defaultValue: "روش آزمون",
                        })}
                    >
                        <Input
                            value={form.testMethod}
                            disabled={busy}
                            onInput={(event) => handleChange("testMethod", readInputValue(event))}
                        />
                    </FormField>

                    <FormField
                        label={t("control.fields.objective", { defaultValue: "هدف" })}
                        fullWidth
                    >
                        <TextArea
                            rows={3}
                            value={form.objective}
                            disabled={busy}
                            onInput={(event) => handleChange("objective", readInputValue(event))}
                        />
                    </FormField>

                    <FormField
                        label={t("control.fields.description", { defaultValue: "شرح" })}
                        fullWidth
                    >
                        <TextArea
                            rows={3}
                            value={form.description}
                            disabled={busy}
                            onInput={(event) => handleChange("description", readInputValue(event))}
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
            </div>
        </Dialog>
    );
}
