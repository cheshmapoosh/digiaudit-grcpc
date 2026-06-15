import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
    BusyIndicator,
    Button,
    DatePicker,
    Dialog,
    Input,
    Label,
    List,
    ListItemCustom,
    MessageStrip,
    Text,
    TextArea,
} from "@ui5/webcomponents-react";

import type {
    AttachExistingControlRequest,
    ControlSummary,
} from "../domain/control.model";
import { controlService } from "../service/control.service";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { toEnglishDigits } from "@/shared/utils/date.utils";

interface AttachControlFormState {
    ownerName: string;
    validFrom: string;
    validTo: string;
    sortOrder: string;
    operationPeriod: string;
    testMethod: string;
    testPlan: string;
}

export interface AttachControlDialogProps {
    open: boolean;
    busy?: boolean;
    error?: string | null;
    subProcessTitle?: string | null;
    subProcessId?: string | null;
    excludedControlIds?: string[];
    onErrorClose?: () => void;
    onClose: () => void;
    onSubmit: (payload: AttachExistingControlRequest) => Promise<void> | void;
}

const EMPTY_FORM: AttachControlFormState = {
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

function normalize(value: string | null | undefined): string {
    return (value ?? "").trim().toLocaleLowerCase("fa");
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

function mapLoadError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
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

export default function AttachControlDialog({
    open,
    busy = false,
    error,
    subProcessTitle,
    subProcessId,
    excludedControlIds = [],
    onErrorClose,
    onClose,
    onSubmit,
}: AttachControlDialogProps) {
    const { t } = useTranslation();
    const [controls, setControls] = useState<ControlSummary[]>([]);
    const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");
    const [form, setForm] = useState<AttachControlFormState>(EMPTY_FORM);
    const [loadingControls, setLoadingControls] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    const excludedControlIdSet = useMemo(
        () => new Set(excludedControlIds),
        [excludedControlIds],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        void controlService
            .list()
            .then(setControls)
            .catch((loadFailure: unknown) => {
                setLoadError(
                    mapLoadError(
                        loadFailure,
                        t("control.errors.loadControls", {
                            defaultValue: "خطا در بارگذاری کنترل‌ها",
                        }),
                    ),
                );
            })
            .finally(() => setLoadingControls(false));
    }, [open, t]);

    const filteredControls = useMemo(() => {
        const query = normalize(searchText);

        if (!query) {
            return controls;
        }

        return controls.filter((control) => {
            return (
                normalize(control.code).includes(query) ||
                normalize(control.name).includes(query) ||
                normalize(control.description).includes(query)
            );
        });
    }, [controls, searchText]);

    const handleChange = <K extends keyof AttachControlFormState>(
        key: K,
        value: AttachControlFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const validate = (): boolean => {
        if (!selectedControlId) {
            setValidationError(
                t("control.validation.controlRequired", {
                    defaultValue: "انتخاب کنترل الزامی است",
                }),
            );
            return false;
        }

        if (excludedControlIdSet.has(selectedControlId)) {
            setValidationError(
                t("control.validation.duplicateControl", {
                    defaultValue: "این کنترل قبلاً به این زیر فرآیند متصل شده است.",
                }),
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
        if (!validate() || !selectedControlId) {
            return;
        }

        await onSubmit({
            controlId: selectedControlId,
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
            accessibleName={t("control.attach.title", { defaultValue: "اتصال کنترل موجود" })}
            style={{ width: "90vw", maxWidth: "90vw" }}
            onClose={onClose}
            footer={
                <>
                    <Button
                        design="Emphasized"
                        disabled={busy || loadingControls}
                        onClick={() => void handleSubmit()}
                    >
                        {t("common.save", { defaultValue: "ذخیره" })}
                    </Button>
                    <Button design="Transparent" disabled={busy} onClick={onClose}>
                        {t("common.cancel", { defaultValue: "انصراف" })}
                    </Button>
                </>
            }
        >
            <ModalDialogHeader
                title={t("control.attach.title", { defaultValue: "اتصال کنترل موجود" })}
                onClose={onClose}
            />

            <div
                style={{
                    display: "grid",
                    gridTemplateRows: "auto minmax(10rem, 18rem) auto",
                    gap: "1rem",
                    maxHeight: "calc(92vh - 9rem)",
                    overflow: "auto",
                    padding: "0.25rem",
                }}
            >
                <div style={{ display: "grid", gap: "0.75rem" }}>
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

                    {loadError ? (
                        <MessageStrip design="Negative" onClose={() => setLoadError(null)}>
                            {loadError}
                        </MessageStrip>
                    ) : null}

                    {validationError ? (
                        <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
                            {validationError}
                        </MessageStrip>
                    ) : null}

                    <FormField
                        label={t("control.attach.searchLabel", {
                            defaultValue: "جستجوی کنترل",
                        })}
                    >
                        <Input
                            value={searchText}
                            disabled={busy || loadingControls}
                            placeholder={t("control.attach.searchPlaceholder", {
                                defaultValue: "کد، نام یا شرح کنترل",
                            })}
                            onInput={(event) => setSearchText(readInputValue(event))}
                        />
                    </FormField>
                </div>

                <div
                    style={{
                        minHeight: 0,
                        overflow: "auto",
                        border: "1px solid var(--sapGroup_ContentBorderColor)",
                        background: "var(--sapList_Background)",
                    }}
                >
                    {loadingControls ? <BusyIndicator active delay={0} /> : null}

                    <List>
                        {!loadingControls && filteredControls.length === 0 ? (
                            <ListItemCustom>
                                <div style={{ padding: "0.75rem" }}>
                                    <Text>
                                        {t("control.attach.empty", {
                                            defaultValue: "کنترلی برای اتصال وجود ندارد",
                                        })}
                                    </Text>
                                </div>
                            </ListItemCustom>
                        ) : (
                            filteredControls.map((control) => {
                                const selected = control.id === selectedControlId;
                                const duplicate = excludedControlIdSet.has(control.id);

                                return (
                                    <ListItemCustom key={control.id}>
                                        <button
                                            type="button"
                                            disabled={duplicate}
                                            onClick={() => {
                                                if (!duplicate) {
                                                    setSelectedControlId(control.id);
                                                }
                                            }}
                                            style={{
                                                width: "100%",
                                                textAlign: "start",
                                                border: selected
                                                    ? "1px solid var(--sapSelectedColor)"
                                                    : "1px solid var(--sapGroup_ContentBorderColor)",
                                                padding: "0.75rem",
                                                background: selected
                                                    ? "var(--sapList_SelectionBackgroundColor)"
                                                    : "var(--sapGroup_ContentBackground)",
                                                cursor: duplicate ? "not-allowed" : "pointer",
                                                display: "grid",
                                                gap: "0.35rem",
                                                fontFamily: "inherit",
                                                fontSize: "inherit",
                                                color: duplicate
                                                    ? "var(--sapContent_DisabledTextColor)"
                                                    : "inherit",
                                            }}
                                        >
                                            <strong>{`${control.code} - ${control.name}`}</strong>
                                            {duplicate ? (
                                                <span style={{ color: "var(--sapCriticalTextColor)" }}>
                                                    {t("control.attach.alreadyAttached", {
                                                        defaultValue: "قبلاً متصل شده است",
                                                    })}
                                                </span>
                                            ) : null}
                                            {control.description ? (
                                                <span
                                                    style={{
                                                        color: "var(--sapContent_LabelColor)",
                                                        overflowWrap: "anywhere",
                                                    }}
                                                >
                                                    {control.description}
                                                </span>
                                            ) : null}
                                        </button>
                                    </ListItemCustom>
                                );
                            })
                        )}
                    </List>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "1rem",
                    }}
                >
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
