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
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
    OrganizationStatus,
    OrganizationType,
} from "@/features/organization";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";
import ParentPickerField from "@/shared/components/ParentPickerField";

export type OrganizationObjectMode = "create" | "edit" | "view";

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

    const [form, setForm] = useState<OrganizationFormState>(() =>
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
        <div style={{ display: "grid", gap: "1rem" }}>
            <Bar
                startContent={
                    <Title level="H4">
                        {mode === "create"
                            ? t("organization.object.createTitle", {
                                defaultValue: "ایجاد واحد سازمانی",
                            })
                            : mode === "edit"
                                ? t("organization.object.editTitle", {
                                    defaultValue: "ویرایش واحد سازمانی",
                                })
                                : t("organization.object.viewTitle", {
                                    defaultValue: "جزئیات واحد سازمانی",
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
                    <Label>{t("organization.fields.code", { defaultValue: "کد" })}</Label>
                    <Input
                        value={form.code}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("code", event.target.value)}
                    />
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("organization.fields.name", { defaultValue: "نام" })}</Label>
                    <Input
                        value={form.name}
                        disabled={readOnly || busy}
                        onInput={(event) => handleChange("name", event.target.value)}
                    />
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("organization.fields.type", { defaultValue: "نوع" })}</Label>
                    <Select
                        value={form.type}
                        disabled={readOnly || busy}
                        onChange={(event) => handleChange("type", event.target.value as OrganizationType)}
                    >
                        <Option value="company">{t("organization.type.company", { defaultValue: "شرکت" })}</Option>
                        <Option value="holding">{t("organization.type.holding", { defaultValue: "هلدینگ" })}</Option>
                        <Option value="department">{t("organization.type.department", { defaultValue: "دپارتمان" })}</Option>
                        <Option value="management">{t("organization.type.management", { defaultValue: "مدیریت" })}</Option>
                        <Option value="branch">{t("organization.type.branch", { defaultValue: "شعبه" })}</Option>
                        <Option value="unit">{t("organization.type.unit", { defaultValue: "واحد" })}</Option>
                        <Option value="other">{t("organization.type.other", { defaultValue: "سایر" })}</Option>
                    </Select>
                </div>

                <div style={{ display: "grid", gap: "0.5rem" }}>
                    <Label>{t("organization.fields.status", { defaultValue: "وضعیت" })}</Label>
                    <Select
                        value={form.status}
                        disabled={readOnly || busy}
                        onChange={(event) => handleChange("status", event.target.value as OrganizationStatus)}
                    >
                        <Option value="active">{t("common.active", { defaultValue: "فعال" })}</Option>
                        <Option value="inactive">{t("common.inactive", { defaultValue: "غیرفعال" })}</Option>
                    </Select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                    <ParentPickerField
                        label={t("organization.fields.parent", { defaultValue: "والد" })}
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
                        <Label>{t("organization.fields.validFrom", { defaultValue: "از تاریخ" })}</Label>
                        <DatePicker
                            value={form.validFrom}
                            disabled={readOnly || busy}
                            onInput={(event) => handleChange("validFrom", event.target.value)}
                        />
                    </div>

                    <div style={{ display: "grid", gap: "0.5rem" }}>
                        <Label>{t("organization.fields.validTo", { defaultValue: "تا تاریخ" })}</Label>
                        <DatePicker
                            value={form.validTo}
                            disabled={readOnly || busy}
                            onInput={(event) => handleChange("validTo", event.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: "grid", gap: "0.5rem", gridColumn: "1 / -1" }}>
                    <Label>{t("organization.fields.description", { defaultValue: "توضیحات" })}</Label>
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