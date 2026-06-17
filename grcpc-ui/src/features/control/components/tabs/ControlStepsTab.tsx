import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    Dialog,
    Input,
    MessageStrip,
    TextArea,
} from "@ui5/webcomponents-react";

import type {
    ControlStep,
    CreateControlStepRequest,
} from "../../domain/control.model";
import { controlService } from "../../service/control.service";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import {
    ControlFormField,
    ControlTabShell,
    ControlTable,
    DeleteButton,
    RowActions,
} from "./ControlTabPrimitives";
import {
    displayText,
    mapControlTabError,
    normalizeOptionalText,
    parseNonNegativeInteger,
    readInputValue,
} from "./ControlTabUtils";

interface ControlStepFormState {
    title: string;
    description: string;
    requiredDocument: string;
    requiredNote: string;
    sensitivity: string;
    sortOrder: string;
}

export interface ControlStepsTabProps {
    controlAssignmentId: string;
    readOnly?: boolean;
    showActions?: boolean;
}

const EMPTY_FORM: ControlStepFormState = {
    title: "",
    description: "",
    requiredDocument: "",
    requiredNote: "",
    sensitivity: "",
    sortOrder: "",
};

const FORM_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "1rem",
};

function toFormState(step: ControlStep | null): ControlStepFormState {
    return {
        title: step?.title ?? "",
        description: step?.description ?? "",
        requiredDocument: step?.requiredDocument ?? "",
        requiredNote: step?.requiredNote ?? "",
        sensitivity: step?.sensitivity ?? "",
        sortOrder: step?.sortOrder?.toString() ?? "",
    };
}

function toPayload(form: ControlStepFormState): CreateControlStepRequest {
    return {
        title: form.title.trim(),
        description: normalizeOptionalText(form.description),
        requiredDocument: normalizeOptionalText(form.requiredDocument),
        requiredNote: normalizeOptionalText(form.requiredNote),
        sensitivity: normalizeOptionalText(form.sensitivity),
        sortOrder: parseNonNegativeInteger(form.sortOrder),
    };
}

