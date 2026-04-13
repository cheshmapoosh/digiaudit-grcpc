import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Bar,
    Button,
    DatePicker,
    Input,
    Label,
    MessageStrip,
    Option,
    Select,
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
    RegulationStatus,
    RegulationType,
} from "@/features/regulation";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";
import ParentPickerField from "@/shared/components/ParentPickerField";

export type RegulationObjectMode = "create" | "edit" | "view";

interface RegulationFormState {
    code: string;
    name: string;
    type: RegulationType;
    description: string;
    parentId: string | null;
    status: RegulationStatus;
    validFrom: string;
    validTo: string;
}

export interface RegulationObjectPageProps {
    mode: RegulationObjectMode;
    allItems: RegulationNode[];
    value: RegulationNode | null;
    busy?: boolean;
    error?: string | null;
    onSubmit: (payload: RegulationNodeCreate | RegulationNodeUpdate) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
}

function toFormState(
    value: RegulationNode | null,
    defaultParentId: string | null,
): RegulationFormState {
    return {
        code: value?.code ?? "",
        name: value?.name ?? "",
        type: value?.type ?? "regulation",
        description: value?.description ?? "",
        parentId: value?.parentId ?? defaultParentId,
        status: value?.status ?? "active",
        validFrom: value?.validFrom ?? "",
        validTo: value?.validTo ?? "",
    };
}

export default function RegulationObjectPage({
                                                   mode,
                                                   allItems,
                                                   value,
                                                   busy = false,
                                                   error,
                                                   onSubmit,
                                                   onCancel,
                                                   onEdit,
                                               }: RegulationObjectPageProps) {
    const { t } = useTranslation();

    const readOnly = mode === "view";
    const defaultParentId = value?.parentId ?? null;

    const [form, setForm] = useState<RegulationFormState>(() =>
        toFormState(value, defaultParentId),
    );
    const [validationError, setValidationError] = useState<string | null>(null);
    const [parentDialogOpen, setParentDialogOpen] = useState(false);

    const selectedParentName = useMemo(() => {
        if (!form.parentId) {
            return "";
        }

        return allItems.find((item) => item.id === form.parentId)?.name ?? "";
    }, [allItems, form.parentId]);

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
                t("regulation.validation.codeRequired", {
                    defaultValue: "کد الزامی است",
                }),
            );
            return false;
        }

        if (!form.name.trim()) {
            setValidationError(
                t("regulation.validation.nameRequired", {
                    defaultValue: "نام الزامی است",
                }),
            );
            return false;
        }

        if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
            setValidationError(
                t("regulation.validation.validRange", {
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

        const payload: RegulationNodeCreate | RegulationNodeUpdate = {
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
        <div style={{ display: "grid", gap: "1rem" }}>
            <Bar
                startContent={
                    <Title level="H4">
                        {mode === "create"
                            ? t("regulation.object.createTitle", {
                                defaultValue: "ایجاد قانون / مقرره",
                            })
                            : mode === "edit"
                                ? t("regulation.object.editTitle", {
                                    defaultValue: "ویرایش قانون / مقرره",
                                })
                                : t("regulation.object.viewTitle", {
                                    defaultValue: "جزئیات قانون / مقرره",
                                })}
                    </Title>
                }
                endContent={
                    <>
                        {mode === "view" ? (
                            <Button design="Emphasized" disabled={busy} onClick={onEdit}>
                                {t("common.edit", { defaultValue: "ویرایش" })}
                            </Button>
                        ) : (
                            <Button design="Emphasized" disabled={busy} onClick={handleSubmit}>
                                {t("common.save", { defaultValue: "ذخیره" })}
                            </Button>
                        )}

                        <Button design="Transparent" disabled={busy} onClick={onCancel}>
                            {t("common.cancel", { defaultValue: "انصراف" })}
                        </Button>
                    </>
                }
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

            <div
                style={{
                    display: "grid",
                    gap: "1rem",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
            >
                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("regulation.fields.code", { defaultValue: "کد" })}</Label>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", event.target.value)}
                    />
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("regulation.fields.name", { defaultValue: "نام" })}</Label>
                    <Input
                        value={form.name}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("name", event.target.value)}
                    />
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("regulation.fields.type", { defaultValue: "نوع" })}</Label>
                    <Select
                        value={form.type}
                        disabled={readOnly || busy}
                        onChange={(event) => handleChange("type", event.target.value as RegulationType)}
                    >
                        <Option value="law">{t("regulation.type.law", { defaultValue: "قانون" })}</Option>
                        <Option value="regulation">{t("regulation.type.regulation", { defaultValue: "مقرره" })}</Option>
                        <Option value="directive">{t("regulation.type.directive", { defaultValue: "دستورالعمل" })}</Option>
                        <Option value="circular">{t("regulation.type.circular", { defaultValue: "بخشنامه" })}</Option>
                        <Option value="procedure">{t("regulation.type.procedure", { defaultValue: "رویه" })}</Option>
                        <Option value="instruction">{t("regulation.type.instruction", { defaultValue: "آیین‌نامه" })}</Option>
                        <Option value="policy">{t("regulation.type.policy", { defaultValue: "سیاست" })}</Option>
                        <Option value="other">{t("regulation.type.other", { defaultValue: "سایر" })}</Option>
                    </Select>
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("regulation.fields.status", { defaultValue: "وضعیت" })}</Label>
                    <Select
                        value={form.status}
                        disabled={readOnly || busy}
                        onChange={(event) => handleChange("status", event.target.value as RegulationStatus)}
                    >
                        <Option value="active">{t("common.active", { defaultValue: "فعال" })}</Option>
                        <Option value="inactive">{t("common.inactive", { defaultValue: "غیرفعال" })}</Option>
                    </Select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                    <ParentPickerField
                        label={t("regulation.fields.parent", { defaultValue: "والد" })}
                        value={selectedParentName}
                        disabled={readOnly || busy}
                        onOpen={() => setParentDialogOpen(true)}
                    />
                </div>

                <div
                    style={{
                        display: "grid",
                        gap: "1rem",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gridColumn: "1 / -1",
                    }}
                >
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                        <Label>{t("regulation.fields.validFrom", { defaultValue: "از تاریخ" })}</Label>
                        <DatePicker
                            value={form.validFrom}
                            disabled={readOnly || busy}
                            onInput={(event) => handleChange("validFrom", event.target.value)}
                        />
                    </div>

                    <div style={{ display: "grid", gap: "0.5rem" }}>
                        <Label>{t("regulation.fields.validTo", { defaultValue: "تا تاریخ" })}</Label>
                        <DatePicker
                            value={form.validTo}
                            disabled={readOnly || busy}
                            onInput={(event) => handleChange("validTo", event.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: "grid", gap: "0.5rem", gridColumn: "1 / -1" }}>
                    <Label>{t("regulation.fields.description", { defaultValue: "توضیحات" })}</Label>
                    <TextArea
                        rows={6}
                        value={form.description}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("description", event.target.value)}
                    />
                </div>
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