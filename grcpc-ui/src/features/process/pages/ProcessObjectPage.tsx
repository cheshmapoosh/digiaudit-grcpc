import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Bar,
    Button,
    Input,
    Label,
    MessageStrip,
    Option,
    Select,
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import type {
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
    ProcessStatus,
} from "@/features/process";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";
import ParentPickerField from "@/shared/components/ParentPickerField";

export type ProcessObjectMode = "create" | "edit" | "view";

interface ProcessFormState {
    code: string;
    title: string;
    description: string;
    parentId: string | null;
    ownerId: string | null;
    sortOrder: number;
    status: ProcessStatus;
}

export interface ProcessObjectPageProps {
    mode: ProcessObjectMode;
    allItems: ProcessNode[];
    value: ProcessNode | null;
    busy?: boolean;
    error?: string | null;
    onSubmit: (payload: ProcessNodeCreate | ProcessNodeUpdate) => Promise<void> | void;
    onCancel: () => void;
    onEdit?: () => void;
}

function toFormState(value: ProcessNode | null, defaultParentId: string | null): ProcessFormState {
    return {
        code: value?.code ?? "",
        title: value?.title ?? "",
        description: value?.description ?? "",
        parentId: value?.parentId ?? defaultParentId,
        ownerId: value?.ownerId ?? null,
        sortOrder: value?.sortOrder ?? 0,
        status: value?.status ?? "active",
    };
}

export default function ProcessObjectPage({
                                              mode,
                                              allItems,
                                              value,
                                              busy = false,
                                              error,
                                              onSubmit,
                                              onCancel,
                                              onEdit,
                                          }: ProcessObjectPageProps) {
    const { t } = useTranslation();

    const readOnly = mode === "view";
    const defaultParentId = value?.parentId ?? null;

    const [form, setForm] = useState<ProcessFormState>(() =>
        toFormState(value, defaultParentId),
    );
    const [validationError, setValidationError] = useState<string | null>(null);
    const [parentDialogOpen, setParentDialogOpen] = useState(false);

    const selectedParentTitle = useMemo(() => {
        if (!form.parentId) {
            return "";
        }

        return allItems.find((item) => item.id === form.parentId)?.title ?? "";
    }, [allItems, form.parentId]);

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
                t("process.validation.titleRequired", { defaultValue: "عنوان الزامی است" }),
            );
            return false;
        }

        if (form.sortOrder < 0) {
            setValidationError(
                t("process.validation.sortOrder", {
                    defaultValue: "ترتیب باید بزرگتر یا مساوی صفر باشد",
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

        const payload: ProcessNodeCreate | ProcessNodeUpdate = {
            code: form.code.trim(),
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            parentId: form.parentId,
            ownerId: form.ownerId,
            sortOrder: form.sortOrder,
            status: form.status,
        };

        await onSubmit(payload);
    };

    return (
        <div style={{ display: "grid", gap: "1rem" }}>
            <Bar
                startContent={
                    <Title level="H4">
                        {mode === "create"
                            ? t("process.object.createTitle", { defaultValue: "ایجاد فرآیند" })
                            : mode === "edit"
                                ? t("process.object.editTitle", { defaultValue: "ویرایش فرآیند" })
                                : t("process.object.viewTitle", { defaultValue: "جزئیات فرآیند" })}
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
                    <Label>{t("process.fields.code", { defaultValue: "کد" })}</Label>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", event.target.value)}
                    />
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("process.fields.title", { defaultValue: "عنوان" })}</Label>
                    <Input
                        value={form.title}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("title", event.target.value)}
                    />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                    <ParentPickerField
                        label={t("process.fields.parent", { defaultValue: "والد" })}
                        value={selectedParentTitle}
                        disabled={readOnly || busy}
                        onOpen={() => setParentDialogOpen(true)}
                    />
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("process.fields.ownerId", { defaultValue: "مالک" })}</Label>
                    <Input
                        value={form.ownerId ?? ""}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("ownerId", event.target.value || null)}
                    />
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("process.fields.sortOrder", { defaultValue: "ترتیب" })}</Label>
                    <Input
                        type="Number"
                        value={String(form.sortOrder)}
                        disabled={readOnly || busy}
                        onInput={(event) => {
                            const valueAsNumber = Number(event.target.value);
                            handleChange("sortOrder", Number.isNaN(valueAsNumber) ? 0 : valueAsNumber);
                        }}
                    />
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("process.fields.status", { defaultValue: "وضعیت" })}</Label>
                    <Select
                        disabled={readOnly || busy}
                        value={form.status}
                        onChange={(event) => handleChange("status", event.target.value as ProcessStatus)}
                    >
                        <Option value="active">{t("common.active", { defaultValue: "فعال" })}</Option>
                        <Option value="inactive">{t("common.inactive", { defaultValue: "غیرفعال" })}</Option>
                    </Select>
                </div>

                <div style={{ display: "grid", gap: "0.5rem", gridColumn: "1 / -1" }}>
                    <Label>{t("process.fields.description", { defaultValue: "توضیحات" })}</Label>
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