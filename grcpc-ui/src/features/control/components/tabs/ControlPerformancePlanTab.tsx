import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    DatePicker,
    Dialog,
    Input,
    MessageStrip,
    TextArea,
} from "@ui5/webcomponents-react";

import type {
    ControlPerformancePlan,
    CreateControlPerformancePlanRequest,
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
    displayDate,
    displayText,
    mapControlTabError,
    normalizeOptionalText,
    readDatePickerValue,
    readInputValue,
} from "./ControlTabUtils";

interface ControlPerformancePlanFormState {
    title: string;
    description: string;
    frequency: string;
    ownerName: string;
    plannedDate: string;
    status: string;
}

export interface ControlPerformancePlanTabProps {
    controlAssignmentId: string;
    readOnly?: boolean;
    showActions?: boolean;
}

const EMPTY_FORM: ControlPerformancePlanFormState = {
    title: "",
    description: "",
    frequency: "",
    ownerName: "",
    plannedDate: "",
    status: "",
};

const FORM_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "1rem",
};

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "d MMMM y";

function toFormState(plan: ControlPerformancePlan | null): ControlPerformancePlanFormState {
    return {
        title: plan?.title ?? "",
        description: plan?.description ?? "",
        frequency: plan?.frequency ?? "",
        ownerName: plan?.ownerName ?? "",
        plannedDate: plan?.plannedDate ?? "",
        status: plan?.status ?? "",
    };
}

function toPayload(form: ControlPerformancePlanFormState): CreateControlPerformancePlanRequest {
    return {
        title: form.title.trim(),
        description: normalizeOptionalText(form.description),
        frequency: normalizeOptionalText(form.frequency),
        ownerName: normalizeOptionalText(form.ownerName),
        plannedDate: normalizeOptionalText(form.plannedDate),
        status: normalizeOptionalText(form.status),
    };
}