export default function ControlStepsTab({
    controlAssignmentId,
    readOnly = false,
    showActions = true,
}: ControlStepsTabProps) {
    const { t } = useTranslation();
    const [items, setItems] = useState<ControlStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ControlStep | null>(null);
    const [form, setForm] = useState<ControlStepFormState>(EMPTY_FORM);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        setItems([]);

        void controlService
            .listSteps(controlAssignmentId)
            .then((loadedItems) => {
                if (active) {
                    setItems(loadedItems);
                }
            })
            .catch((loadError: unknown) => {
                if (active) {
                    setError(
                        mapControlTabError(
                            loadError,
                            t("control.steps.loadError", {
                                defaultValue: "خطا در بارگذاری مراحل کنترل.",
                            }),
                        ),
                    );
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [controlAssignmentId, t]);

    const reload = async () => {
        setLoading(true);
        try {
            setItems(await controlService.listSteps(controlAssignmentId));
            setError(null);
        } catch (loadError) {
            setError(
                mapControlTabError(
                    loadError,
                    t("control.steps.loadError", {
                        defaultValue: "خطا در بارگذاری مراحل کنترل.",
                    }),
                ),
            );
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setForm(EMPTY_FORM);
        setValidationError(null);
        setDialogOpen(true);
    };

    const openEditDialog = (item: ControlStep) => {
        setEditingItem(item);
        setForm(toFormState(item));
        setValidationError(null);
        setDialogOpen(true);
    };

    const handleChange = <K extends keyof ControlStepFormState>(
        key: K,
        value: ControlStepFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const validate = (): boolean => {
        if (!form.title.trim()) {
            setValidationError(
                t("control.validation.stepTitleRequired", {
                    defaultValue: "Step title is required.",
                }),
            );
            return false;
        }

        if (form.sortOrder.trim() && parseNonNegativeInteger(form.sortOrder) === undefined) {
            setValidationError(
                t("control.validation.sortOrderInvalid", {
                    defaultValue: "Sort order must be a non-negative integer.",
                }),
            );
            return false;
        }

        setValidationError(null);
        return true;
    };

    const handleSave = async () => {
        if (!validate()) {
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const payload = toPayload(form);

            if (editingItem) {
                await controlService.updateStep(controlAssignmentId, editingItem.id, payload);
            } else {
                await controlService.createStep(controlAssignmentId, payload);
            }

            setDialogOpen(false);
            await reload();
        } catch (saveError) {
            setError(
                mapControlTabError(
                    saveError,
                    t("control.errors.saveStep", {
                        defaultValue: "Failed to save control step.",
                    }),
                ),
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (stepId: string) => {
        try {
            setSaving(true);
            setError(null);
            await controlService.deleteStep(controlAssignmentId, stepId);
            await reload();
        } catch (deleteError) {
            setError(
                mapControlTabError(
                    deleteError,
                    t("control.errors.deleteStep", {
                        defaultValue: "Failed to delete control step.",
                    }),
                ),
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <ControlTabShell
                title={t("control.steps.title", { defaultValue: "مراحل" })}
                loading={loading}
                error={error}
                onErrorClose={() => setError(null)}
                hideErrorCloseButton={!showActions}
                empty={!items.length}
                action={
                    showActions && !readOnly ? (
                    <Button design="Emphasized" disabled={loading || saving} onClick={openCreateDialog}>
                        {t("control.actions.addStep", { defaultValue: "Add Step" })}
                    </Button>
                    ) : null
                }
            >
                {!items.length ? (
                    t("control.empty.steps", { defaultValue: "No steps have been defined." })
                ) : (
                    <ControlTable
                        items={items}
                        accessibleName={t("control.steps.tableAccessibleName", {
                            defaultValue: "جدول مراحل کنترل",
                        })}
                        columns={[
                            {
                                key: "title",
                                label: t("control.steps.columns.title", { defaultValue: "عنوان" }),
                                render: (item) => displayText(item.title),
                            },
                            {
                                key: "description",
                                label: t("control.steps.columns.description", {
                                    defaultValue: "شرح",
                                }),
                                render: (item) => displayText(item.description),
                            },
                            {
                                key: "requiredDocument",
                                label: t("control.steps.columns.requiredDocument", {
                                    defaultValue: "مستند الزامی",
                                }),
                                render: (item) => displayText(item.requiredDocument),
                            },
                            {
                                key: "requiredNote",
                                label: t("control.steps.columns.requiredNote", {
                                    defaultValue: "یادداشت الزامی",
                                }),
                                render: (item) => displayText(item.requiredNote),
                            },
                            {
                                key: "sensitivity",
                                label: t("control.steps.columns.sensitivity", {
                                    defaultValue: "حساسیت",
                                }),
                                render: (item) => displayText(item.sensitivity),
                            },
                            {
                                key: "sortOrder",
                                label: t("control.steps.columns.sortOrder", {
                                    defaultValue: "ترتیب نمایش",
                                }),
                                render: (item) => displayText(item.sortOrder),
                            },
                            ...(showActions
                                ? [
                                      {
                                          key: "actions",
                                          label: t("common.actions", { defaultValue: "Actions" }),
                                          width: "10rem",
                                          render: (item: ControlStep) => (
                                              <RowActions>
                                                  <Button
                                                      design="Transparent"
                                                      disabled={saving}
                                                      onClick={() => openEditDialog(item)}
                                                  >
                                                      {t("common.edit", { defaultValue: "Edit" })}
                                                  </Button>
                                                  {!readOnly ? (
                                                      <DeleteButton
                                                          disabled={saving}
                                                          onClick={() => {
                                                              void handleDelete(item.id);
                                                          }}
                                                      >
                                                          {t("common.delete", { defaultValue: "Delete" })}
                                                      </DeleteButton>
                                                  ) : null}
                                              </RowActions>
                                          ),
                                      },
                                  ]
                                : []),
                        ]}
                    />
                )}
            </ControlTabShell>

            {showActions ? (
                <Dialog
                open={dialogOpen}
                accessibleName={
                    editingItem
                        ? t("control.steps.editTitle", { defaultValue: "Edit Step" })
                        : t("control.steps.createTitle", { defaultValue: "Add Step" })
                }
                style={{ width: "90vw", maxWidth: "90vw" }}
                onClose={() => setDialogOpen(false)}
                footer={
                    <>
                        <Button
                            design="Emphasized"
                            disabled={saving}
                            onClick={() => {
                                void handleSave();
                            }}
                        >
                            {t("common.save", { defaultValue: "Save" })}
                        </Button>
                        <Button design="Transparent" disabled={saving} onClick={() => setDialogOpen(false)}>
                            {t("common.cancel", { defaultValue: "Cancel" })}
                        </Button>
                    </>
                }
                >
                <ModalDialogHeader
                    title={
                        editingItem
                            ? t("control.steps.editTitle", { defaultValue: "Edit Step" })
                            : t("control.steps.createTitle", { defaultValue: "Add Step" })
                    }
                    onClose={() => setDialogOpen(false)}
                />

                <div style={{ display: "grid", gap: "1rem", padding: "0.25rem" }}>
                    {validationError ? (
                        <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
                            {validationError}
                        </MessageStrip>
                    ) : null}

                    <div style={FORM_GRID_STYLE}>
                        <ControlFormField
                            label={t("control.fields.title", { defaultValue: "Title" })}
                            required
                        >
                            <Input
                                value={form.title}
                                disabled={saving}
                                onInput={(event) => handleChange("title", readInputValue(event))}
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.sortOrder", { defaultValue: "Sort Order" })}
                        >
                            <Input
                                value={form.sortOrder}
                                disabled={saving}
                                onInput={(event) => handleChange("sortOrder", readInputValue(event))}
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.requiredDocument", {
                                defaultValue: "Required Document",
                            })}
                        >
                            <Input
                                value={form.requiredDocument}
                                disabled={saving}
                                onInput={(event) =>
                                    handleChange("requiredDocument", readInputValue(event))
                                }
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.sensitivity", { defaultValue: "Sensitivity" })}
                        >
                            <Input
                                value={form.sensitivity}
                                disabled={saving}
                                onInput={(event) => handleChange("sensitivity", readInputValue(event))}
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.requiredNote", { defaultValue: "Required Note" })}
                            fullWidth
                        >
                            <TextArea
                                rows={3}
                                value={form.requiredNote}
                                disabled={saving}
                                onInput={(event) => handleChange("requiredNote", readInputValue(event))}
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.description", { defaultValue: "Description" })}
                            fullWidth
                        >
                            <TextArea
                                rows={4}
                                value={form.description}
                                disabled={saving}
                                onInput={(event) => handleChange("description", readInputValue(event))}
                            />
                        </ControlFormField>
                    </div>
                </div>
                </Dialog>
            ) : null}
        </>
    );
}