export default function ControlPerformancePlanTab({
    controlAssignmentId,
    readOnly = false,
    showActions = true,
}: ControlPerformancePlanTabProps) {
    const { t } = useTranslation();
    const [items, setItems] = useState<ControlPerformancePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ControlPerformancePlan | null>(null);
    const [form, setForm] = useState<ControlPerformancePlanFormState>(EMPTY_FORM);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        setItems([]);

        void controlService
            .listPerformancePlans(controlAssignmentId)
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
                            t("control.performancePlans.loadError", {
                                defaultValue: "خطا در بارگذاری برنامه‌های عملکرد.",
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
            setItems(await controlService.listPerformancePlans(controlAssignmentId));
            setError(null);
        } catch (loadError) {
            setError(
                mapControlTabError(
                    loadError,
                    t("control.performancePlans.loadError", {
                        defaultValue: "خطا در بارگذاری برنامه‌های عملکرد.",
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

    const openEditDialog = (item: ControlPerformancePlan) => {
        setEditingItem(item);
        setForm(toFormState(item));
        setValidationError(null);
        setDialogOpen(true);
    };

    const handleChange = <K extends keyof ControlPerformancePlanFormState>(
        key: K,
        value: ControlPerformancePlanFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const validate = (): boolean => {
        if (!form.title.trim()) {
            setValidationError(
                t("control.validation.performancePlanTitleRequired", {
                    defaultValue: "Performance plan title is required.",
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
                await controlService.updatePerformancePlan(
                    controlAssignmentId,
                    editingItem.id,
                    payload,
                );
            } else {
                await controlService.createPerformancePlan(controlAssignmentId, payload);
            }

            setDialogOpen(false);
            await reload();
        } catch (saveError) {
            setError(
                mapControlTabError(
                    saveError,
                    t("control.errors.savePerformancePlan", {
                        defaultValue: "Failed to save performance plan.",
                    }),
                ),
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (planId: string) => {
        try {
            setSaving(true);
            setError(null);
            await controlService.deletePerformancePlan(controlAssignmentId, planId);
            await reload();
        } catch (deleteError) {
            setError(
                mapControlTabError(
                    deleteError,
                    t("control.errors.deletePerformancePlan", {
                        defaultValue: "Failed to delete performance plan.",
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
                title={t("control.performancePlans.title", { defaultValue: "برنامه عملکرد" })}
                loading={loading}
                error={error}
                onErrorClose={() => setError(null)}
                hideErrorCloseButton={!showActions}
                empty={!items.length}
                action={
                    showActions && !readOnly ? (
                        <Button design="Emphasized" disabled={loading || saving} onClick={openCreateDialog}>
                            {t("control.actions.addPerformancePlan", {
                                defaultValue: "Add Performance Plan",
                            })}
                        </Button>
                    ) : null
                }
            >
                {!items.length ? (
                    t("control.empty.performancePlans", {
                        defaultValue: "No performance plans have been defined.",
                    })
                ) : (
                    <ControlTable
                        items={items}
                        accessibleName={t("control.performancePlans.tableAccessibleName", {
                            defaultValue: "جدول برنامه‌های عملکرد کنترل",
                        })}
                        columns={[
                            {
                                key: "title",
                                label: t("control.performancePlans.columns.title", {
                                    defaultValue: "عنوان",
                                }),
                                render: (item) => displayText(item.title),
                            },
                            {
                                key: "description",
                                label: t("control.performancePlans.columns.description", {
                                    defaultValue: "شرح",
                                }),
                                render: (item) => displayText(item.description),
                            },
                            {
                                key: "frequency",
                                label: t("control.performancePlans.columns.frequency", {
                                    defaultValue: "تناوب",
                                }),
                                render: (item) => displayText(item.frequency),
                            },
                            {
                                key: "ownerName",
                                label: t("control.performancePlans.columns.ownerName", {
                                    defaultValue: "مسئول",
                                }),
                                render: (item) => displayText(item.ownerName),
                            },
                            {
                                key: "plannedDate",
                                label: t("control.performancePlans.columns.plannedDate", {
                                    defaultValue: "تاریخ برنامه‌ریزی",
                                }),
                                render: (item) => displayDate(item.plannedDate),
                            },
                            {
                                key: "status",
                                label: t("control.performancePlans.columns.status", {
                                    defaultValue: "وضعیت",
                                }),
                                render: (item) => displayText(item.status),
                            },
                            ...(showActions
                                ? [
                                      {
                                          key: "actions",
                                          label: t("common.actions", { defaultValue: "Actions" }),
                                          width: "10rem",
                                          render: (item: ControlPerformancePlan) => (
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
                        ? t("control.performancePlan.editTitle", {
                              defaultValue: "Edit Performance Plan",
                          })
                        : t("control.performancePlan.createTitle", {
                              defaultValue: "Add Performance Plan",
                          })
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
                            ? t("control.performancePlan.editTitle", {
                                  defaultValue: "Edit Performance Plan",
                              })
                            : t("control.performancePlan.createTitle", {
                                  defaultValue: "Add Performance Plan",
                              })
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
                            label={t("control.fields.frequency", { defaultValue: "Frequency" })}
                        >
                            <Input
                                value={form.frequency}
                                disabled={saving}
                                onInput={(event) => handleChange("frequency", readInputValue(event))}
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.ownerName", { defaultValue: "Owner" })}
                        >
                            <Input
                                value={form.ownerName}
                                disabled={saving}
                                onInput={(event) => handleChange("ownerName", readInputValue(event))}
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.plannedDate", { defaultValue: "Planned Date" })}
                        >
                            <DatePicker
                                value={form.plannedDate}
                                valueFormat={DATE_VALUE_FORMAT}
                                formatPattern={DATE_DISPLAY_FORMAT}
                                disabled={saving}
                                onChange={(event) =>
                                    handleChange("plannedDate", readDatePickerValue(event))
                                }
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.status", { defaultValue: "Status" })}
                            fullWidth
                        >
                            <Input
                                value={form.status}
                                disabled={saving}
                                onInput={(event) => handleChange("status", readInputValue(event))}
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
